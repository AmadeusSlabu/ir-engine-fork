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

import React, { lazy, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { NotificationService } from '@ir-engine/client-core/src/common/services/NotificationService'
import { PopoverState } from '@ir-engine/client-core/src/common/services/PopoverState'
import { useFind, useMutation } from '@ir-engine/common'
import {
  LocationData,
  LocationID,
  LocationPatch,
  LocationType,
  locationPath,
  staticResourcePath
} from '@ir-engine/common/src/schema.type.module'
import { saveSceneGLTF } from '@ir-engine/editor/src/functions/sceneFunctions'
import { EditorState } from '@ir-engine/editor/src/services/EditorServices'
import { getState, useHookstate } from '@ir-engine/hyperflux'
import { Button, Input, Select } from '@ir-engine/ui'
import LoadingView from '@ir-engine/ui/src/primitives/tailwind/LoadingView'
import { ModalHeader } from '@ir-engine/ui/src/primitives/tailwind/Modal'
import Toggle from '@ir-engine/ui/src/primitives/tailwind/Toggle'
import { HiLink } from 'react-icons/hi2'

const getDefaultErrors = () => ({
  name: '',
  maxUsers: '',
  scene: '',
  serverError: ''
})

const StudioSections = lazy(
  () => import('@ir-engine/ui/src/components/editor/Modal/AddEditLocationModalStudioSections')
)

const locationTypeOptions = [
  { label: 'Private', value: 'private' },
  { label: 'Public', value: 'public' },
  { label: 'Showroom', value: 'showroom' }
]

export default function AddEditLocationModal(props: {
  action: string
  location?: LocationType
  sceneID?: string | null
  inStudio?: boolean
}) {
  const { t } = useTranslation()

  const locationID = useHookstate(props.location?.id || null)

  const params = {
    query: {
      id: locationID.value,
      action: props.action
    }
  }

  const locationQuery = useFind(locationPath, locationID.value ? params : undefined)
  const location = locationID.value ? locationQuery.data[0] : undefined

  const locationMutation = useMutation(locationPath)

  const sceneModified = EditorState.useIsModified()

  const publishLoading = useHookstate(false)
  const unPublishLoading = useHookstate(false)
  const isLoading = locationQuery.status === 'pending' || publishLoading.value || unPublishLoading.value
  const errors = useHookstate(getDefaultErrors())

  const name = useHookstate(location?.name || '')
  const maxUsers = useHookstate(location?.maxUsersPerInstance || 5)

  const scene = useHookstate((location ? location.sceneId : props.sceneID) || '')
  const videoEnabled = useHookstate<boolean>(location?.locationSetting.videoEnabled || true)
  const audioEnabled = useHookstate<boolean>(location?.locationSetting.audioEnabled || true)
  const screenSharingEnabled = useHookstate<boolean>(location?.locationSetting.screenSharingEnabled || true)
  const locationType = useHookstate(location?.locationSetting.locationType || 'public')

  useEffect(() => {
    if (location) {
      name.set(location.name)
      maxUsers.set(location.maxUsersPerInstance)
      videoEnabled.set(location.locationSetting.videoEnabled)
      audioEnabled.set(location.locationSetting.audioEnabled)
      screenSharingEnabled.set(location.locationSetting.screenSharingEnabled)
      locationType.set(location.locationSetting.locationType)

      if (!props.sceneID) scene.set(location.sceneId)
    }
  }, [location])

  const scenes = useFind(staticResourcePath, {
    query: {
      paginate: false,
      type: 'scene'
    }
  })

  const handlePublish = async () => {
    errors.set(getDefaultErrors())

    if (!name.value) {
      errors.name.set(t('admin:components.location.nameCantEmpty'))
    }
    if (!maxUsers.value) {
      errors.maxUsers.set(t('admin:components.location.maxUserCantEmpty'))
    }
    if (maxUsers.value > 5) {
      errors.maxUsers.set(t('admin:components.location.maxUserExceeded'))
    }
    if (!scene.value) {
      errors.scene.set(t('admin:components.location.sceneCantEmpty'))
    }
    if (Object.values(errors.value).some((value) => value.length > 0)) {
      return
    }

    publishLoading.set(true)

    if (sceneModified) {
      try {
        const { sceneAssetID, projectName, sceneName, rootEntity } = getState(EditorState)
        if (!sceneAssetID || !projectName || !sceneName || !rootEntity)
          throw new Error('Cannot save scene without scene data')
        const abortController = new AbortController()
        await saveSceneGLTF(sceneAssetID, projectName, sceneName, abortController.signal)
      } catch (e) {
        errors.serverError.set(e.message)
        publishLoading.set(false)
        return
      }
    }

    const locationData: LocationData = {
      name: name.value,
      sceneId: scene.value,
      maxUsersPerInstance: maxUsers.value,
      locationSetting: {
        locationId: '' as LocationID,
        locationType: locationType.value,
        audioEnabled: Boolean(audioEnabled.value),
        screenSharingEnabled: Boolean(screenSharingEnabled.value),
        faceStreamingEnabled: false,
        videoEnabled: Boolean(videoEnabled.value)
      },
      isLobby: false,
      isFeatured: false
    }

    try {
      if (location?.id) {
        await locationMutation.patch(location.id, locationData as LocationPatch, {
          query: { projectId: location.projectId }
        })
      } else {
        const response = await locationMutation.create(locationData)
        locationID.set(response.id)
      }
      await locationQuery.refetch()
    } catch (err) {
      errors.serverError.set(err.message)
    }
    publishLoading.set(false)
  }

  const unPublishLocation = async () => {
    if (location?.id) {
      unPublishLoading.set(true)
      try {
        await locationMutation.remove(location.id, { query: { projectId: location.projectId } })
        locationID.set(null)
        await locationQuery.refetch()
      } catch (err) {
        errors.serverError.set(err.message)
      }
      unPublishLoading.set(false)
    }
  }

  return (
    <div className="relative z-50 w-[50vw] bg-theme-surface-main">
      <div className="relative rounded-lg shadow">
        <ModalHeader
          onClose={PopoverState.hidePopupover}
          title={location?.id ? t('editor:toolbar.publishLocation.update') : t('editor:toolbar.publishLocation.create')}
        />
        <div className="h-fit max-h-[60vh] w-full overflow-y-auto px-10 py-6">
          <div className="relative grid w-full gap-6">
            {errors.serverError.value && <p className="mb-3 text-red-700">{errors.serverError.value}</p>}
            {location && (
              <button
                className="flex w-full cursor-default items-center justify-center gap-x-1 text-left text-xs font-medium"
                data-testid="publish-panel-copy-link-buttons-group"
              >
                <div
                  className="cursor-pointer text-blue-primary hover:underline"
                  onClick={() => window.open(new URL(location.url))}
                >
                  {location.url}
                </div>
                <HiLink
                  className="z-10 h-4 w-4 cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(new URL(location.url).href)
                    NotificationService.dispatchNotify(t('editor:toolbar.publishLocation.locationLinkCopied'), {
                      variant: 'success'
                    })
                  }}
                />
              </button>
            )}
            <Input
              labelProps={{ text: t('admin:components.location.lbl-name'), position: 'top' }}
              value={name.value}
              data-testid="publish-panel-location-name"
              onChange={(event) => name.set(event.target.value)}
              state={errors.name.value ? 'error' : undefined}
              helperText={errors.name.value}
              disabled={isLoading}
              fullWidth
              height="xl"
            />
            <Input
              type="number"
              labelProps={{ text: t('admin:components.location.lbl-maxuser'), position: 'top' }}
              value={maxUsers.value}
              data-testid="publish-panel-location-max-users"
              onChange={(event) => maxUsers.set(Math.max(parseInt(event.target.value, 0), 0))}
              state={errors.maxUsers.value ? 'error' : undefined}
              helperText={errors.maxUsers.value}
              disabled={isLoading}
              fullWidth
              height="xl"
            />
            <Select
              labelProps={{
                text: t('admin:components.location.lbl-scene'),
                position: 'top'
              }}
              value={scene.value}
              onChange={(value: string) => scene.set(value)}
              disabled={!!props.sceneID || scenes.status !== 'success' || isLoading}
              options={
                scenes.status === 'pending'
                  ? [{ value: '', label: t('common:select.fetching') }]
                  : [
                      { value: '', label: t('admin:components.location.selectScene'), disabled: true },
                      ...scenes.data.map((scene) => {
                        const project = scene.project
                        const name = scene.key.split('/').pop()!.split('.').at(0)!
                        return {
                          label: `${name} (${project})`,
                          value: scene.id
                        }
                      })
                    ]
              }
              state={errors.scene.value ? 'error' : undefined}
              helperText={errors.scene.value}
              width="full"
              inputHeight="xl"
            />
            {/*<Select
              labelProps={{
                text: t('admin:components.location.type'),
                position: 'top'
              }}
              value={locationType.value}
              onChange={(value) => locationType.set(value as 'private' | 'public' | 'showroom')}
              options={locationTypeOptions}
              disabled={true}
              width="full"
              inputSizeVariant="xl"
            />*/}
            <Toggle
              label={t('admin:components.location.lbl-ve')}
              value={videoEnabled.value}
              onChange={videoEnabled.set}
              disabled={isLoading}
            />
            <Toggle
              label={t('admin:components.location.lbl-ae')}
              value={audioEnabled.value}
              onChange={audioEnabled.set}
              disabled={isLoading}
            />
            <Toggle
              label={t('admin:components.location.lbl-se')}
              value={screenSharingEnabled.value}
              onChange={screenSharingEnabled.set}
              disabled={isLoading}
            />
            {props.inStudio && (
              <React.Suspense fallback={null}>
                <StudioSections />
              </React.Suspense>
            )}
          </div>
        </div>

        <div className="grid grid-flow-col border-t border-t-theme-primary px-6 py-5">
          <Button
            variant="tertiary"
            data-testid="publish-panel-cancel-button"
            onClick={() => PopoverState.hidePopupover()}
          >
            {t('common:components.cancel')}
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {location?.id && (
              <Button
                className="bg-[#162546]"
                data-testid="publish-panel-unpublish-button"
                disabled={isLoading}
                onClick={unPublishLocation}
              >
                {t('editor:toolbar.publishLocation.unpublish')}
                {unPublishLoading.value ? <LoadingView spinnerOnly className="h-6 w-6" /> : undefined}
              </Button>
            )}
            <Button data-testid="publish-panel-publish-or-update-button" disabled={isLoading} onClick={handlePublish}>
              {location?.id
                ? t('common:components.update')
                : sceneModified
                ? t('editor:toolbar.publishLocation.saveAndPublish')
                : t('editor:toolbar.publishLocation.title')}
              {publishLoading.value ? <LoadingView spinnerOnly className="h-6 w-6" /> : undefined}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
