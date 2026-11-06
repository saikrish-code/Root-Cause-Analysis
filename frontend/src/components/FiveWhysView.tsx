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
      <div className="text-center py-8 text-gray-500">
        <p className="mb-4">No 5 Whys steps yet. Add one to start.</p>
        <button
          onClick={onAddStep}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
        className="w-full px-4 py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
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
      className={`p-4 rounded-lg border-2 ${
        step.isAIFilled ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
            {stepNumber}
          </div>
          <h5 className="font-medium text-gray-800">Why Step {stepNumber}</h5>
        </div>
        <div className="flex items-center space-x-2">
          {isAISuggested && !isConfirmed && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
              Unconfirmed
            </span>
          )}
          {isConfirmed && (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
              ✓ Confirmed
            </span>
          )}
          {step.isAIFilled && (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
              AI Suggested
            </span>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div>
          {step.why_question && (
            <div className="mb-3 p-2 bg-blue-50 rounded">
              <p className="text-sm text-blue-900">
                <span className="font-medium">Why?</span> {step.why_question}
              </p>
            </div>
          )}
          <div className="mb-4 p-3 bg-white border border-gray-200 rounded">
            <p className="text-gray-800">
              <span className="font-medium">→</span> {step.answer}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Edit
            </button>
            {isAISuggested && !isConfirmed && (
              <button
                onClick={onConfirm}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 font-medium"
              >
                ✓ Confirm
              </button>
            )}
            <button
              onClick={onAskDeeper}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Asking AI...' : '🔍 Ask AI to go deeper'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Why Question (optional)
            </label>
            <input
              type="text"
              value={editedQuestion}
              onChange={(e) => setEditedQuestion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Why did this happen?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Answer
            </label>
            <textarea
              value={editedAnswer}
              onChange={(e) => setEditedAnswer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-sm bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}