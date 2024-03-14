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

export const EPSILON = 0.000001 // chosen from gl-matrix

export function equalsTolerance(a: number, b: number, tolerance: number = EPSILON): boolean {
  return Math.abs(a - b) < tolerance
}

// taken from gl-matrix
export function equalsAutoTolerance(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPSILON * Math.max(1, Math.abs(a), Math.abs(b))
}

export function degreesToRadians(a: number) {
  return a * (Math.PI / 180)
}

export function radiansToDegrees(a: number) {
  return a * (180 / Math.PI)
}

export function clamp(a: number, min: number, max: number): number {
  return a < min ? min : a > max ? max : a
}
