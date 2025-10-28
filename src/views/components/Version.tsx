import React from 'react'
import { version } from '../../../package.json'
import { getLlmModel } from '../../utils/prefs'

export function Version() {
  const model = getLlmModel()

  return (
    <div className="text-center w-full text-gray-400 text-sm py-0.5">
      <span>Version: {version}</span> <span>(Model: {model})</span>
    </div>
  )
}
