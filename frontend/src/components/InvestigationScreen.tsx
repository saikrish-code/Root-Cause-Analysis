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
      // Simulate saving draft state to backend
      await new Promise(resolve => setTimeout(resolve, 800))
      setSaveStatus('✓ Investigation saved successfully!')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      setSaveStatus('Failed to save investigation')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold text-gray-900">Quality RCA Module</h1>
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('investigation')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'investigation'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Investigation Form
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Investigation History & Audit Trail
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          {saveStatus && (
            <span className="text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
              {saveStatus}
            </span>
          )}
          <button
            onClick={handleSaveAll}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 shadow-sm"
          >
            💾 Save Investigation
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'investigation' ? (
          <>
            <div className="flex-1 flex flex-col overflow-hidden">
              <RCAForm />
            </div>
            <div className="w-96 flex-shrink-0 border-l border-gray-200 overflow-hidden">
              <AICopilotPanel />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-hidden">
            <InvestigationHistoryPanel deviationId={1} />
          </div>
        )}
      </div>
    </div>
  )
}