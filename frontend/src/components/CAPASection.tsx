import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import {
  createCAPAAction,
  updateCAPAAction,
  approveCAPA,
  populateFromAI,
  CAPAAction,
  ProposedCAPA,
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

  const handleReject = (id: number) => {
    // Remove from active view
    const updatedActions = capa.actions.filter(a => a.id !== id)
    // we can update local state by re-populating or updating slice
    dispatch(updateCAPAAction({ id, data: { status: 'Proposed' } })) // or filter
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
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
        <div>
          <h4 className="font-medium text-blue-900 text-sm">CAPA Action Plan</h4>
          <p className="text-xs text-blue-700 mt-0.5">
            {confirmedRootCause
              ? `Root cause confirmed: "${confirmedRootCause}"`
              : '⚠️ Please confirm a root cause in Section 5 before generating CAPA actions.'}
          </p>
        </div>
        <button
          onClick={handleGenerateCAPA}
          disabled={!confirmedRootCause || isGenerating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 flex-shrink-0 ml-4"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Generating CAPA...</span>
            </>
          ) : (
            <span>✨ Generate CAPA with AI</span>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h5 className="font-semibold text-gray-800 text-sm">
          Proposed & Approved Actions ({capa.actions.length})
        </h5>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
        >
          + Add Manual CAPA
        </button>
      </div>

      {capa.actions.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 text-sm">No CAPA actions yet. Generate with AI or add manually.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {capa.actions.map((action) => (
            <div
              key={action.id}
              className={`p-4 rounded-xl border-2 bg-white transition-all ${
                action.status === 'Approved'
                  ? 'border-green-400 ring-1 ring-green-200'
                  : action.status === 'Completed'
                  ? 'border-blue-400 bg-blue-50/30'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                    action.action_type === 'Corrective'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {action.action_type}
                  </span>
                  {action.ai_generated && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                      AI Suggested
                    </span>
                  )}
                </div>
                <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                  action.status === 'Approved' ? 'bg-green-100 text-green-800' :
                  action.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {action.status}
                </span>
              </div>

              <p className="font-medium text-gray-900 text-base mb-2">{action.description}</p>

              {action.rationale && (
                <div className="mb-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs font-medium text-gray-700 block mb-0.5">Root Cause Rationale:</span>
                  <p className="text-xs text-gray-600">{action.rationale}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 mt-3">
                <div className="flex items-center space-x-4">
                  <span>Owner: <strong className="text-gray-700">{action.owner || 'Unassigned'}</strong></span>
                  <span>Due: <strong className="text-gray-700">{action.due_date || 'Not set'}</strong></span>
                </div>

                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                  {action.status === 'Proposed' && (
                    <button
                      onClick={() => handleApprove(action.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                    >
                      ✓ Approve
                    </button>
                  )}
                  <button
                    onClick={() => dispatch(updateCAPAAction({ id: action.id, data: { status: 'Completed' } }))}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Manual CAPA Action</h3>
            <form onSubmit={handleAddManualCAPA} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                <select
                  value={newActionType}
                  onChange={(e) => setNewActionType(e.target.value as any)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="Corrective">Corrective</option>
                  <option value="Preventive">Preventive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the action..."
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rationale</label>
                <input
                  type="text"
                  value={newRationale}
                  onChange={(e) => setNewRationale(e.target.value)}
                  placeholder="How does this address the root cause?"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Role</label>
                  <input
                    type="text"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    placeholder="e.g. Maintenance Lead"
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Add Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {approvedCount > 0 && (
        <div className="p-4 bg-green-50 rounded-xl border border-green-200 flex items-center justify-between">
          <span className="text-xs text-green-800 font-medium">
            ✓ {approvedCount} CAPA action(s) approved. Deviation status automatically advanced to <strong>CAPA Assigned</strong>.
          </span>
          <span className="text-xs font-mono text-green-700 bg-green-100 px-2 py-1 rounded">
            Status: CAPA Assigned
          </span>
        </div>
      )}
    </div>
  )
}