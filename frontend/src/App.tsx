import React, { useState } from 'react'
import { InvestigationScreen } from './components/InvestigationScreen'

function App() {
  const [showInvestigation, setShowInvestigation] = useState(false)

  if (showInvestigation) {
    return <InvestigationScreen />
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center p-6 text-gray-200">
      <div className="max-w-xl w-full bg-[#1A1A1A] rounded-3xl shadow-2xl p-8 border border-white/10">
        <h1 className="text-3xl font-bold text-white mb-2">Pharmaceutical Quality RCA</h1>
        <p className="text-gray-400 mb-8 font-normal">
          Root Cause Analysis & CAPA Management System
        </p>

        <button
          onClick={() => setShowInvestigation(true)}
          className="w-full px-6 py-3.5 bg-[#D5FF40] text-gray-900 rounded-full hover:bg-[#c2eb35] font-semibold transition-all shadow-lg shadow-[#D5FF40]/10 mb-6"
        >
          Start New Investigation
        </button>

        <div className="border-t border-white/10 pt-4 text-xs text-gray-500 text-center font-normal">
          Stack: React (Vite) + Redux Toolkit + TypeScript + Tailwind + FastAPI + PostgreSQL + LangGraph/Groq
        </div>
      </div>
    </div>
  )
}

export default App
