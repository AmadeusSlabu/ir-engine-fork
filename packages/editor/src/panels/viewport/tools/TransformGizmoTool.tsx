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

import { EditorControlFunctions } from '@ir-engine/editor/src/functions/EditorControlFunctions'
import { setTransformMode } from '@ir-engine/editor/src/functions/transformFunctions'
import { EditorHelperState } from '@ir-engine/editor/src/services/EditorHelperState'
import { TransformMode } from '@ir-engine/engine/src/scene/constants/transformConstants'
import { getMutableState, useMutableState } from '@ir-engine/hyperflux'
import { InputState } from '@ir-engine/spatial/src/input/state/InputState'
import { Tooltip } from '@ir-engine/ui'
import { ToolbarButton } from '@ir-engine/ui/editor'
import { Cursor03Default, Refresh1Md, Scale02Md, TransformMd } from '@ir-engine/ui/src/icons'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TbMarquee2 } from 'react-icons/tb'
import { SelectionBoxState } from './SelectionBoxTool'

const GizmoTools = {
  ...TransformMode,
  pointer: 'pointer' as const,
  selectionBox: 'selection_box' as const
}

type GizmoToolsType = (typeof GizmoTools)[keyof typeof GizmoTools]

function Placer() {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="h-0.5 w-6 bg-[#2B2C30]" />
      <div className="h-0.5 w-6 bg-[#2B2C30]" />
    </div>
  )
}

export default function TransformGizmoTool({
  viewportRef,
  toolbarRef
}: {
  viewportRef: React.RefObject<HTMLDivElement>
  toolbarRef: React.RefObject<HTMLDivElement>
}) {
  const { t } = useTranslation()
  const editorHelperState = useMutableState(EditorHelperState)
  const transformMode = editorHelperState.transformMode.value

  const [position, setPosition] = useState({ x: 16, y: 56 })
  const [isDragging, setIsDragging] = useState(false)
  const [isClickedSelectionBox, setIsClickedSelectionBox] = useState(false)
  const [startingMouseX, setStartingMouseX] = useState(0)
  const [startingMouseY, setStartingMouseY] = useState(0)
  const [toolSelected, setToolSelected] = useState<GizmoToolsType>(transformMode)

  const gizmoRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartingMouseX(e.clientX)
    setStartingMouseY(e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && viewportRef.current && gizmoRef.current && toolbarRef.current) {
      const viewportRect = viewportRef.current.getBoundingClientRect()
      const gizmoRect = gizmoRef.current.getBoundingClientRect()
      const toolbarRect = toolbarRef.current.getBoundingClientRect()
      const offsetX = e.clientX - startingMouseX
      const offsetY = e.clientY - startingMouseY

      const newX = Math.max(0, Math.min(position.x + offsetX, viewportRect.width - gizmoRect.width))
      const newY = Math.max(toolbarRect.height, Math.min(position.y + offsetY, viewportRect.height - gizmoRect.height))

      setPosition({ x: newX, y: newY })
    }
  }
  const handleClickSelectionBox = () => {
    setIsClickedSelectionBox(!isClickedSelectionBox)
    getMutableState(SelectionBoxState).selectionBoxEnabled.set(!isClickedSelectionBox)
    getMutableState(InputState).capturingCameraOrbitEnabled.set(isClickedSelectionBox)
    setToolSelected(GizmoTools.selectionBox)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove as any)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return (
    <div
      ref={gizmoRef}
      className={`absolute z-[5] flex flex-col items-center rounded-lg bg-[#080808] p-2`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      <div className={`z-[6] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} onMouseDown={handleMouseDown}>
        <Placer />
      </div>
      <div className="mt-2 flex flex-col overflow-hidden rounded bg-[#212226]">
        <Tooltip content={t('editor:toolbar.gizmo.pointer')} position="right">
          <ToolbarButton
            onClick={() => {
              EditorControlFunctions.replaceSelection([])
              setToolSelected(GizmoTools.pointer)
            }}
            selected={toolSelected === GizmoTools.pointer}
          >
            <Cursor03Default />
          </ToolbarButton>
        </Tooltip>
        <Tooltip content={t('editor:toolbar.gizmo.translate')} position="right">
          <ToolbarButton
            onClick={() => {
              setTransformMode(TransformMode.translate)
              setToolSelected(GizmoTools.translate)
            }}
            selected={toolSelected === GizmoTools.translate}
          >
            <Scale02Md />
          </ToolbarButton>
        </Tooltip>
        <Tooltip content={t('editor:toolbar.gizmo.rotate')} position="right">
          <ToolbarButton
            onClick={() => {
              setTransformMode(TransformMode.rotate)
              setToolSelected(GizmoTools.rotate)
            }}
            selected={toolSelected === GizmoTools.rotate}
          >
            <Refresh1Md />
          </ToolbarButton>
        </Tooltip>
        <Tooltip content={t('editor:toolbar.gizmo.scale')} position="right">
          <ToolbarButton
            onClick={() => {
              setTransformMode(TransformMode.scale)
              setToolSelected(GizmoTools.scale)
            }}
            selected={toolSelected === GizmoTools.scale}
          >
            <TransformMd />
          </ToolbarButton>
        </Tooltip>
        <Tooltip content={t('disable orbit camera and enable selection box')} position="right">
          <ToolbarButton onClick={handleClickSelectionBox} selected={toolSelected === GizmoTools.selectionBox}>
            <TbMarquee2 />
          </ToolbarButton>
        </Tooltip>
      </div>
    </div>
  )
}
