import React, { useState } from 'react'
import { RCAForm } from './RCAForm'
import { AICopilotPanel } from './AICopilotPanel'
import { InvestigationHistoryPanel } from './InvestigationHistoryPanel'

export const InvestigationScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'investigation' | 'history'>('investigation')
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  const handleSaveAll = async () => {
    setSaveStatus('Saving...')
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      setSaveStatus('✓ Investigation saved successfully!')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      setSaveStatus('Failed to save investigation')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#0D0D0D] text-gray-200">
      <header className="bg-[#1A1A1A] border-b border-white/10 px-6 py-3.5 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center space-x-6">
          <h1 className="text-lg font-bold text-white tracking-wide">Quality RCA Module</h1>
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('investigation')}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'investigation'
                  ? 'bg-[#D5FF40] text-gray-900 shadow-md shadow-[#D5FF40]/10'
                  : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
              }`}
            >
              Investigation Form
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-[#D5FF40] text-gray-900 shadow-md shadow-[#D5FF40]/10'
                  : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
              }`}
            >
              History & Audit Trail
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          {saveStatus && (
            <span className="text-xs font-semibold text-[#D5FF40] bg-[#D5FF40]/10 px-3.5 py-1.5 rounded-full border border-[#D5FF40]/30">
              {saveStatus}
            </span>
          )}
          <button
            onClick={handleSaveAll}
            className="px-5 py-2 bg-[#1A1A1A] border border-[#D5FF40] text-[#D5FF40] hover:bg-[#D5FF40] hover:text-gray-900 rounded-full text-sm font-semibold transition-all shadow-sm"
          >
            Save Investigation
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'investigation' ? (
          <>
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0D0D0D]">
              <RCAForm />
            </div>
            <div className="w-96 flex-shrink-0 border-l border-white/10 overflow-hidden bg-[#1A1A1A]">
              <AICopilotPanel />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-hidden bg-[#0D0D0D]">
            <InvestigationHistoryPanel deviationId={1} />
          </div>
        )}
      </div>
    </div>
  )
}
