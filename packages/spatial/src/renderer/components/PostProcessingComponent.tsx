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

import { Entity, defineComponent, useComponent, useEntityContext } from '@ir-engine/ecs'
import { S } from '@ir-engine/ecs/src/schemas/JSONSchemas'
import { ErrorBoundary, getState, useMutableState } from '@ir-engine/hyperflux'
import { EffectComposer } from 'postprocessing'
import React, { Suspense } from 'react'
import { Scene } from 'three'
import { EffectSchema, RendererComponent } from '../WebGLRendererSystem'
import { PostProcessingEffectState } from '../effects/EffectRegistry'
import { useRendererEntity } from '../functions/useRendererEntity'

export const PostProcessingComponent = defineComponent({
  name: 'PostProcessingComponent',
  jsonID: 'EE_postprocessing',

  schema: S.Object({
    enabled: S.Bool(false),
    effects: S.Record(S.String(), EffectSchema)
  }),

  /** @todo this will be replaced with spatial queries or distance checks */
  reactor: () => {
    const entity = useEntityContext()
    const rendererEntity = useRendererEntity(entity)

    if (!rendererEntity) return null

    return <PostProcessingReactor entity={entity} rendererEntity={rendererEntity} />
  }
})

const PostProcessingReactor = (props: { entity: Entity; rendererEntity: Entity }) => {
  const { entity, rendererEntity } = props
  const postProcessingComponent = useComponent(entity, PostProcessingComponent)
  const EffectRegistry = useMutableState(PostProcessingEffectState).keys
  const renderer = useComponent(rendererEntity, RendererComponent)
  const effects = renderer.effects
  const composer = renderer.effectComposer.value as EffectComposer
  const scene = renderer.scene.value as Scene

  if (!postProcessingComponent.enabled.value) return null

  // for each effect specified in our postProcessingComponent, we mount a sub-reactor based on the effect registry for that effect ID
  return (
    <>
      {EffectRegistry.map((key) => {
        const effect = getState(PostProcessingEffectState)[key] // get effect registry entry
        if (!effect) return null
        return (
          <Suspense key={key}>
            <ErrorBoundary>
              <effect.reactor
                isActive={postProcessingComponent.effects[key]?.isActive}
                rendererEntity={rendererEntity}
                effectData={postProcessingComponent.effects}
                effects={effects}
                composer={composer}
                scene={scene}
              />
            </ErrorBoundary>
          </Suspense>
        )
      })}
    </>
  )
}
