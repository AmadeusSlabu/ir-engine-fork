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

import {
  locationBanMethods,
  locationBanPath,
  LocationBanType
} from '@ir-engine/common/src/schemas/social/location-ban.schema'

import { Application } from '../../../declarations'
import logger from '../../ServerLogger'
import { LocationBanService } from './location-ban.class'
import locationBanDocs from './location-ban.docs'
import hooks from './location-ban.hooks'

declare module '@ir-engine/common/declarations' {
  interface ServiceTypes {
    [locationBanPath]: LocationBanService
  }
}

export default (app: Application): void => {
  const options = {
    name: locationBanPath,
    paginate: app.get('paginate'),
    Model: app.get('knexClient'),
    multi: true
  }

  app.use(locationBanPath, new LocationBanService(options), {
    // A list of all methods this service exposes externally
    methods: locationBanMethods,
    // You can add additional custom events to be sent to clients here
    events: [],
    docs: locationBanDocs
  })

  const service = app.service(locationBanPath)
  service.hooks(hooks)

  service.publish('created', async (data: LocationBanType) => {
    try {
      return Promise.all([app.channel(`userIds/${data.userId}`).send({ locationBan: data })])
    } catch (err) {
      logger.error(err)
    }
  })
}
