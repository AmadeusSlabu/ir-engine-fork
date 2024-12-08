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

import { Knex } from 'knex'

import {
  analyticsPath,
  channelPath,
  ChannelType,
  instanceAttendancePath,
  instancePath,
  userPath
} from '@ir-engine/common/src/schema.type.module'
import config from '@ir-engine/server-core/src/appconfig'
import multiLogger from '@ir-engine/server-core/src/ServerLogger'

const logger = multiLogger.child({ component: 'taskserver:collect-analytics' })

const DEFAULT_INTERVAL_SECONDS = 1800
const configInterval = parseInt(config['task-server'].processInterval)
const interval = (configInterval || DEFAULT_INTERVAL_SECONDS) * 1000

export default (app): void => {
  setInterval(async () => {
    logger.info('Collecting analytics at %s.', new Date().toString())
    const activeLocations: any[] = []
    const activeScenes: any[] = []
    const activeChannels = (await app.service(channelPath).find({
      paginate: false,
      isInternal: true
    })) as ChannelType[]

    const knexClient: Knex = app.get('knexClient')

    const instanceUsers = await knexClient
      .from(userPath)
      .join(instanceAttendancePath, `${instanceAttendancePath}.userId`, `${userPath}.id`)
      .where(`${instanceAttendancePath}.ended`, false)
      .andWhere(`${instanceAttendancePath}.isChannel`, false)
      .select()
      .options({ nestTables: true })

    const channelUsers = await knexClient
      .from(userPath)
      .join(instanceAttendancePath, `${instanceAttendancePath}.userId`, `${userPath}.id`)
      .where(`${instanceAttendancePath}.ended`, false)
      .andWhere(`${instanceAttendancePath}.isChannel`, true)
      .select()
      .options({ nestTables: true })

    const activeInstances = await app.service(instancePath).find({
      query: {
        ended: {
          $ne: 1
        }
      },
      isInternal: true
    })

    for (const instance of activeInstances.data) {
      if (instance.location) {
        if (activeLocations.indexOf(instance.location.id) < 0) activeLocations.push(instance.location.id)
        if (activeScenes.indexOf(instance.location.sceneId) < 0) activeScenes.push(instance.location.sceneId)
      }
    }

    await Promise.all([
      app.service(analyticsPath).create({
        type: 'activeChannels',
        count: activeChannels.length
      }),
      app.service(analyticsPath).create({
        type: 'instanceUsers',
        count: instanceUsers.length
      }),
      app.service(analyticsPath).create({
        type: 'channelUsers',
        count: channelUsers.length
      }),
      app.service(analyticsPath).create({
        type: 'activeLocations',
        count: activeLocations.length
      }),
      app.service(analyticsPath).create({
        type: 'activeScenes',
        count: activeScenes.length
      }),
      app.service(analyticsPath).create({
        type: 'activeInstances',
        count: activeInstances.total
      })
    ])
  }, interval)
}
