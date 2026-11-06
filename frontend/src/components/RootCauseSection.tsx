import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import {
  confirmProposal,
  editProposal,
  rejectProposal,
  setConfirmedRootCause,
  RootCauseProposal,
} from '../store/rcaSlice'

export const RootCauseSection: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const rca = useSelector((state: RootState) => state.rca)
  const evidence = useSelector((state: RootState) => state.evidence)

  const investigation = rca.investigation
  const proposals = investigation?.root_cause_proposals || []

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [summaryInput, setSummaryInput] = useState(investigation?.confirmed_root_cause || '')

  const handleConfirm = (id: number) => {
    dispatch(confirmProposal(id))
  }

  const handleStartEdit = (proposal: RootCauseProposal) => {
    setEditingId(proposal.id)
    setEditText(proposal.cause_text)
  }

  const handleSaveEdit = (id: number) => {
    if (editText.trim()) {
      dispatch(editProposal({ id, cause_text: editText.trim() }))
    }
    setEditingId(null)
  }

  const handleReject = (id: number) => {
    dispatch(rejectProposal(id))
  }

  const handleSetConfirmedSummary = () => {
    if (summaryInput.trim()) {
      dispatch(setConfirmedRootCause(summaryInput.trim()))
    }
  }

  const getEvidenceDetails = (evidenceIdsStr: string | null) => {
    if (!evidenceIdsStr) return []
    try {
      const ids = JSON.parse(evidenceIdsStr) as number[]
      return evidence.items.filter(item => ids.includes(item.id))
    } catch {
      return []
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Root Cause & Contributing Factors:</span> Review AI-proposed causes below. Link to evidence, confirm valid causes, edit where needed, or reject unsupported items.
        </p>
      </div>

      {proposals.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
          <p>No root cause proposals generated yet. Complete AI analysis or add manually.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => {
            const supportingEvidence = getEvidenceDetails(proposal.supporting_evidence_ids)
            const hasEvidence = supportingEvidence.length > 0 || (proposal.supporting_evidence_ids && proposal.supporting_evidence_ids !== '[]')

            return (
              <div
                key={proposal.id}
                className={`p-4 rounded-lg border-2 bg-white ${
                  proposal.status === 'confirmed'
                    ? 'border-green-400 ring-1 ring-green-200'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      proposal.is_primary ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {proposal.is_primary ? 'Primary Root Cause' : 'Contributing Factor'}
                    </span>
                    {!hasEvidence && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium flex items-center">
                        ⚠️ Unsupported — needs evidence
                      </span>
                    )}
                    {proposal.status === 'confirmed' && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                        ✓ Confirmed by User
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    Confidence: {proposal.confidence_score}%
                  </span>
                </div>

                {editingId !== proposal.id ? (
                  <div className="mb-3">
                    <h5 className="font-semibold text-gray-900 text-base mb-1">
                      {proposal.cause_text}
                    </h5>
                    <p className="text-sm text-gray-600 mb-3">
                      <span className="font-medium text-gray-700">AI Rationale:</span> {proposal.ai_rationale}
                    </p>
                  </div>
                ) : (
                  <div className="mb-3 space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSaveEdit(proposal.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                      >
                        Save Edit
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs font-medium text-gray-700 block mb-1">Supporting Evidence:</span>
                  {hasEvidence && supportingEvidence.length > 0 ? (
                    <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                      {supportingEvidence.map((ev) => (
                        <li key={ev.id}>
                          <span className="font-medium">{ev.evidence_type}</span>: {ev.description || 'No description'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-amber-700 italic">No evidence items linked. Verification required.</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                  {proposal.status !== 'confirmed' && (
                    <button
                      onClick={() => handleConfirm(proposal.id)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 flex items-center"
                    >
                      ✓ Confirm
                    </button>
                  )}
                  {editingId !== proposal.id && (
                    <button
                      onClick={() => handleStartEdit(proposal)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg text-xs font-medium hover:bg-gray-300"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleReject(proposal.id)}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 p-6 bg-white rounded-xl border-2 border-green-200 shadow-sm">
        <h4 className="font-bold text-gray-900 mb-2 flex items-center">
          <span>Confirmed Root Cause Summary</span>
          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-normal">
            Required for CAPA Generation
          </span>
        </h4>
        <p className="text-xs text-gray-500 mb-4">
          This summary must be explicitly set by user action and will serve as the baseline for CAPA recommendations.
        </p>

        <textarea
          value={summaryInput}
          onChange={(e) => setSummaryInput(e.target.value)}
          placeholder="Enter the final confirmed root cause summary..."
          className="w-full p-3 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-green-500"
          rows={3}
        />

        <button
          onClick={handleSetConfirmedSummary}
          disabled={!summaryInput.trim()}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Confirmed Root Cause
        </button>

        {investigation?.confirmed_root_cause && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center justify-between">
            <span className="text-xs text-green-800 font-medium">
              ✓ Confirmed Root Cause saved and locked for CAPA generation.
            </span>
            <span className="text-xs text-green-700 font-mono">
              Status: Completed
            </span>
          </div>
        )}
      </div>
    </div>
  )
}