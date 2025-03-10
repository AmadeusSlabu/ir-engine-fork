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

import { EyeSm, Lock01Sm } from '@ir-engine/ui/src/icons'
import { useArgs } from '@storybook/preview-api'
import { ArgTypes } from '@storybook/react'
import React from 'react'
import EditorDropdownItem, { EditorDropdownItemProps } from './index'

const argTypes: ArgTypes = {
  label: {
    control: 'text'
  },
  selected: {
    control: 'boolean'
  },
  disabled: {
    control: 'boolean'
  },
  rightIcon1: {
    name: 'Right Icon 1',
    control: 'boolean'
  },
  rightIcon2: {
    name: 'Right Icon 2',
    control: 'boolean'
  }
}

export default {
  title: 'Components/Editor/EditorDropdownItem',
  component: EditorDropdownItem,
  parameters: {
    componentSubtitle: 'EditorDropdownItem',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/ln2VDACenFEkjVeHkowxyi/iR-Engine-Design-Library-File?node-id=2504-5037&node-type=frame&t=kvvxZyxXfr04QgeG-0'
    }
  },
  argTypes,
  args: {
    label: 'Label',
    selected: false
  }
}

const EditorDropdownItemRenderer = (args: EditorDropdownItemProps & { rightIcon1?: boolean; rightIcon2?: boolean }) => {
  const [currentArgs, updateArgs] = useArgs<{ selected: boolean }>()
  return (
    <EditorDropdownItem
      {...args}
      selected={currentArgs.selected}
      onClick={() => updateArgs({ selected: !currentArgs.selected })}
      RightIcon1={args.rightIcon1 && (Lock01Sm as any)}
      RightIcon2={args.rightIcon2 && (EyeSm as any)}
    />
  )
}

export const Default = {
  name: 'Default',
  render: EditorDropdownItemRenderer
}
