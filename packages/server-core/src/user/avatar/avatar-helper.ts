/*
CPAL-1.0 License

The contents of this file are subject to the Common Public Attribution License
Version 1.0. (the "License"); you may not use this file except in compliance
with the License. You may obtain a copy of the License at
https://github.com/EtherealEngine/etherealengine/blob/dev/LICENSE.
The License is based on the Mozilla Public License Version 1.1, but Sections 14
and 15 have been added to cover use of software over a computer network and 
provide for limited attribution for the Original Developer. In addition, 
Exhibit A has been modified to be consistent with Exhibit B.

Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
specific language governing rights and limitations under the License.

The Original Code is Ethereal Engine.

The Original Developer is the Initial Developer. The Initial Developer of the
Original Code is the Ethereal Engine team.

All portions of the code written by the Ethereal Engine team are Copyright © 2021-2023 
Ethereal Engine. All Rights Reserved.
*/

import appRootPath from 'app-root-path'
import fs from 'fs'
import path from 'path'

import { AvatarID, avatarPath } from '@etherealengine/common/src/schemas/user/avatar.schema'
import { CommonKnownContentTypes } from '@etherealengine/common/src/utils/CommonKnownContentTypes'

import { fileBrowserPath, staticResourcePath, StaticResourceType } from '@etherealengine/common/src/schema.type.module'
import { Application } from '../../../declarations'
import { getStorageProvider } from '../../media/storageprovider/storageprovider'
import { UploadParams } from '../../media/upload-asset/upload-asset.service'
import logger from '../../ServerLogger'

const getAvatarDependencies = async (resourceKey: string) => {
  const fileExtension = resourceKey.split('.').pop()!
  if (fileExtension !== 'gltf') return [] // only gltf files have dependencies

  const resourceFolder = resourceKey.split('/').slice(0, -1).join('/')
  const avatarName = resourceKey.split('/').pop()!.split('.')[0]
  const storageProvider = getStorageProvider()
  const hasRelativePath = await storageProvider.isDirectory(avatarName, resourceFolder)
  if (!hasRelativePath) return [] // no dependencies by folder name convention - TODO support other conventions

  const dependencies = await storageProvider.listObjects(resourceFolder + '/' + avatarName)
  return dependencies.Contents.map((dependency) => dependency.Key)
}

export const patchStaticResourceAsAvatar = async (app: Application, projectName: string, resourceKey: string) => {
  const staticResourceQuery = await app.service(staticResourcePath).find({
    query: {
      key: resourceKey
    }
  })
  if (!staticResourceQuery.data || staticResourceQuery.data.length === 0)
    throw new Error('Static resource not found for key ' + resourceKey)

  const staticResource = staticResourceQuery.data[0]

  const thumbnailPath = resourceKey.split('.').slice(0, -1).join('.') + '.png'
  const thumbnailResourceQuery = await app.service(staticResourcePath).find({
    query: {
      key: thumbnailPath
    }
  })

  const thumbnailStaticResource = thumbnailResourceQuery.data[0] as StaticResourceType | undefined

  const existingAvatar = await app.service(avatarPath).find({
    query: {
      modelResourceId: staticResourceQuery.data[0].id
    }
  })

  if (existingAvatar.data.length > 0) {
    await app.service(avatarPath).patch(existingAvatar.data[0].id, {
      modelResourceId: staticResource.id,
      thumbnailResourceId: thumbnailStaticResource?.id || undefined
    })
  } else {
    await app.service(avatarPath).create({
      name: resourceKey.split('/').pop()!.split('.')[0],
      modelResourceId: staticResource.id,
      thumbnailResourceId: thumbnailStaticResource?.id || undefined,
      isPublic: true,
      project: projectName || undefined
    })
  }

  const dependencies = await getAvatarDependencies(resourceKey)
  await app.service(staticResourcePath).patch(staticResource.id, {
    type: 'avatar',
    dependencies: [...dependencies, ...(thumbnailStaticResource ? [thumbnailStaticResource.key] : [])]
  })
  if (thumbnailStaticResource) {
    await app.service(staticResourcePath).patch(thumbnailStaticResource.id, {
      type: 'thumbnail'
    })
  }
}

