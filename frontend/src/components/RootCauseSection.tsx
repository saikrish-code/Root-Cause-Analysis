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
      <div className="p-4 bg-[#2A2A2A] rounded-2xl border border-white/10">
        <p className="text-xs text-gray-300 leading-relaxed">
          <strong className="text-white">Root Cause & Contributing Factors:</strong> Review AI-proposed causes below. Link to evidence, confirm valid causes, edit where needed, or reject unsupported items.
        </p>
      </div>

      {proposals.length === 0 ? (
        <div className="text-center py-10 bg-[#2A2A2A] rounded-2xl border border-white/10">
          <p className="text-gray-400 text-sm">No root cause proposals generated yet. Complete AI analysis or add manually.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => {
            const supportingEvidence = getEvidenceDetails(proposal.supporting_evidence_ids)
            const hasEvidence = supportingEvidence.length > 0 || (proposal.supporting_evidence_ids && proposal.supporting_evidence_ids !== '[]')

            return (
              <div
                key={proposal.id}
                className={`p-5 rounded-2xl border transition-all bg-[#2A2A2A] ${
                  proposal.status === 'confirmed'
                    ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      proposal.is_primary ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-[#0D0D0D] text-gray-300 border border-white/10'
                    }`}>
                      {proposal.is_primary ? 'Primary Root Cause' : 'Contributing Factor'}
                    </span>
                    {!hasEvidence && (
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold flex items-center">
                        ⚠️ Unsupported — needs evidence
                      </span>
                    )}
                    {proposal.status === 'confirmed' && (
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                        ✓ Confirmed by User
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    Confidence: {proposal.confidence_score}%
                  </span>
                </div>

                {editingId !== proposal.id ? (
                  <div className="mb-3">
                    <h5 className="font-bold text-white text-base mb-1.5 leading-snug">
                      {proposal.cause_text}
                    </h5>
                    <p className="text-xs text-gray-300 mb-3 leading-relaxed">
                      <strong className="text-gray-400">AI Rationale:</strong> {proposal.ai_rationale}
                    </p>
                  </div>
                ) : (
                  <div className="mb-3 space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-3 bg-[#0D0D0D] border border-white/10 text-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#D5FF40]"
                      rows={2}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSaveEdit(proposal.id)}
                        className="px-4 py-1.5 bg-[#D5FF40] text-gray-900 rounded-full text-xs font-semibold hover:bg-[#c2eb35]"
                      >
                        Save Edit
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-1.5 bg-[#1A1A1A] text-gray-300 border border-white/10 rounded-full text-xs font-medium hover:bg-[#333333]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="mb-4 p-3.5 bg-[#0D0D0D] rounded-xl border border-white/10">
                  <span className="text-xs font-semibold text-gray-400 block mb-1">Supporting Evidence:</span>
                  {hasEvidence && supportingEvidence.length > 0 ? (
                    <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                      {supportingEvidence.map((ev) => (
                        <li key={ev.id}>
                          <strong className="text-white">{ev.evidence_type}</strong>: {ev.description || 'No description'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-amber-400 italic">No evidence items linked. Verification required.</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                  {proposal.status !== 'confirmed' && (
                    <button
                      onClick={() => handleConfirm(proposal.id)}
                      className="px-4 py-2 bg-[#D5FF40] text-gray-900 rounded-full text-xs font-semibold hover:bg-[#c2eb35] flex items-center transition-all shadow-sm"
                    >
                      ✓ Confirm
                    </button>
                  )}
                  {editingId !== proposal.id && (
                    <button
                      onClick={() => handleStartEdit(proposal)}
                      className="px-4 py-2 bg-[#1A1A1A] text-gray-300 border border-white/10 rounded-full text-xs font-medium hover:bg-[#333333]"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleReject(proposal.id)}
                    className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-semibold hover:bg-red-500/20"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 p-6 bg-[#2A2A2A] rounded-2xl border border-white/10 shadow-lg">
        <h4 className="font-bold text-white mb-1.5 text-base flex items-center justify-between">
          <span>Confirmed Root Cause Summary</span>
          <span className="text-xs bg-[#D5FF40]/10 text-[#D5FF40] border border-[#D5FF40]/30 px-3 py-0.5 rounded-full font-semibold">
            Required for CAPA Generation
          </span>
        </h4>
        <p className="text-xs text-gray-400 mb-4">
          This summary must be explicitly set by user action and will serve as the baseline for CAPA recommendations.
        </p>

        <textarea
          value={summaryInput}
          onChange={(e) => setSummaryInput(e.target.value)}
          placeholder="Enter the final confirmed root cause summary..."
          className="w-full p-3.5 bg-[#0D0D0D] text-gray-200 border border-white/10 rounded-xl text-xs mb-4 focus:ring-2 focus:ring-[#D5FF40]"
          rows={3}
        />

        <button
          onClick={handleSetConfirmedSummary}
          disabled={!summaryInput.trim()}
          className="px-6 py-2.5 bg-[#D5FF40] text-gray-900 rounded-full text-xs font-semibold hover:bg-[#c2eb35] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#D5FF40]/10 transition-all"
        >
          Save Confirmed Root Cause
        </button>

        {investigation?.confirmed_root_cause && (
          <div className="mt-4 p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-semibold">
              ✓ Confirmed Root Cause saved and locked for CAPA generation.
            </span>
            <span className="text-xs text-emerald-300 font-mono">
              Status: Completed
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
