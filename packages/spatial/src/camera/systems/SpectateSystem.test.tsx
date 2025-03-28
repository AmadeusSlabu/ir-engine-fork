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

import assert from 'assert'
import { afterEach, beforeEach, describe, it } from 'vitest'

import {
  Engine,
  EntityUUID,
  UUIDComponent,
  UndefinedEntity,
  createEntity,
  destroyEngine,
  removeEntity,
  setComponent
} from '@ir-engine/ecs'
import { createEngine } from '@ir-engine/ecs/src/Engine'
import { UserID, applyIncomingActions, dispatchAction, getState } from '@ir-engine/hyperflux'
import { NetworkActions, NetworkState, NetworkTopics } from '@ir-engine/network'
import { createMockNetwork } from '@ir-engine/network/tests/createMockNetwork'
import { SpectateActions, SpectateEntityState } from './SpectateSystem'

describe('SpectateSystem', async () => {
  let viewerEntity = UndefinedEntity

  describe('SpectateEntityState', async () => {
    beforeEach(async () => {
      createEngine()
      Engine.instance.store.defaultDispatchDelay = () => 0
      viewerEntity = createEntity()
      setComponent(viewerEntity, UUIDComponent, UUIDComponent.generateUUID())
    })

    afterEach(() => {
      removeEntity(viewerEntity)
      return destroyEngine()
    })

    it('should start spectating an entity when the `spectateEntity` action is dispatched', async () => {
      createMockNetwork(NetworkTopics.world)

      const userID = 'user id' as UserID
      const peerID = Engine.instance.store.peerID

      const network = NetworkState.worldNetwork

      dispatchAction(
        NetworkActions.peerJoined({
          $network: network.id,
          peerID: peerID,
          peerIndex: 1,
          userID: userID
        })
      )

      dispatchAction(
        SpectateActions.spectateEntity({
          spectatorUserID: userID,
          spectatingEntity: 'entity' as EntityUUID,
          $topic: NetworkTopics.world,
          $peer: Engine.instance.store.peerID
        })
      )
      applyIncomingActions()

      const state = getState(SpectateEntityState)[userID]
      assert.equal(state.spectating, 'entity', 'The spectator is not spectating the correct userID')
    })

    it('should stop spectating an entity when the `exitSpectate` action is dispatched', async () => {
      createMockNetwork(NetworkTopics.world)

      const userID = 'user id' as UserID
      const peerID = Engine.instance.store.peerID

      const network = NetworkState.worldNetwork

      dispatchAction(
        NetworkActions.peerJoined({
          $network: network.id,
          peerID: peerID,
          peerIndex: 1,
          userID: userID
        })
      )

      dispatchAction(
        SpectateActions.spectateEntity({
          spectatorUserID: userID,
          spectatingEntity: 'entity' as EntityUUID,
          $topic: NetworkTopics.world,
          $peer: Engine.instance.store.peerID
        })
      )

      applyIncomingActions()
      const before = getState(SpectateEntityState)[userID]
      assert.notEqual(before, undefined, "The spectator's SpectateEntityState should not be undefined after `getState`")
      assert.equal(before.spectating, 'entity', 'The spectator is not spectating the correct userID')

      dispatchAction(
        SpectateActions.exitSpectate({
          spectatorUserID: userID,
          $topic: NetworkTopics.world,
          $peer: Engine.instance.store.peerID
        })
      )
      applyIncomingActions()
      const after = getState(SpectateEntityState)[userID]
      assert.equal(after, undefined, "The spectator's SpectateEntityState should be undefined after exitSpectate")
    })
  })
})
