import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import { setSelectedMethod, confirmFiveWhysStep, updateFiveWhysStep, addFiveWhysStep, removeFishboneCause, confirmFishboneCause, updateFishboneCause, addFishboneCause, askAIDeeper, setConfirmedRootCause } from '../store/rcaSlice'
import { FiveWhysView } from './FiveWhysView'
import { FishboneView } from './FishboneView'

export const InvestigationSection: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const rca = useSelector((state: RootState) => state.rca)
  const [rootCauseText, setRootCauseText] = useState('')

  if (!rca.investigation) {
    return (
      <div className="p-4 text-center text-gray-400">
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

  const handleAskAIDeeper = async (_stepId: number, stepAnswer: string) => {
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

  return (
    <div>
      <div className="mb-6 pb-4 border-b border-white/10">
        <h4 className="font-semibold text-gray-300 mb-3 text-xs uppercase tracking-wider">Investigation Method</h4>
        <div className="flex space-x-3">
          <button
            onClick={() => handleMethodToggle('five_whys')}
            className={`px-5 py-2 rounded-full font-semibold text-sm transition-all ${
              rca.selectedMethod === 'five_whys'
                ? 'bg-[#D5FF40] text-gray-900 shadow-md shadow-[#D5FF40]/10'
                : 'bg-[#2A2A2A] text-gray-300 hover:bg-[#333333]'
            }`}
          >
            5 Whys
          </button>
          <button
            onClick={() => handleMethodToggle('fishbone')}
            className={`px-5 py-2 rounded-full font-semibold text-sm transition-all ${
              rca.selectedMethod === 'fishbone'
                ? 'bg-[#D5FF40] text-gray-900 shadow-md shadow-[#D5FF40]/10'
                : 'bg-[#2A2A2A] text-gray-300 hover:bg-[#333333]'
            }`}
          >
            Fishbone
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
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

      <div className="mt-8 p-6 rounded-2xl border border-white/10 bg-[#2A2A2A]">
        <h4 className="font-bold text-white mb-2 text-base">Quick Root Cause Confirmation</h4>
        {confirmedItems.length === 0 && (
          <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl mb-3">
            ⚠️ Confirm at least one step/cause before finalizing root cause summary below.
          </p>
        )}
        
        {confirmedItems.length > 0 && (
          <div className="mb-4 p-3.5 bg-[#0D0D0D] rounded-xl border border-white/10">
            <p className="text-xs text-gray-300 font-semibold mb-1">Confirmed items count: {confirmedItems.length}</p>
          </div>
        )}

        <textarea
          value={rootCauseText}
          onChange={(e) => setRootCauseText(e.target.value)}
          placeholder="Summarize the root cause in your own words..."
          className="w-full p-3.5 bg-[#0D0D0D] text-gray-200 border border-white/10 rounded-xl mb-3 text-sm focus:ring-2 focus:ring-[#D5FF40]"
          rows={3}
        />

        <button
          onClick={() => {
            if (rootCauseText.trim()) {
              dispatch(setConfirmedRootCause(rootCauseText.trim()))
              setRootCauseText('')
            }
          }}
          disabled={confirmedItems.length === 0 || !rootCauseText.trim()}
          className="px-6 py-2.5 bg-[#D5FF40] text-gray-900 rounded-full hover:bg-[#c2eb35] disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-all shadow-md shadow-[#D5FF40]/10"
        >
          Confirm Root Cause Summary
        </button>
      </div>
    </div>
  )
}
