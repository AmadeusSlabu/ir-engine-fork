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

import { AuthenticationRequest, AuthenticationResult } from '@feathersjs/authentication'
import { Paginated } from '@feathersjs/feathers'

import { apiJobPath } from '@ir-engine/common/src/schemas/cluster/api-job.schema'
import { githubRepoAccessRefreshPath } from '@ir-engine/common/src/schemas/user/github-repo-access-refresh.schema'
import { identityProviderPath } from '@ir-engine/common/src/schemas/user/identity-provider.schema'
import { userApiKeyPath, UserApiKeyType } from '@ir-engine/common/src/schemas/user/user-api-key.schema'
import { InviteCode, UserName, userPath } from '@ir-engine/common/src/schemas/user/user.schema'
import { getDateTimeSql } from '@ir-engine/common/src/utils/datetime-sql'

import { loginTokenPath } from '@ir-engine/common/src/schemas/user/login-token.schema'
import { toDateTimeSql } from '@ir-engine/common/src/utils/datetime-sql'
import moment from 'moment/moment'
import { Octokit } from 'octokit'
import { Application } from '../../../declarations'
import config from '../../appconfig'
import { createExecutorJob } from '../../k8s-job-helper'
import { RedirectConfig } from '../../types/OauthStrategies'
import getFreeInviteCode from '../../util/get-free-invite-code'
import makeInitialAdmin from '../../util/make-initial-admin'
import { getGithubRepoAccessRefreshJobBody } from '../github-repo-access-refresh/github-repo-access-refresh.class'
import CustomOAuthStrategy, { CustomOAuthParams } from './custom-oauth'

export class GithubStrategy extends CustomOAuthStrategy {
  constructor(app: Application) {
    super()
    this.app = app
  }

  async createRefreshJob(userId) {
    const date = await getDateTimeSql()
    const newJob = await this.app.service(apiJobPath).create({
      name: '',
      startTime: date,
      endTime: date,
      returnData: '',
      status: 'pending'
    })

    const jobBody = await getGithubRepoAccessRefreshJobBody(this.app, newJob.id, userId)
    await this.app.service(apiJobPath).patch(newJob.id, {
      name: jobBody.metadata!.name
    })
    const jobLabelSelector = `ir-engine/userId=${userId},ir-engine/release=${process.env.RELEASE_NAME},ir-engine/autoUpdate=false`
    await createExecutorJob(this.app, jobBody, jobLabelSelector, 1000, newJob.id, false)
  }

  async getEntityData(profile: any, entity: any, params: CustomOAuthParams): Promise<any> {
    const baseData = await super.getEntityData(profile, null, {})
    const authResult = entity
      ? entity
      : await (this.app.service('authentication') as any).strategies.jwt.authenticate(
          { accessToken: params?.authentication?.accessToken },
          {}
        )
    const identityProvider = authResult[identityProviderPath] ? authResult[identityProviderPath] : authResult
    const userId = identityProvider ? identityProvider.userId : params?.query ? params.query.userId : undefined

    let email: string

    if (profile.email) {
      email = profile.email
    } else {
      const octoKit = new Octokit({ auth: `token ${params.access_token}` })
      const githubEmails = await octoKit.rest.users.listEmailsForAuthenticatedUser()

      email = githubEmails.data.filter((githubEmail: any) => githubEmail.primary === true)[0].email
    }

    return {
      ...baseData,
      accountIdentifier: profile.login,
      oauthToken: params.access_token,
      oauthRefreshToken: params.refresh_token,
      email,
      type: 'github',
      userId
    }
  }

