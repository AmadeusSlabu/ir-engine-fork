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

import type { Knex } from 'knex'

import { clientSettingPath } from '@ir-engine/common/src/schemas/setting/client-setting.schema'

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex: Knex): Promise<void> {
  const oldTableName = 'clientSetting'

  const oldNamedTableExists = await knex.schema.hasTable(oldTableName)
  if (oldNamedTableExists) {
    await knex.schema.renameTable(oldTableName, clientSettingPath)

    const appleTouchIconColumnExists = await knex.schema.hasColumn(clientSettingPath, 'appleTouchIcon')
    if (!appleTouchIconColumnExists) {
      await knex.schema.alterTable(clientSettingPath, async (table) => {
        table.string('appleTouchIcon', 255).nullable()
      })
    }
  }

  const tableExists = await knex.schema.hasTable(clientSettingPath)

  if (tableExists === false) {
    await knex.schema.createTable(clientSettingPath, (table) => {
      //@ts-ignore
      table.uuid('id').collate('utf8mb4_bin').primary()
      table.string('logo', 255).nullable()
      table.string('title', 255).nullable()
      table.string('shortTitle', 255).nullable()
      table.string('url', 255).nullable()
      table.string('startPath', 255).notNullable()
      table.string('releaseName', 255).nullable()
      table.string('siteDescription', 255).nullable()
      table.string('appleTouchIcon', 255).nullable()
      table.string('favicon32px', 255).nullable()
      table.string('favicon16px', 255).nullable()
      table.string('icon192px', 255).nullable()
      table.string('icon512px', 255).nullable()
      table.string('webmanifestLink', 255).nullable()
      table.string('swScriptLink', 255).nullable()
      table.string('appBackground', 255).nullable()
      table.string('appTitle', 255).nullable()
      table.string('appSubtitle', 255).nullable()
      table.string('appDescription', 255).nullable()
      table.json('appSocialLinks').nullable()
      table.json('themeSettings').nullable()
      table.json('themeModes').nullable()
      table.string('key8thWall', 255).nullable()
      table.boolean('homepageLinkButtonEnabled').defaultTo(false)
      table.string('homepageLinkButtonRedirect', 255).nullable()
      table.string('homepageLinkButtonText', 255).nullable()
      table.dateTime('createdAt').notNullable()
      table.dateTime('updatedAt').notNullable()
    })
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex: Knex): Promise<void> {
  await knex.raw('SET FOREIGN_KEY_CHECKS=0')

  const tableExists = await knex.schema.hasTable(clientSettingPath)

  if (tableExists === true) {
    await knex.schema.dropTable(clientSettingPath)
  }

  await knex.raw('SET FOREIGN_KEY_CHECKS=1')
}
