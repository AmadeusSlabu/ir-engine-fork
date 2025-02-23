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

// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve, virtual } from '@feathersjs/schema'
import { v4 as uuidv4 } from 'uuid'

import { ApiJobQuery, ApiJobType } from '@ir-engine/common/src/schemas/cluster/api-job.schema'
import { fromDateTimeSql, getDateTimeSql } from '@ir-engine/common/src/utils/datetime-sql'
import type { HookContext } from '@ir-engine/server-core/declarations'

export const apiJobResolver = resolve<ApiJobType, HookContext>({
  startTime: virtual(async (apiJob) => fromDateTimeSql(apiJob.startTime)),
  endTime: virtual(async (apiJob) => fromDateTimeSql(apiJob.endTime)),
  createdAt: virtual(async (apiJob) => fromDateTimeSql(apiJob.createdAt)),
  updatedAt: virtual(async (apiJob) => fromDateTimeSql(apiJob.updatedAt))
})

export const apiJobExternalResolver = resolve<ApiJobType, HookContext>({})

export const apiJobDataResolver = resolve<ApiJobType, HookContext>({
  id: async () => {
    return uuidv4()
  },
  createdAt: getDateTimeSql,
  updatedAt: getDateTimeSql
})

export const apiJobPatchResolver = resolve<ApiJobType, HookContext>({
  updatedAt: getDateTimeSql
})

export const apiJobQueryResolver = resolve<ApiJobQuery, HookContext>({})
