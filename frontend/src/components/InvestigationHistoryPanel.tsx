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
    <div className="h-full flex flex-col bg-[#0D0D0D] p-8 overflow-auto">
      <div className="mb-6 pb-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-white tracking-wide">Investigation History & Audit Trail</h2>
        <p className="text-sm text-gray-400 mt-1">Chronological timeline of all AI suggestions, human edits, and confirmations.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading audit history...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-[#1A1A1A] rounded-2xl border border-white/10">
          <p>No audit events recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`p-5 rounded-2xl border-l-4 shadow-md bg-[#1A1A1A] border border-white/10 ${
                log.source === 'ai' ? 'border-l-[#D5FF40]' : 'border-l-emerald-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  log.source === 'ai' ? 'bg-[#D5FF40]/10 text-[#D5FF40] border border-[#D5FF40]/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {log.source === 'ai' ? 'AI Suggestion' : 'Human Action'}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {new Date(log.changed_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-200 font-medium mt-2">
                {formatPlainLanguage(log)}
              </p>
              <div className="mt-3 text-xs text-gray-400 flex items-center space-x-6">
                <span>Entity: <strong className="text-gray-300">{log.entity_type}</strong> (ID: {log.entity_id})</span>
                <span>Field: <strong className="text-gray-300">{log.field_changed}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
