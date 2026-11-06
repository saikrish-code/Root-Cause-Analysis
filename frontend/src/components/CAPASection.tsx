import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import {
  createCAPAAction,
  updateCAPAAction,
  approveCAPA,
  populateFromAI,
} from '../store/capaSlice'
import { updateField } from '../store/deviationSlice'

export const CAPASection: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const capa = useSelector((state: RootState) => state.capa)
  const rca = useSelector((state: RootState) => state.rca)
  const deviation = useSelector((state: RootState) => state.deviation)

  const [isGenerating, setIsGenerating] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newActionType, setNewActionType] = useState<'Corrective' | 'Preventive'>('Corrective')
  const [newDescription, setNewDescription] = useState('')
  const [newRationale, setNewRationale] = useState('')
  const [newOwner, setNewOwner] = useState('')
  const [newDueDate, setNewDueDate] = useState('')

  const confirmedRootCause = rca.investigation?.confirmed_root_cause

  const handleGenerateCAPA = async () => {
    if (!confirmedRootCause) return
    setIsGenerating(true)

    try {
      const deviationId = 1
      const response = await fetch(`/api/ai/${deviationId}/capa`, {
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
          rca: {
            method_used: rca.selectedMethod,
            root_cause_proposals: [],
            confidence_summary: "Confirmed root cause",
            evidence_support_notes: confirmedRootCause,
            limitations: ""
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.capa && data.capa.proposed_capas) {
          dispatch(populateFromAI(data.capa.proposed_capas))
        }
      }
    } catch (error) {
      console.error('Failed to generate CAPA:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApprove = (id: number) => {
    dispatch(approveCAPA(id))
    dispatch(updateField({ field: 'status', value: 'CAPA Assigned' }))
  }

  const handleAddManualCAPA = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDescription.trim()) return

    const newAction = {
      action_type: newActionType,
      description: newDescription.trim(),
      rationale: newRationale.trim() || `Addresses root cause: ${confirmedRootCause}`,
      owner: newOwner.trim() || 'Quality Assurance',
      due_date: newDueDate || null,
      status: 'Proposed' as const,
      ai_generated: false,
      reviewed_by_user: true,
    }

    dispatch(createCAPAAction(newAction))
    setNewDescription('')
    setNewRationale('')
    setNewOwner('')
    setNewDueDate('')
    setShowAddModal(false)
  }

  const approvedCount = capa.actions.filter(a => a.status === 'Approved' || a.status === 'Completed').length

  return (
    <div className="space-y-6">
      <div className="p-5 bg-[#2A2A2A] rounded-2xl border border-white/10 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-white text-sm tracking-wide">CAPA Action Plan</h4>
          <p className="text-xs text-gray-400 mt-1">
            {confirmedRootCause
              ? `Root cause confirmed: "${confirmedRootCause}"`
              : '⚠️ Please confirm a root cause in Section 5 before generating CAPA actions.'}
          </p>
        </div>
        <button
          onClick={handleGenerateCAPA}
          disabled={!confirmedRootCause || isGenerating}
          className="px-5 py-2.5 bg-[#D5FF40] text-gray-900 rounded-full text-xs font-semibold hover:bg-[#c2eb35] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 flex-shrink-0 ml-4 transition-all shadow-md shadow-[#D5FF40]/10"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-900 border-t-transparent"></div>
              <span>Generating CAPA...</span>
            </>
          ) : (
            <span>✨ Generate CAPA with AI</span>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h5 className="font-bold text-white text-xs uppercase tracking-wider">
          Proposed & Approved Actions ({capa.actions.length})
        </h5>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-1.5 bg-[#2A2A2A] border border-white/10 text-gray-200 rounded-full text-xs font-semibold hover:bg-[#333333] transition-all"
        >
          + Add Manual CAPA
        </button>
      </div>

      {capa.actions.length === 0 ? (
        <div className="text-center py-10 bg-[#2A2A2A] rounded-2xl border border-white/10">
          <p className="text-gray-400 text-xs">No CAPA actions yet. Generate with AI or add manually.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {capa.actions.map((action) => (
            <div
              key={action.id}
              className={`p-5 rounded-2xl border transition-all bg-[#2A2A2A] ${
                action.status === 'Approved'
                  ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
                  : action.status === 'Completed'
                  ? 'border-blue-500/50 bg-blue-950/20'
                  : 'border-white/10'
              }`}
            >
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex items-center space-x-2.5">
                  <span className={`px-3 py-0.5 rounded-full text-xs font-semibold ${
                    action.action_type === 'Corrective'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {action.action_type}
                  </span>
                  {action.ai_generated && (
                    <span className="px-3 py-0.5 bg-[#D5FF40]/10 text-[#D5FF40] border border-[#D5FF40]/30 rounded-full text-xs font-semibold">
                      AI Suggested
                    </span>
                  )}
                </div>
                <span className={`px-3 py-0.5 rounded-full text-xs font-semibold ${
                  action.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  action.status === 'Completed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {action.status}
                </span>
              </div>

              <p className="font-bold text-white text-sm mb-2.5 leading-snug">{action.description}</p>

              {action.rationale && (
                <div className="mb-3.5 p-3 bg-[#0D0D0D] rounded-xl border border-white/10">
                  <span className="text-[10px] font-semibold text-gray-400 block mb-0.5 uppercase tracking-wider">Root Cause Rationale:</span>
                  <p className="text-xs text-gray-300 leading-relaxed">{action.rationale}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between text-xs text-gray-400 pt-3 border-t border-white/10 mt-3">
                <div className="flex items-center space-x-6">
                  <span>Owner: <strong className="text-gray-200">{action.owner || 'Unassigned'}</strong></span>
                  <span>Due: <strong className="text-gray-200">{action.due_date || 'Not set'}</strong></span>
                </div>

                <div className="flex items-center space-x-2.5 mt-2 sm:mt-0">
                  {action.status === 'Proposed' && (
                    <button
                      onClick={() => handleApprove(action.id)}
                      className="px-4 py-1.5 bg-[#D5FF40] text-gray-900 rounded-full text-xs font-semibold hover:bg-[#c2eb35] transition-all shadow-sm"
                    >
                      ✓ Approve
                    </button>
                  )}
                  <button
                    onClick={() => dispatch(updateCAPAAction({ id: action.id, data: { status: 'Completed' } }))}
                    className="px-4 py-1.5 bg-[#1A1A1A] text-gray-200 border border-white/10 rounded-full text-xs font-semibold hover:bg-[#333333]"
                  >
                    Mark Complete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl max-w-lg w-full p-8 shadow-2xl text-gray-200">
            <h3 className="text-lg font-bold text-white mb-5">Add Manual CAPA Action</h3>
            <form onSubmit={handleAddManualCAPA} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Action Type</label>
                <select
                  value={newActionType}
                  onChange={(e) => setNewActionType(e.target.value as any)}
                  className="w-full p-3 bg-[#0D0D0D] border border-white/10 text-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#D5FF40]"
                >
                  <option value="Corrective" className="bg-[#1A1A1A]">Corrective</option>
                  <option value="Preventive" className="bg-[#1A1A1A]">Preventive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the action..."
                  className="w-full p-3 bg-[#0D0D0D] border border-white/10 text-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#D5FF40]"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Rationale</label>
                <input
                  type="text"
                  value={newRationale}
                  onChange={(e) => setNewRationale(e.target.value)}
                  placeholder="How does this address the root cause?"
                  className="w-full p-3 bg-[#0D0D0D] border border-white/10 text-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#D5FF40]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Owner Role</label>
                  <input
                    type="text"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    placeholder="e.g. Maintenance Lead"
                    className="w-full p-3 bg-[#0D0D0D] border border-white/10 text-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#D5FF40]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full p-3 bg-[#0D0D0D] border border-white/10 text-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#D5FF40]"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-5 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 bg-[#2A2A2A] text-gray-300 rounded-full text-xs font-semibold hover:bg-[#333333]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D5FF40] text-gray-900 rounded-full text-xs font-semibold hover:bg-[#c2eb35]"
                >
                  Add Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {approvedCount > 0 && (
        <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
          <span className="text-xs text-emerald-400 font-semibold">
            ✓ {approvedCount} CAPA action(s) approved. Deviation status automatically advanced to <strong>CAPA Assigned</strong>.
          </span>
          <span className="text-xs font-mono text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full">
            Status: CAPA Assigned
          </span>
        </div>
      )}
    </div>
  )
}
