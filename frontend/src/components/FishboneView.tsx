import React from 'react'
import { FishboneCause, RCAInvestigation } from '../store/rcaSlice'

interface FishboneViewProps {
  investigation: RCAInvestigation
  onConfirmCause: (causeId: number) => void
  onAddCause: (category: string) => void
  onUpdateCause: (causeId: number, data: Partial<FishboneCause>) => void
  onRemoveCause: (causeId: number) => void
}

const FISHBONE_CATEGORIES = [
  { key: 'Man', label: 'Man (People)', icon: '👤' },
  { key: 'Machine', label: 'Machine (Equipment)', icon: '⚙️' },
  { key: 'Method', label: 'Method (Process)', icon: '📋' },
  { key: 'Material', label: 'Material', icon: '📦' },
  { key: 'Measurement', label: 'Measurement', icon: '📏' },
  { key: 'Environment', label: 'Environment', icon: '🌍' },
]

export const FishboneView: React.FC<FishboneViewProps> = ({
  investigation,
  onConfirmCause,
  onAddCause,
  onUpdateCause,
  onRemoveCause,
}) => {
  const causes = investigation.fishbone_causes || []

  const causesByCategory = FISHBONE_CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = causes.filter(c => c.category === cat.key)
    return acc
  }, {} as Record<string, FishboneCause[]>)

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Fishbone (Ishikawa) Diagram:</span> Organize root causes by category. Each category can have multiple contributing causes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FISHBONE_CATEGORIES.map((category) => (
          <FishboneCategoryColumn
            key={category.key}
            category={category}
            causes={causesByCategory[category.key]}
            onConfirm={(causeId) => onConfirmCause(causeId)}
            onAdd={() => onAddCause(category.key)}
            onUpdate={(causeId, data) => onUpdateCause(causeId, data)}
            onRemove={(causeId) => onRemoveCause(causeId)}
          />
        ))}
      </div>

      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <p className="text-sm text-gray-600">
          💡 Tip: Confirm causes that are supported by evidence to track which factors contributed to the root cause
        </p>
      </div>
    </div>
  )
}

interface FishboneCategoryColumnProps {
  category: { key: string; label: string; icon: string }
  causes: FishboneCause[]
  onConfirm: (causeId: number) => void
  onAdd: () => void
  onUpdate: (causeId: number, data: Partial<FishboneCause>) => void
  onRemove: (causeId: number) => void
}

const FishboneCategoryColumn: React.FC<FishboneCategoryColumnProps> = ({
  category,
  causes,
  onConfirm,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-2xl">{category.icon}</span>
        <h5 className="font-semibold text-gray-800">{category.label}</h5>
      </div>

      {causes.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm mb-3">No causes yet</p>
          <button
            onClick={onAdd}
            className="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            + Add
          </button>
        </div>
      ) : (
        <div className="space-y-3 mb-3">
          {causes.map((cause) => (
            <FishboneCauseCard
              key={cause.id}
              cause={cause}
              isAISuggested={cause.is_ai_suggested}
              isConfirmed={cause.confirmedByUser}
              onConfirm={() => onConfirm(cause.id)}
              onUpdate={(data) => onUpdate(cause.id, data)}
              onRemove={() => onRemove(cause.id)}
            />
          ))}
        </div>
      )}

      {causes.length > 0 && (
        <button
          onClick={onAdd}
          className="w-full px-3 py-2 text-sm border border-dashed border-blue-300 text-blue-600 rounded hover:bg-blue-50"
        >
          + Add Another
        </button>
      )}
    </div>
  )
}

interface FishboneCauseCardProps {
  cause: FishboneCause
  isAISuggested: boolean
  isConfirmed: boolean
  onConfirm: () => void
  onUpdate: (data: Partial<FishboneCause>) => void
  onRemove: () => void
}

const FishboneCauseCard: React.FC<FishboneCauseCardProps> = ({
  cause,
  isAISuggested,
  isConfirmed,
  onConfirm,
  onUpdate,
  onRemove,
}) => {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editedText, setEditedText] = React.useState(cause.cause_text)

  const handleSave = () => {
    onUpdate({ cause_text: editedText })
    setIsEditing(false)
  }

  return (
    <div
      className={`p-3 rounded-lg border-2 transition-colors ${
        cause.isAIFilled
          ? 'border-green-400 bg-green-50'
          : 'border-gray-200 bg-white'
      } ${isConfirmed ? 'ring-2 ring-green-300' : ''}`}
    >
      {!isEditing ? (
        <div>
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm text-gray-800 font-medium leading-snug">
              {cause.cause_text}
            </p>
            <button
              onClick={onRemove}
              className="text-gray-400 hover:text-red-600 text-lg leading-none ml-2 flex-shrink-0"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {isAISuggested && !isConfirmed && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                Unconfirmed
              </span>
            )}
            {cause.isAIFilled && (
              <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                AI Suggested
              </span>
            )}
            {isConfirmed && (
              <span className="text-xs bg-green-200 text-green-900 px-1.5 py-0.5 rounded font-medium">
                ✓ Confirmed
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Edit
            </button>
            {isAISuggested && !isConfirmed && (
              <button
                onClick={onConfirm}
                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
              >
                ✓ Confirm
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <div className="flex gap-1">
            <button
              onClick={handleSave}
              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs px-2 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}