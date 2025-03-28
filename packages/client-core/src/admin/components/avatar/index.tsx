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

import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { HiMagnifyingGlass, HiPlus } from 'react-icons/hi2'

import { PopoverState } from '@ir-engine/client-core/src/common/services/PopoverState'
import { useHookstate } from '@ir-engine/hyperflux'
import { Button, Input } from '@ir-engine/ui'
import Text from '@ir-engine/ui/src/primitives/tailwind/Text'

import AddEditAvatarModal from './AddEditAvatarModal'
import AvatarTable from './AvatarTable'

export default function Avatars() {
  const { t } = useTranslation()
  const search = useHookstate({ local: '', query: '' })
  const debouncedSearchQueryRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => clearTimeout(debouncedSearchQueryRef.current), [])

  return (
    <>
      <div>
        <Text fontSize="xl" className="mb-6">
          {t('admin:components.avatar.avatars')}
        </Text>
        <div className="mb-4 flex justify-between">
          <Input
            placeholder={t('common:components.search')}
            value={search.local.value}
            onChange={(event) => {
              search.local.set(event.target.value)

              if (debouncedSearchQueryRef) {
                clearTimeout(debouncedSearchQueryRef.current)
              }

              debouncedSearchQueryRef.current = setTimeout(() => {
                search.query.set(event.target.value)
              }, 100)
            }}
            startComponent={<HiMagnifyingGlass />}
          />
          <div>
            <Button
              size="sm"
              fullWidth
              onClick={() => {
                PopoverState.showPopupover(<AddEditAvatarModal />)
              }}
            >
              <HiPlus />
              {t('admin:components.avatar.add')}
            </Button>
          </div>
        </div>
      </div>
      <AvatarTable search={search.query.value} />
    </>
  )
}