  async updateEntity(entity: any, profile: any, params: CustomOAuthParams): Promise<any> {
    const authResult = await (this.app.service('authentication') as any).strategies.jwt.authenticate(
      { accessToken: params?.authentication?.accessToken },
      {}
    )
    if (entity.type === 'github') {
      if (!entity.userId) {
        const code = (await getFreeInviteCode(this.app)) as InviteCode
        const newUser = await this.app.service(userPath).create({
          name: '' as UserName,
          isGuest: false,
          inviteCode: code
        })
        entity.userId = newUser.id
        await this.app.service(identityProviderPath)._patch(entity.id, {
          userId: newUser.id,
          oauthToken: params.access_token,
          oauthRefreshToken: params.refresh_token,
          email: entity.email
        })
      } else
        await this.app.service(identityProviderPath)._patch(entity.id, {
          oauthToken: params.access_token,
          oauthRefreshToken: params.refresh_token,
          email: entity.email
        })
    }
    const identityProvider = authResult[identityProviderPath]
    const user = await this.app.service(userPath).get(entity.userId)
    await makeInitialAdmin(this.app, user.id)
    if (user.isGuest)
      await this.app.service(userPath).patch(entity.userId, {
        isGuest: false
      })
    const apiKey = (await this.app.service(userApiKeyPath).find({
      query: {
        userId: entity.userId
      }
    })) as Paginated<UserApiKeyType>
    if (apiKey.total === 0)
      await this.app.service(userApiKeyPath).create({
        userId: entity.userId
      })
    if (entity.type !== 'guest' && identityProvider.type === 'guest') {
      await this.app.service(identityProviderPath)._remove(identityProvider.id)
      await this.app.service(userPath).remove(identityProvider.userId)
      if (!config.kubernetes.enabled)
        await this.app.service(githubRepoAccessRefreshPath).find(Object.assign({}, params, { user }))
      else await this.createRefreshJob(user.id)
      await this.userLoginEntry(entity, params)

      return super.updateEntity(entity, profile, params)
    }
    const existingEntity = await super.findEntity(profile, params)
    if (!existingEntity) {
      profile.userId = user.id
      profile.oauthToken = params.access_token
      profile.oauthRefreshToken = params.refresh_token
      const newIP = await super.createEntity(profile, params)
      if (entity.type === 'guest') {
        const profileEmail = profile.email
        const existingIdentityProviders = await this.app.service(identityProviderPath).find({
          query: {
            $or: [
              {
                email: profileEmail
              },
              {
                token: profileEmail
              }
            ],
            id: {
              $ne: newIP.id
            }
          }
        })
        if (existingIdentityProviders.total > 0) {
          const loginToken = await this.app.service(loginTokenPath).create({
            identityProviderId: newIP.id,
            associateUserId: existingIdentityProviders.data[0].userId,
            expiresAt: toDateTimeSql(moment().utc().add(10, 'minutes').toDate())
          })
          return {
            ...entity,
            associateEmail: profileEmail,
            loginId: loginToken.id,
            loginToken: loginToken.token,
            promptForConnection: true
          }
        }
        await this.app.service(identityProviderPath).remove(entity.id)
      }
      if (!config.kubernetes.enabled)
        await this.app.service(githubRepoAccessRefreshPath).find(Object.assign({}, params, { user }))
      else await this.createRefreshJob(user.id)
      await this.userLoginEntry(newIP, params)
      return newIP
    } else if (existingEntity.userId === identityProvider.userId) {
      if (!config.kubernetes.enabled)
        await this.app.service(githubRepoAccessRefreshPath).find(Object.assign({}, params, { user }))
      else await this.createRefreshJob(user.id)
      await this.userLoginEntry(existingEntity, params)
      return existingEntity
    } else {
      throw new Error('Another user is linked to this account')
    }
  }

  async getRedirect(data: AuthenticationResult | Error, params: CustomOAuthParams): Promise<string> {
    let redirectConfig: RedirectConfig
    try {
      redirectConfig = JSON.parse(params.redirect!)
    } catch {
      redirectConfig = {}
    }
    let { domain: redirectDomain, path: redirectPath, instanceId: redirectInstanceId } = redirectConfig
    redirectDomain = redirectDomain ? `${redirectDomain}/auth/oauth/github` : config.authentication.callback.github

    if (data instanceof Error || Object.getPrototypeOf(data) === Error.prototype) {
      return this.handleErrorRedirect(data, params, redirectConfig, redirectDomain)
    }

    if (data[identityProviderPath]?.promptForConnection) {
      let redirectUrl = `${redirectDomain}?promptForConnection=true&associateEmail=${data[identityProviderPath].associateEmail}&loginToken=${data[identityProviderPath].loginToken}&loginId=${data[identityProviderPath].loginId}`
      if (redirectPath) {
        redirectUrl = redirectUrl.concat(`&path=${redirectPath}`)
      }
      if (redirectInstanceId) {
        redirectUrl = redirectUrl.concat(`&instanceId=${redirectInstanceId}`)
      }

      return redirectUrl
    } else {
      const loginType = params.query?.userId ? 'connection' : 'login'
      let redirectUrl = `${redirectDomain}?token=${(data as AuthenticationResult).accessToken}&type=${loginType}`
      if (redirectPath) {
        redirectUrl = redirectUrl.concat(`&path=${redirectPath}`)
      }
      if (redirectInstanceId) {
        redirectUrl = redirectUrl.concat(`&instanceId=${redirectInstanceId}`)
      }

      return redirectUrl
    }
  }

  async authenticate(authentication: AuthenticationRequest, originalParams: CustomOAuthParams) {
    if (authentication.error) {
      if (authentication.error.message === 'Bad credentials')
        throw new Error('You canceled the GitHub OAuth login flow')
      else throw new Error('There was a problem with the GitHub OAuth login flow: ' + authentication.error_description)
    }
    await this.validateSignInUser(authentication, originalParams, 'github')
    originalParams.access_token = authentication.access_token
    originalParams.refresh_token = authentication.refresh_token
    const entity: string = this.configuration.entity
    const { provider, ...params } = originalParams
    const profile = await super.getProfile(authentication, params)
    const existingEntity = (await super.findEntity(profile, params)) || (await super.getCurrentEntity(params))

    const authEntity = !existingEntity
      ? await this.createEntity(profile, params)
      : await this.updateEntity(existingEntity, profile, params)

    const fetchedEntity = await super.getEntity(authEntity, originalParams)
    if (authEntity.promptForConnection) {
      fetchedEntity.promptForConnection = authEntity.promptForConnection
      fetchedEntity.associateEmail = authEntity.associateEmail
      fetchedEntity.loginId = authEntity.loginId
      fetchedEntity.loginToken = authEntity.loginToken
    }

    return {
      authentication: { strategy: this.name! },
      [entity]: fetchedEntity
    }
  }
}
export default GithubStrategy
