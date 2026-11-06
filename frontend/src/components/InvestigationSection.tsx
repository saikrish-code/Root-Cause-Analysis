import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import { setSelectedMethod, confirmFiveWhysStep, updateFiveWhysStep, addFiveWhysStep, removeFishboneCause, confirmFishboneCause, updateFishboneCause, addFishboneCause, askAIDeeper } from '../store/rcaSlice'
import { FiveWhysView } from './FiveWhysView'
import { FishboneView } from './FishboneView'

export const InvestigationSection: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const rca = useSelector((state: RootState) => state.rca)
  const [showRootCauseEditor, setShowRootCauseEditor] = useState(false)
  const [rootCauseText, setRootCauseText] = useState('')

  if (!rca.investigation) {
    return (
      <div className="p-4 text-center text-gray-500">
        Investigation will be generated after AI processing
      </div>
    )
  }

  const investigation = rca.investigation

  const handleMethodToggle = (method: 'five_whys' | 'fishbone') => {
    dispatch(setSelectedMethod(method))
  }

  const handleConfirmStep = (stepId: number) => {
    dispatch(confirmFiveWhysStep(stepId))
  }

  const handleConfirmCause = (causeId: number) => {
    dispatch(confirmFishboneCause(causeId))
  }

  const handleAddFiveWhysStep = () => {
    const newStep = {
      id: -(Date.now()),
      rca_investigation_id: investigation.id,
      step_number: (investigation.five_whys_steps?.length || 0) + 1,
      why_question: '',
      answer: '',
      is_ai_suggested: false,
      user_edited: false,
    }
    dispatch(addFiveWhysStep(newStep))
  }

  const handleAddFishboneCause = (category: string) => {
    const newCause = {
      id: -(Date.now()),
      rca_investigation_id: investigation.id,
      category,
      cause_text: '',
      is_ai_suggested: false,
      user_edited: false,
    }
    dispatch(addFishboneCause(newCause))
  }

  const handleAskAIDeeper = async (stepId: number, stepAnswer: string) => {
    dispatch(askAIDeeper({
      deviationId: investigation.deviation_id,
      stepAnswer,
      method: 'five_whys',
    }))
  }

  const confirmedItems = [
    ...investigation.five_whys_steps.filter(s => s.confirmedByUser),
    ...investigation.fishbone_causes.filter(c => c.confirmedByUser),
  ]

  const allAISuggestedConfirmed = [
    ...investigation.five_whys_steps.filter(s => s.is_ai_suggested && !s.confirmedByUser),
    ...investigation.fishbone_causes.filter(c => c.is_ai_suggested && !c.confirmedByUser),
  ].length === 0

  return (
    <div>
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h4 className="font-medium text-gray-700 mb-3">Investigation Method</h4>
        <div className="flex space-x-2">
          <button
            onClick={() => handleMethodToggle('five_whys')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              rca.selectedMethod === 'five_whys'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            5 Whys
          </button>
          <button
            onClick={() => handleMethodToggle('fishbone')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              rca.selectedMethod === 'fishbone'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Fishbone
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Data persists when switching methods
        </p>
      </div>

      {rca.selectedMethod === 'five_whys' && (
        <FiveWhysView
          investigation={investigation}
          onConfirmStep={handleConfirmStep}
          onAddStep={handleAddFiveWhysStep}
          onUpdateStep={(stepId, data) => dispatch(updateFiveWhysStep({ id: stepId, data }))}
          onAskDeeper={handleAskAIDeeper}
          isLoading={rca.isRunningDeeperAnalysis}
        />
      )}

      {rca.selectedMethod === 'fishbone' && (
        <FishboneView
          investigation={investigation}
          onConfirmCause={handleConfirmCause}
          onAddCause={handleAddFishboneCause}
          onUpdateCause={(causeId, data) => dispatch(updateFishboneCause({ id: causeId, data }))}
          onRemoveCause={(causeId) => dispatch(removeFishboneCause(causeId))}
        />
      )}

      <div className="mt-8 p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
        <h4 className="font-medium text-gray-800 mb-3">Confirm Root Cause</h4>
        {confirmedItems.length === 0 && (
          <p className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded mb-3">
            ⚠️ Confirm at least one step/cause before finalizing root cause
          </p>
        )}
        
        {confirmedItems.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Confirmed items:</span>
            </p>
            <ul className="list-disc list-inside text-sm text-blue-700 mt-2">
              {confirmedItems.slice(0, 3).map((item, i) => (
                <li key={i}>
                  {'answer' in item ? item.answer : item.cause_text}
                </li>
              ))}
              {confirmedItems.length > 3 && <li>... and {confirmedItems.length - 3} more</li>}
            </ul>
          </div>
        )}

        <textarea
          value={rootCauseText}
          onChange={(e) => setRootCauseText(e.target.value)}
          placeholder="Summarize the root cause in your own words..."
          className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
          rows={3}
        />

        <button
          disabled={confirmedItems.length === 0 || !rootCauseText.trim()}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Finalize Root Cause
        </button>
      </div>
    </div>
  )
}