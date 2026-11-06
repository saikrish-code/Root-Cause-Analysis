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
      <div className="p-4 bg-[#2A2A2A] rounded-2xl border border-white/10">
        <p className="text-xs text-gray-300 leading-relaxed">
          <strong className="text-white">Fishbone (Ishikawa) Diagram:</strong> Organize root causes by category. Each category can have multiple contributing causes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
    <div className="p-5 rounded-2xl border border-white/10 bg-[#2A2A2A]">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-xl">{category.icon}</span>
        <h5 className="font-bold text-white text-sm tracking-wide">{category.label}</h5>
      </div>

      {causes.length === 0 ? (
        <div className="text-center py-6 bg-[#0D0D0D] rounded-xl border border-white/5">
          <p className="text-gray-500 text-xs mb-3">No causes yet</p>
          <button
            onClick={onAdd}
            className="inline-block px-3.5 py-1.5 text-xs bg-[#1A1A1A] border border-[#D5FF40] text-[#D5FF40] rounded-full hover:bg-[#D5FF40] hover:text-gray-900 font-semibold transition-all"
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
          className="w-full px-3 py-2 text-xs border border-dashed border-[#D5FF40]/40 text-[#D5FF40] rounded-xl hover:bg-[#D5FF40]/5 font-semibold transition-all"
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
      className={`p-3.5 rounded-xl border transition-all bg-[#0D0D0D] ${
        cause.isAIFilled
          ? 'border-[#D5FF40]/50 ring-1 ring-[#D5FF40]/20'
          : 'border-white/10'
      } ${isConfirmed ? 'border-emerald-500/50' : ''}`}
    >
      {!isEditing ? (
        <div>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs text-gray-200 font-medium leading-relaxed">
              {cause.cause_text}
            </p>
            <button
              onClick={onRemove}
              className="text-gray-500 hover:text-red-400 text-sm leading-none ml-2 flex-shrink-0"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {isAISuggested && !isConfirmed && (
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                Unconfirmed
              </span>
            )}
            {cause.isAIFilled && (
              <span className="text-[10px] bg-[#D5FF40]/10 text-[#D5FF40] border border-[#D5FF40]/30 px-2 py-0.5 rounded-full font-semibold">
                AI Suggested
              </span>
            )}
            {isConfirmed && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                ✓ Confirmed
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setIsEditing(true)}
              className="text-[10px] px-3 py-1 bg-[#1A1A1A] text-gray-300 border border-white/10 rounded-full hover:bg-[#333333]"
            >
              Edit
            </button>
            {isAISuggested && !isConfirmed && (
              <button
                onClick={onConfirm}
                className="text-[10px] px-3 py-1 bg-[#D5FF40] text-gray-900 rounded-full hover:bg-[#c2eb35] font-semibold"
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
            className="w-full p-2 text-xs bg-[#1A1A1A] border border-white/10 text-gray-200 rounded-xl focus:ring-2 focus:ring-[#D5FF40]"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="text-[10px] px-3 py-1 bg-[#D5FF40] text-gray-900 rounded-full font-semibold hover:bg-[#c2eb35]"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-[10px] px-3 py-1 bg-[#1A1A1A] text-gray-300 border border-white/10 rounded-full hover:bg-[#333333]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
