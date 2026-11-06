import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import {
  createEvidenceItem,
  updateEvidenceItem,
  markAsCollected,
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
      const deviationId = 1 // default or from route
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
            confirmed_root_cause: data.rca.root_cause,
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
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 shadow-sm">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-xl">⚠️</span>
            <h4 className="font-bold text-amber-900 text-base">Evidence Gaps Identified by AI</h4>
          </div>
          <p className="text-xs text-amber-800 mb-3">
            The AI Copilot has flagged missing information or documents needed to validate this investigation.
          </p>

          <div className="space-y-3">
            {evidenceGaps.map((gap, index) => {
              const suggestedType = suggestedTypes[index] || 'Batch Record / Log'
              const isAdding = activeGapIndex === index

              return (
                <div key={index} className="p-3 bg-white rounded-lg border border-amber-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{gap}</p>
                      <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono">
                        Suggested type: {suggestedType}
                      </span>
                    </div>
                    {!isAdding ? (
                      <button
                        onClick={() => {
                          setActiveGapIndex(index)
                          setEvidenceTypeInput(suggestedType)
                        }}
                        className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 flex-shrink-0 ml-2"
                      >
                        + Add Evidence
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveGapIndex(null)}
                        className="text-gray-400 hover:text-gray-600 text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {isAdding && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Evidence Type</label>
                        <input
                          type="text"
                          value={evidenceTypeInput}
                          onChange={(e) => setEvidenceTypeInput(e.target.value)}
                          className="w-full p-2 text-xs border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notes / File Reference</label>
                        <input
                          type="text"
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="e.g. Attached file or document reference number"
                          className="w-full p-2 text-xs border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleQuickAdd(gap, evidenceTypeInput)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                        >
                          Save & Mark Collected
                        </button>
                        <button
                          onClick={() => setActiveGapIndex(null)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium"
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
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <span className="text-xs font-bold text-red-900 block mb-1">Compliance & Quality Risk Flags:</span>
              <ul className="list-disc list-inside text-xs text-red-800 space-y-1">
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
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div>
            <h5 className="font-medium text-blue-900 text-sm">New Evidence Collected</h5>
            <p className="text-xs text-blue-700">Re-evaluate investigation confidence and root cause support based on newly attached evidence.</p>
          </div>
          <button
            onClick={handleRerunRCA}
            disabled={isRcaRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 flex-shrink-0 ml-4"
          >
            {isRcaRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Re-running RCA...</span>
              </>
            ) : (
              <span>🔄 Re-run RCA Investigation</span>
            )}
          </button>
        </div>
      )}

      {/* Evidence Checklist Items */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-800 mb-4">Evidence Checklist Items</h4>
        {evidence.items.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">
            Evidence items will appear here after AI processing or manual entry
          </p>
        ) : (
          <div className="space-y-3">
            {evidence.items.map((item) => (
              <div
                key={item.id}
                className={`flex items-start p-3 rounded-lg border transition-colors ${
                  item.is_ai_flagged_missing
                    ? 'bg-amber-50 border-amber-200'
                    : item.collected
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.collected}
                  onChange={() => handleToggleCollected(item)}
                  className="h-4 w-4 text-green-600 rounded border-gray-300 mt-1 cursor-pointer"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800 text-sm">{item.evidence_type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      item.collected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.collected ? 'Collected' : 'Pending'}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-blue-700 mt-1 italic">Note: {item.notes}</p>
                  )}
                  {item.source && (
                    <p className="text-xs text-gray-500 mt-1">Source: {item.source}</p>
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