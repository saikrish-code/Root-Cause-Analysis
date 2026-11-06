import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../store/store'
import { RCAForm } from './RCAForm'
import { AICopilotPanel } from './AICopilotPanel'

export const InvestigationScreen: React.FC = () => {
  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <RCAForm />
      </div>
      <div className="w-96 flex-shrink-0 border-l border-gray-200 overflow-hidden">
        <AICopilotPanel />
      </div>
    </div>
  )
}