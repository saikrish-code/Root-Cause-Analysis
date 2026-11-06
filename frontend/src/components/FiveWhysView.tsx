import React from 'react'
import { FiveWhysStep, RCAInvestigation } from '../store/rcaSlice'

interface FiveWhysViewProps {
  investigation: RCAInvestigation
  onConfirmStep: (stepId: number) => void
  onAddStep: () => void
  onUpdateStep: (stepId: number, data: Partial<FiveWhysStep>) => void
  onAskDeeper: (stepId: number, answer: string) => void
  isLoading: boolean
}

export const FiveWhysView: React.FC<FiveWhysViewProps> = ({
  investigation,
  onConfirmStep,
  onAddStep,
  onUpdateStep,
  onAskDeeper,
  isLoading,
}) => {
  const steps = investigation.five_whys_steps || []

  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="mb-4 text-sm">No 5 Whys steps yet. Add one to start.</p>
        <button
          onClick={onAddStep}
          className="px-5 py-2.5 bg-[#D5FF40] text-gray-900 rounded-full hover:bg-[#c2eb35] font-semibold text-sm transition-all shadow-md shadow-[#D5FF40]/10"
        >
          Add First Step
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <FiveWhysStepCard
          key={step.id}
          step={step}
          stepNumber={index + 1}
          isAISuggested={step.is_ai_suggested}
          isConfirmed={step.confirmedByUser}
          onConfirm={() => onConfirmStep(step.id)}
          onUpdate={(data) => onUpdateStep(step.id, data)}
          onAskDeeper={() => onAskDeeper(step.id, step.answer)}
          isLoading={isLoading}
        />
      ))}

      <button
        onClick={onAddStep}
        className="w-full px-4 py-3 border border-dashed border-[#D5FF40]/40 text-[#D5FF40] rounded-2xl hover:bg-[#D5FF40]/5 font-semibold text-sm transition-all"
      >
        + Add Another Step
      </button>
    </div>
  )
}

interface FiveWhysStepCardProps {
  step: FiveWhysStep
  stepNumber: number
  isAISuggested: boolean
  isConfirmed: boolean
  onConfirm: () => void
  onUpdate: (data: Partial<FiveWhysStep>) => void
  onAskDeeper: () => void
  isLoading: boolean
}

const FiveWhysStepCard: React.FC<FiveWhysStepCardProps> = ({
  step,
  stepNumber,
  isAISuggested,
  isConfirmed,
  onConfirm,
  onUpdate,
  onAskDeeper,
  isLoading,
}) => {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editedAnswer, setEditedAnswer] = React.useState(step.answer)
  const [editedQuestion, setEditedQuestion] = React.useState(step.why_question || '')

  const handleSave = () => {
    onUpdate({
      answer: editedAnswer,
      why_question: editedQuestion || null,
    })
    setIsEditing(false)
  }

  return (
    <div
      className={`p-5 rounded-2xl border transition-all bg-[#2A2A2A] ${
        step.isAIFilled ? 'border-[#D5FF40]/50 ring-1 ring-[#D5FF40]/20' : 'border-white/10'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded-full bg-[#D5FF40] text-gray-900 flex items-center justify-center text-xs font-bold">
            {stepNumber}
          </div>
          <h5 className="font-semibold text-white text-sm">Why Step {stepNumber}</h5>
        </div>
        <div className="flex items-center space-x-2">
          {isAISuggested && !isConfirmed && (
            <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold">
              Unconfirmed
            </span>
          )}
          {isConfirmed && (
            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
              ✓ Confirmed
            </span>
          )}
          {step.isAIFilled && (
            <span className="px-2.5 py-0.5 bg-[#D5FF40]/10 text-[#D5FF40] border border-[#D5FF40]/30 rounded-full text-xs font-semibold">
              AI Suggested
            </span>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div>
          {step.why_question && (
            <div className="mb-3 p-3 bg-[#0D0D0D] rounded-xl border border-white/10">
              <p className="text-xs text-gray-300">
                <span className="font-semibold text-gray-400">Why?</span> {step.why_question}
              </p>
            </div>
          )}
          <div className="mb-4 p-3.5 bg-[#0D0D0D] border border-white/10 rounded-xl">
            <p className="text-gray-200 text-sm">
              <span className="font-semibold text-[#D5FF40] mr-2">→</span> {step.answer}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-1.5 text-xs bg-[#1A1A1A] text-gray-300 border border-white/10 rounded-full hover:bg-[#333333] font-medium"
            >
              Edit
            </button>
            {isAISuggested && !isConfirmed && (
              <button
                onClick={onConfirm}
                className="px-4 py-1.5 text-xs bg-[#D5FF40] text-gray-900 rounded-full hover:bg-[#c2eb35] font-semibold"
              >
                ✓ Confirm
              </button>
            )}
            <button
              onClick={onAskDeeper}
              disabled={isLoading}
              className="px-4 py-1.5 text-xs bg-[#1A1A1A] border border-[#D5FF40] text-[#D5FF40] rounded-full hover:bg-[#D5FF40] hover:text-gray-900 disabled:opacity-50 font-semibold transition-all"
            >
              {isLoading ? 'Asking AI...' : '🔍 Ask AI to go deeper'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Why Question (optional)
            </label>
            <input
              type="text"
              value={editedQuestion}
              onChange={(e) => setEditedQuestion(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#0D0D0D] border border-white/10 text-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#D5FF40]"
              placeholder="Why did this happen?"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Answer
            </label>
            <textarea
              value={editedAnswer}
              onChange={(e) => setEditedAnswer(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#0D0D0D] border border-white/10 text-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#D5FF40]"
              rows={3}
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs bg-[#D5FF40] text-gray-900 rounded-full font-semibold hover:bg-[#c2eb35]"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-1.5 text-xs bg-[#1A1A1A] text-gray-300 border border-white/10 rounded-full hover:bg-[#333333]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
