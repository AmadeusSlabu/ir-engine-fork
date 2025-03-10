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

import { Entity } from '@ir-engine/ecs'
import { getMutableState, getState, none } from '@ir-engine/hyperflux'
import { EffectReactorProps, PostProcessingEffectState } from '@ir-engine/spatial/src/renderer/effects/EffectRegistry'
import { BlendFunction, LUT3DEffect } from 'postprocessing'
import React, { useEffect } from 'react'
import { useTexture } from '../assets/functions/resourceLoaderHooks'
import { PropertyTypes } from './PostProcessingRegister'

declare module 'postprocessing' {
  interface EffectComposer {
    LUT3DEffect: LUT3DEffect
  }
}

const effectKey = 'LUT3DEffect'

export const LUT3DEffectProcessReactor: React.FC<EffectReactorProps> = (props: {
  isActive
  rendererEntity: Entity
  effectData
  effects
}) => {
  const { isActive, rendererEntity, effectData, effects } = props
  const effectState = getState(PostProcessingEffectState)

  const [lut3DEffectTexture, lut3DEffectTextureError] = useTexture(effectData[effectKey].value?.lutPath!)

  useEffect(() => {
    if (effectData[effectKey].value) return
    effectData[effectKey].set(effectState[effectKey].defaultValues)
  }, [])

  useEffect(() => {
    if (!isActive?.value) {
      if (effects[effectKey].value) effects[effectKey].set(none)
      return
    }

    if (lut3DEffectTexture) {
      const eff = new LUT3DEffect(lut3DEffectTexture, effectData[effectKey].value)
      effects[effectKey].set(eff)
    }
    return () => {
      effects[effectKey].set(none)
    }
  }, [isActive, effectData[effectKey], lut3DEffectTexture])

  return null
}

export const lut3DAddToEffectRegistry = () => {
  // registers the effect

  getMutableState(PostProcessingEffectState).merge({
    [effectKey]: {
      reactor: LUT3DEffectProcessReactor,
      defaultValues: {
        isActive: false,
        blendFunction: BlendFunction.SRC,
        lutPath: undefined,
        lut: undefined
      },
      schema: {
        blendFunction: { propertyType: PropertyTypes.BlendFunction, name: 'Blend Function' },
        lutPath: { propertyType: PropertyTypes.Texture, name: 'LUT' }
      }
    }
  })
}
