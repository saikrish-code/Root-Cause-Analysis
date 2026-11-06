import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import {
  createEvidenceItem,
  updateEvidenceItem,
  EvidenceItem,
} from '../store/evidenceSlice'
import { populateFromAI as populateRCAFromAI } from '../store/rcaSlice'

export const EvidenceChecklistSection: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const evidence = useSelector((state: RootState) => state.evidence)
  const aiSession = useSelector((state: RootState) => state.aiSession)
  const deviation = useSelector((state: RootState) => state.deviation)
  const rca = useSelector((state: RootState) => state.rca)

  const [activeGapIndex, setActiveGapIndex] = useState<number | null>(null)
  const [evidenceTypeInput, setEvidenceTypeInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [isRcaRunning, setIsRcaRunning] = useState(false)

  const evidenceGaps = aiSession.lastResult?.evidence_gap?.missing_information || []
  const suggestedTypes = aiSession.lastResult?.evidence_gap?.suggested_evidence_types || []
  const riskFlags = aiSession.lastResult?.evidence_gap?.risk_flags || []

  const handleToggleCollected = (item: EvidenceItem) => {
    dispatch(updateEvidenceItem({
      id: item.id,
      data: { collected: !item.collected }
    }))
  }

  const handleQuickAdd = (gapText: string, defaultType: string) => {
    const newItem = {
      evidence_type: defaultType || 'Document',
      description: gapText,
      source: 'User Added from Evidence Gap',
      collected: true,
      is_ai_flagged_missing: false,
      notes: notesInput || 'Added via Evidence Gap quick-add',
    }
    dispatch(createEvidenceItem(newItem))
    setActiveGapIndex(null)
    setEvidenceTypeInput('')
    setNotesInput('')
  }

  const handleRerunRCA = async () => {
    setIsRcaRunning(true)
    try {
      const deviationId = 1
      const response = await fetch(`/api/ai/${deviationId}/rca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraction: {
            product_name: deviation.fields.productName,
            batch_lot_number: deviation.fields.batchLotNumber,
            description: deviation.fields.description,
            severity: deviation.fields.severity,
            site_block: deviation.fields.siteBlock,
            raw_text: deviation.fields.sourceDocumentText || deviation.fields.description,
            extraction_confidence: 0.95,
            missing_fields: []
          },
          existing_evidence: evidence.items,
          method: rca.selectedMethod || 'five_whys'
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.rca) {
          const rcaData = {
            id: rca.investigation?.id || -1,
            deviation_id: rca.investigation?.deviation_id || 1,
            method: rca.selectedMethod,
            status: 'In Progress' as const,
            ai_generated: true,
            reviewed_by_user: false,
            confirmed_root_cause: rca.investigation?.confirmed_root_cause || null,
            confidence_notes: `Re-evaluated with updated evidence. Confidence: ${Math.round(data.rca.confidence_score * 100)}%. ${data.rca.evidence_support_notes}`,
            five_whys_steps: rca.investigation?.five_whys_steps || [],
            fishbone_causes: rca.investigation?.fishbone_causes || [],
            root_cause_proposals: rca.investigation?.root_cause_proposals || [],
          }
          dispatch(populateRCAFromAI(rcaData))
        }
      }
    } catch (error) {
      console.error('Failed to re-run RCA:', error)
    } finally {
      setIsRcaRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Evidence Gaps Callout Banner */}
      {evidenceGaps.length > 0 && (
        <div className="p-5 bg-amber-500/10 rounded-2xl border border-amber-500/30 shadow-sm">
          <div className="flex items-center space-x-2.5 mb-2.5">
            <span className="text-xl">⚠️</span>
            <h4 className="font-bold text-amber-400 text-sm tracking-wide">Evidence Gaps Identified by AI</h4>
          </div>
          <p className="text-xs text-amber-300/80 mb-4 leading-relaxed">
            The AI Copilot has flagged missing information or documents needed to validate this investigation.
          </p>

          <div className="space-y-3">
            {evidenceGaps.map((gap, index) => {
              const suggestedType = suggestedTypes[index] || 'Batch Record / Log'
              const isAdding = activeGapIndex === index

              return (
                <div key={index} className="p-3.5 bg-[#0D0D0D] rounded-xl border border-white/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-200">{gap}</p>
                      <span className="inline-block mt-1.5 text-[10px] bg-[#D5FF40]/10 text-[#D5FF40] border border-[#D5FF40]/30 px-2.5 py-0.5 rounded-full font-mono">
                        Suggested type: {suggestedType}
                      </span>
                    </div>
                    {!isAdding ? (
                      <button
                        onClick={() => {
                          setActiveGapIndex(index)
                          setEvidenceTypeInput(suggestedType)
                        }}
                        className="px-3 py-1.5 bg-[#D5FF40] text-gray-900 rounded-full text-xs font-semibold hover:bg-[#c2eb35] flex-shrink-0 ml-3 transition-all"
                      >
                        + Add Evidence
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveGapIndex(null)}
                        className="text-gray-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {isAdding && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 mb-1">Evidence Type</label>
                        <input
                          type="text"
                          value={evidenceTypeInput}
                          onChange={(e) => setEvidenceTypeInput(e.target.value)}
                          className="w-full p-2.5 text-xs bg-[#1A1A1A] border border-white/10 text-gray-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 mb-1">Notes / File Reference</label>
                        <input
                          type="text"
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="e.g. Attached file or document reference number"
                          className="w-full p-2.5 text-xs bg-[#1A1A1A] border border-white/10 text-gray-200 rounded-xl"
                        />
                      </div>
                      <div className="flex space-x-2 pt-1">
                        <button
                          onClick={() => handleQuickAdd(gap, evidenceTypeInput)}
                          className="px-4 py-1.5 bg-[#D5FF40] text-gray-900 rounded-full text-xs font-semibold hover:bg-[#c2eb35]"
                        >
                          Save & Mark Collected
                        </button>
                        <button
                          onClick={() => setActiveGapIndex(null)}
                          className="px-4 py-1.5 bg-[#1A1A1A] text-gray-300 border border-white/10 rounded-full text-xs font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {riskFlags.length > 0 && (
            <div className="mt-4 p-3.5 bg-red-950/40 rounded-xl border border-red-500/30">
              <span className="text-xs font-bold text-red-400 block mb-1">Compliance & Quality Risk Flags:</span>
              <ul className="list-disc list-inside text-xs text-red-300 space-y-1">
                {riskFlags.map((risk, i) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Re-run RCA Button */}
      {evidence.items.some(item => item.collected) && (
        <div className="flex items-center justify-between p-4 bg-[#2A2A2A] rounded-2xl border border-white/10">
          <div>
            <h5 className="font-semibold text-white text-sm">New Evidence Collected</h5>
            <p className="text-xs text-gray-400 mt-0.5">Re-evaluate investigation confidence and root cause support based on newly attached evidence.</p>
          </div>
          <button
            onClick={handleRerunRCA}
            disabled={isRcaRunning}
            className="px-5 py-2.5 bg-[#D5FF40] text-gray-900 rounded-full text-xs font-semibold hover:bg-[#c2eb35] disabled:opacity-50 flex items-center space-x-2 flex-shrink-0 ml-4 transition-all shadow-md shadow-[#D5FF40]/10"
          >
            {isRcaRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-900 border-t-transparent"></div>
                <span>Re-running RCA...</span>
              </>
            ) : (
              <span>🔄 Re-run RCA Investigation</span>
            )}
          </button>
        </div>
      )}

      {/* Evidence Checklist Items */}
      <div className="bg-[#2A2A2A] rounded-2xl border border-white/10 p-5 shadow-lg">
        <h4 className="font-bold text-white mb-4 text-sm tracking-wide">Evidence Checklist Items</h4>
        {evidence.items.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-xs">
            Evidence items will appear here after AI processing or manual entry
          </p>
        ) : (
          <div className="space-y-3">
            {evidence.items.map((item) => (
              <div
                key={item.id}
                className={`flex items-start p-3.5 rounded-xl border transition-colors bg-[#0D0D0D] ${
                  item.is_ai_flagged_missing
                    ? 'border-amber-500/30'
                    : item.collected
                    ? 'border-emerald-500/30'
                    : 'border-white/10'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.collected}
                  onChange={() => handleToggleCollected(item)}
                  className="h-4 w-4 text-[#D5FF40] rounded border-white/20 bg-[#1A1A1A] mt-1 cursor-pointer accent-[#D5FF40]"
                />
                <div className="ml-3.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs">{item.evidence_type}</span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
                      item.collected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-[#1A1A1A] text-gray-400 border border-white/10'
                    }`}>
                      {item.collected ? 'Collected' : 'Pending'}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">{item.description}</p>
                  )}
                  {item.notes && (
                    <p className="text-[11px] text-[#D5FF40] mt-1.5 italic">Note: {item.notes}</p>
                  )}
                  {item.source && (
                    <p className="text-[10px] text-gray-400 mt-1">Source: {item.source}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
