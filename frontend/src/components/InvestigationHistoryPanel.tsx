import React, { useEffect, useState } from 'react'

interface AuditLogEntry {
  id: number
  entity_type: string
  entity_id: number
  field_changed: string
  old_value: string | null
  new_value: string | null
  changed_by: string | null
  source: 'ai' | 'user'
  changed_at: string
}

export const InvestigationHistoryPanel: React.FC<{ deviationId: number }> = ({ deviationId }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/deviations/${deviationId}/audit`)
      .then(res => res.json())
      .then(data => {
        setLogs(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch audit log:', err)
        setLoading(false)
      })
  }, [deviationId])

  const formatPlainLanguage = (log: AuditLogEntry) => {
    const actor = log.source === 'ai' ? 'AI Copilot' : (log.changed_by || 'User')
    const action = log.source === 'ai' ? 'suggested' : 'updated/confirmed'
    const dateStr = new Date(log.changed_at).toLocaleString()

    if (log.field_changed === 'is_ai_suggested') {
      return `${actor} suggested ${log.entity_type} item — confirmed on ${dateStr}`
    }

    if (log.field_changed === 'confirmed_root_cause') {
      return `${actor} finalized root cause: "${log.new_value}" on ${dateStr}`
    }

    return `${actor} ${action} ${log.entity_type}.${log.field_changed} from "${log.old_value || 'None'}" to "${log.new_value || 'None'}" on ${dateStr}`
  }

  return (
    <div className="h-full flex flex-col bg-white p-6 overflow-auto">
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Investigation History & Audit Trail</h2>
        <p className="text-sm text-gray-500">Chronological timeline of all AI suggestions, human edits, and confirmations.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading audit history...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
          <p>No audit events recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`p-4 rounded-xl border-l-4 shadow-sm bg-white border border-gray-200 ${
                log.source === 'ai' ? 'border-l-blue-500' : 'border-l-green-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  log.source === 'ai' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {log.source === 'ai' ? 'AI Suggestion' : 'Human Action'}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {new Date(log.changed_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-800 font-medium mt-2">
                {formatPlainLanguage(log)}
              </p>
              <div className="mt-2 text-xs text-gray-500 flex items-center space-x-4">
                <span>Entity: {log.entity_type} (ID: {log.entity_id})</span>
                <span>Field: {log.field_changed}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}