import React, { useEffect, useState } from 'react'

function App() {
  const [healthStatus, setHealthStatus] = useState<string>('Checking...')
  const [apiMessage, setApiMessage] = useState<string>('')

  useEffect(() => {
    fetch('http://localhost:8000/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHealthStatus(data.status || 'ok')
        setApiMessage(data.module || 'Quality RCA')
      })
      .catch((err) => {
        setHealthStatus('error')
        setApiMessage(err.message)
      })
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-xl shadow-md p-8 border border-slate-200">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Hello RCA</h1>
        <p className="text-slate-600 mb-6">
          Pharmaceutical Quality Root Cause Analysis Scaffolding
        </p>

        <div className="bg-slate-100 rounded-lg p-4 mb-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Backend Health Status:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              healthStatus === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {healthStatus}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Module Info:</span>
            <span className="text-sm text-slate-900 font-mono">{apiMessage || 'N/A'}</span>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 text-xs text-slate-500 text-center">
          Stack: React (Vite) + Redux Toolkit + TypeScript + Tailwind + FastAPI + PostgreSQL + LangGraph/Groq
        </div>
      </div>
    </div>
  )
}

export default App
