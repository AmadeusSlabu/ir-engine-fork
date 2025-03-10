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

import type { SVGProps } from 'react'
import * as React from 'react'
import { Ref, forwardRef } from 'react'
const VideoRecorderOffLg = (props: SVGProps<SVGSVGElement>, ref: Ref<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="none"
    viewBox="0 0 24 24"
    role="img"
    stroke="currentColor"
    ref={ref}
    {...props}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h9a3 3 0 0 0 2.87-2.125M17 12l3.634-3.634c.429-.429.643-.643.827-.657a.5.5 0 0 1 .42.173c.119.14.119.444.119 1.05v6.137c0 .605 0 .908-.12 1.049a.5.5 0 0 1-.42.173c-.183-.014-.397-.228-.826-.657zm0 0V9.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C14.72 5 13.88 5 12.2 5H9.5M2 2l20 20"
    />
  </svg>
)
const ForwardRef = forwardRef(VideoRecorderOffLg)
export default ForwardRef
