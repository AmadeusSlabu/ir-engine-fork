/*
CPAL-1.0 License

The contents of this file are subject to the Common Public Attribution License
Version 1.0. (the "License"); you may not use this file except in compliance
with the License. You may obtain a copy of the License at
https://github.com/ir-engine/ir-engine/blob/dev/LICENSE.
The License is based on the Mozilla Public License Version 1.1, but Sections 14
and 15 have been added to cover use of software over a computer network and 
provide for limited attribution for the Original Developer. In addition, 
Exhibit A has been modified to be consistent with Exhibit B.

Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
specific language governing rights and limitations under the License.

The Original Code is Infinite Reality Engine.

The Original Developer is the Initial Developer. The Initial Developer of the
Original Code is the Infinite Reality Engine team.

All portions of the code written by the Infinite Reality Engine team are Copyright © 2021-2023 
Infinite Reality Engine. All Rights Reserved.
*/

import '../../patchEngineNode'

import nock from 'nock'
import { afterAll, afterEach, assert, beforeAll, describe, it } from 'vitest'

import {
  avatarPath,
  identityProviderPath,
  projectDestinationCheckPath,
  scopePath,
  ScopeType,
  userApiKeyPath,
  UserApiKeyType,
  UserName,
  userPath
} from '@ir-engine/common/src/schema.type.module'
import { destroyEngine } from '@ir-engine/ecs'

import { Application, HookContext } from '../../../declarations'
import { createFeathersKoaApp, tearDownAPI } from '../../createApp'
import { identityProviderDataResolver } from '../../user/identity-provider/identity-provider.resolvers'
import {
  getRepoManifestJson1,
  getRepoManifestJson2,
  getTestAuthenticatedUser,
  getTestUserRepos
} from '../../util/mockOctokitResponses'

describe('project-destination-check.test', () => {
  let app: Application
  let testUserApiKey: UserApiKeyType

  const getParams = () => ({
    provider: 'rest',
    headers: {
      authorization: `Bearer ${testUserApiKey.token}`
    }
  })

  beforeAll(async () => {
    app = await createFeathersKoaApp()
    await app.setup()

    const name = ('test-project-destination-check-user-name-' + Math.random().toString().slice(2, 12)) as UserName

    const avatar = await app.service(avatarPath).create({
      name: 'test-project-destination-check-avatar-name-' + Math.random().toString().slice(2, 12)
    })

    const testUser = await app.service(userPath).create({
      name,
      isGuest: false
    })
    await app.service(scopePath).create({ userId: testUser.id, type: 'projects:read' as ScopeType })

    testUserApiKey = await app.service(userApiKeyPath).create({ userId: testUser.id })

    await app.service(identityProviderPath)._create(
      await identityProviderDataResolver.resolve(
        {
          type: 'github',
          token: `test-token-${Math.round(Math.random() * 1000)}`,
          userId: testUser.id
        },
        {} as HookContext
      ),
      getParams()
    )
  })

  afterEach(() => nock.cleanAll())

  afterAll(async () => {
    await tearDownAPI()
    destroyEngine()
  })

  it('should check for accessible repo', async () => {
    nock('https://api.github.com')
      .get(/\/user.*/)
      .reply(200, getTestAuthenticatedUser('test-non-owner'))
      .get(/\/user.*\/repos.*/)
      .reply(200, [])

    const result = await app
      .service(projectDestinationCheckPath)
      .get('https://github.com/MyOrg/my-first-project', getParams())

    assert.ok(result)
    assert.ok(result.error)
  })

  it('should check for empty project repository', async () => {
    nock('https://api.github.com')
      .get(/\/user.*/)
      .reply(200, getTestAuthenticatedUser('MyOrg'))
      .get(/\/user.*\/repos.*/)
      .reply(200, getTestUserRepos())
      .get(/\/repos.*\/contents\/*/)
      .reply(404)
      .get(/\/repos.*\/contents\/*/)
      .reply(404)

    const result = await app
      .service(projectDestinationCheckPath)
      .get('https://github.com/MyOrg/my-first-project', getParams())

    assert.ok(result)
    assert.equal(result.destinationValid, true)
    assert.equal(result.repoEmpty, true)
  })

  it('should check if the destination project and existing project are same', async () => {
    nock('https://api.github.com')
      .get(/\/user.*/)
      .reply(200, getTestAuthenticatedUser('MyOrg'))
      .get(/\/user.*\/repos.*/)
      .reply(200, getTestUserRepos())
      .get(/\/repos.*\/contents\/*/)
      .reply(200, getRepoManifestJson1())
      .get(/\/repos.*\/contents\/*/)
      .reply(200, getRepoManifestJson2())

    const result = await app.service(projectDestinationCheckPath).get('https://github.com/MyOrg/my-first-project', {
      query: {
        inputProjectURL: 'https://github.com/MyOrg/ir-bot'
      },
      ...getParams()
    })

    assert.ok(result)
    assert.ok(result.error)
  })

  it('should check destination match', async () => {
    nock('https://api.github.com')
      .get(/\/user.*/)
      .reply(200, getTestAuthenticatedUser('MyOrg'))
      .get(/\/user.*\/repos.*/)
      .reply(200, getTestUserRepos())
      .get(/\/repos.*\/contents\/*/)
      .reply(200, getRepoManifestJson1())
      .get(/\/repos.*\/contents\/*/)
      .reply(200, getRepoManifestJson1())

    const result = await app.service(projectDestinationCheckPath).get('https://github.com/MyOrg/my-first-project', {
      query: {
        inputProjectURL: 'https://github.com/MyOrg/my-first-project'
      },
      ...getParams()
    })

    assert.ok(result)
    assert.equal(result.destinationValid, true)
  })
})