export type AvatarUploadArguments = {
  avatar: Buffer
  thumbnail: Buffer
  avatarName: string
  isPublic: boolean
  avatarFileType?: string
  avatarId?: AvatarID
  project?: string
  path?: string
}

// todo: move this somewhere else
export const supportedAvatars = ['glb', 'gltf', 'vrm', 'fbx']
const projectsPath = path.join(appRootPath.path, '/packages/projects/')

/**
 * @todo - reference dependency files in static resources?
 * @param app
 * @param avatarsFolder
 * @deprecated
 */
export const installAvatarsFromProject = async (app: Application, avatarsFolder: string) => {
  // TODO backcompat
  const projectName = avatarsFolder
    .replace(projectsPath + '/projects/', '')
    .split('/')
    .pop()!
  return Promise.all(
    fs
      .readdirSync(avatarsFolder)
      .filter((file) => supportedAvatars.includes(file.split('.').pop()!))
      .map((file) => {
        return patchStaticResourceAsAvatar(
          app,
          projectName,
          path.resolve(avatarsFolder, file).replace(projectsPath, '')
        )
      })
  )
}

export const uploadAvatarStaticResource = async (
  app: Application,
  data: AvatarUploadArguments,
  params?: UploadParams
) => {
  if (!data.avatar) throw new Error('No avatar model found')
  if (!data.thumbnail) throw new Error('No thumbnail found')

  const name = data.avatarName ? data.avatarName : 'Avatar-' + Math.round(Math.random() * 100000)

  const staticResourceKey = `avatars/${data.isPublic ? 'public' : params?.user!.id}/`
  const isFromDomain = !!data.path
  const folderName = isFromDomain ? data.path! : staticResourceKey

  await Promise.all([
    app.service(fileBrowserPath).patch(
      null,
      {
        body: data.avatar,
        path: folderName,
        fileName: `${name}.${data.avatarFileType ?? 'glb'}`,
        contentType: CommonKnownContentTypes[data.avatarFileType ?? 'glb']
      },
      params
    ),
    app.service(fileBrowserPath).patch(
      null,
      {
        body: data.thumbnail,
        path: folderName,
        fileName: `${name}.png`,
        contentType: CommonKnownContentTypes.png
      },
      params
    )
  ])

  // const [modelResource, thumbnailResource] = await Promise.all([
  //   addAssetAsStaticResource(
  //     app,
  //     {
  //       buffer: data.avatar,
  //       originalname: `${name}.${data.avatarFileType ?? 'glb'}`,
  //       mimetype: CommonKnownContentTypes[data.avatarFileType ?? 'glb'],
  //       size: data.avatar.byteLength
  //     },
  //     {
  //       userId: params?.user!.id,
  //       path,
  //       project: data.project
  //     }
  //   ),
  //   addAssetAsStaticResource(
  //     app,
  //     {
  //       buffer: data.thumbnail,
  //       originalname: `${name}.png`,
  //       mimetype: CommonKnownContentTypes.png,
  //       size: data.thumbnail.byteLength
  //     },
  //     {
  //       userId: params?.user!.id,
  //       path,
  //       project: data.project
  //     }
  //   )
  // ])

  const modelKey = path.join(folderName, `${name}.${data.avatarFileType ?? 'glb'}`)
  const thumbnailKey = path.join(folderName, `${name}.png`)

  const modelResourceQuery = await app.service(staticResourcePath).find({
    query: {
      key: modelKey
    }
  })
  const modelResource = modelResourceQuery.data[0] as StaticResourceType

  const thumbnailResourceQuery = await app.service(staticResourcePath).find({
    query: {
      key: thumbnailKey
    }
  })
  const thumbnailResource = thumbnailResourceQuery.data[0] as StaticResourceType

  logger.info('Successfully uploaded avatar %o %o', modelResource, thumbnailResource)

  if (data.avatarId) {
    try {
      await app.service(avatarPath).patch(data.avatarId, {
        modelResourceId: modelResource.id,
        thumbnailResourceId: thumbnailResource.id
      })
    } catch (err) {
      console.log(err)
    }
  }

  return [modelResource, thumbnailResource]
}
