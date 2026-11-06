import React, { useState } from 'react'
import { InvestigationScreen } from './components/InvestigationScreen'

function App() {
  const [showInvestigation, setShowInvestigation] = useState(false)

  if (showInvestigation) {
    return <InvestigationScreen />
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-xl shadow-md p-8 border border-slate-200">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Pharmaceutical Quality RCA</h1>
        <p className="text-slate-600 mb-6">
          Root Cause Analysis & CAPA Management System
        </p>

        <button
          onClick={() => setShowInvestigation(true)}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium mb-4"
        >
          Start New Investigation
        </button>

        <div className="border-t border-slate-200 pt-4 text-xs text-slate-500 text-center">
          Stack: React (Vite) + Redux Toolkit + TypeScript + Tailwind + FastAPI + PostgreSQL + LangGraph/Groq
        </div>
      </div>
    </div>
  )
}

export default App
