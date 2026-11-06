import React, { useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import { processWithAI, addMessage, ChatMessage } from '../store/aiSessionSlice'
import { populateFromAI as populateDeviationFromAI } from '../store/deviationSlice'
import { populateFromAI as populateEvidenceFromAI } from '../store/evidenceSlice'
import { populateFromAI as populateRCAFromAI } from '../store/rcaSlice'
import { populateFromAI as populateCAPAFromAI } from '../store/capaSlice'

export const AICopilotPanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const aiSession = useSelector((state: RootState) => state.aiSession)
  const [inputText, setInputText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [aiSession.messages])

  React.useEffect(() => {
    if (aiSession.lastResult && !aiSession.isProcessing) {
      populateFormFromAIResult(aiSession.lastResult)
    }
  }, [aiSession.lastResult, aiSession.isProcessing])

  const populateFormFromAIResult = (result: typeof aiSession.lastResult) => {
    if (!result) return

    if (result.extraction) {
      dispatch(populateDeviationFromAI({
        title: result.extraction.title,
        description: result.extraction.description,
        productName: result.extraction.product_name,
        batchLotNumber: result.extraction.batch_lot_number,
        manufacturingDate: result.extraction.manufacturing_date,
        detectedDate: result.extraction.detected_date,
        siteBlock: result.extraction.site_block,
        severity: result.extraction.severity,
      }))
    }

    if (result.evidence_gap) {
      const evidenceItems = result.evidence_gap.suggested_evidence_types.map((type, index) => ({
        id: -(index + 1),
        deviation_id: 0,
        evidence_type: type,
        description: result.evidence_gap!.missing_information[index] || null,
        source: null,
        collected: false,
        is_ai_flagged_missing: true,
        notes: null,
      }))
      dispatch(populateEvidenceFromAI(evidenceItems))
    }

    if (result.rca) {
      const rcaData = {
        id: -1,
        deviation_id: 0,
        method: result.rca.method_used as 'five_whys' | 'fishbone',
        status: 'In Progress' as const,
        ai_generated: true,
        reviewed_by_user: false,
        confirmed_root_cause: result.rca.root_cause,
        confidence_notes: result.rca.evidence_support_notes,
        five_whys_steps: result.rca.method_used === 'five_whys' ? result.rca.contributing_factors.map((factor, index) => ({
          id: -(index + 1),
          rca_investigation_id: -1,
          step_number: index + 1,
          why_question: null,
          answer: factor,
          is_ai_suggested: true,
          user_edited: false,
        })) : [],
        fishbone_causes: result.rca.method_used === 'fishbone' ? result.rca.contributing_factors.map((factor, index) => ({
          id: -(index + 1),
          rca_investigation_id: -1,
          category: 'Method',
          cause_text: factor,
          is_ai_suggested: true,
          user_edited: false,
        })) : [],
      }
      dispatch(populateRCAFromAI(rcaData))
    }

    if (result.capa && result.capa.proposed_capas) {
      dispatch(populateCAPAFromAI(result.capa.proposed_capas))
    }
  }

  const handleSubmit = async () => {
    if (!inputText.trim() && !selectedFile) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: selectedFile
        ? `Uploaded file: ${selectedFile.name}${inputText ? `\n\n${inputText}` : ''}`
        : inputText,
      timestamp: new Date().toISOString(),
      attachments: selectedFile ? [{ name: selectedFile.name, type: selectedFile.type }] : undefined,
    }
    dispatch(addMessage(userMessage))

    try {
      const result = await dispatch(processWithAI({
        raw_text: inputText || undefined,
        file: selectedFile || undefined,
      })).unwrap()

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateSummaryMessage(result),
        timestamp: new Date().toISOString(),
      }
      dispatch(addMessage(assistantMessage))
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error}`,
        timestamp: new Date().toISOString(),
      }
      dispatch(addMessage(errorMessage))
    }

    setInputText('')
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const generateSummaryMessage = (result: typeof aiSession.lastResult): string => {
    if (!result) return 'Processing complete.'

    const parts: string[] = []

    if (result.extraction) {
      parts.push('✓ Complaint parsed successfully.')
      parts.push(`Extracted: ${result.extraction.title || 'Deviation details'}`)
      if (result.extraction.product_name) {
        parts.push(`Product: ${result.extraction.product_name}`)
      }
      if (result.extraction.batch_lot_number) {
        parts.push(`Batch: ${result.extraction.batch_lot_number}`)
      }
      const missing = result.extraction.missing_fields?.length || 0
      if (missing > 0) {
        parts.push(`⚠️ ${missing} fields could not be extracted`)
      }
    }

    if (result.evidence_gap) {
      parts.push(`\n✓ Identified ${result.evidence_gap.suggested_evidence_types?.length || 0} evidence items to collect`)
    }

    if (result.rca) {
      parts.push(`\n✓ Performed ${result.rca.method_used === 'five_whys' ? '5 Whys' : 'Fishbone'} analysis`)
      parts.push(`Root cause: ${result.rca.root_cause}`)
    }

    if (result.capa) {
      parts.push(`\n✓ Proposed ${result.capa.proposed_capas?.length || 0} CAPA actions`)
    }

    return parts.join('\n')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">AI Copilot</h2>
        <p className="text-sm text-gray-500">Paste text or drop a PDF to analyze</p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {aiSession.messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm">
              Paste a complaint email or upload a PDF document to start the analysis.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {aiSession.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <pre className="whitespace-pre-wrap text-sm font-sans">{message.content}</pre>
                  <div className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {aiSession.isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">{aiSession.processingStep || 'Processing...'}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div
        className="p-4 border-t border-gray-200"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {selectedFile && (
          <div className="mb-2 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-blue-800">{selectedFile.name}</span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </button>
          </div>
        )}

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste complaint text here..."
          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={4}
          disabled={aiSession.isProcessing}
        />

        <div className="mt-3 flex items-center space-x-2">
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileSelect}
              className="hidden"
              disabled={aiSession.isProcessing}
            />
            <span className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Attach File
            </span>
          </label>

          <button
            onClick={handleSubmit}
            disabled={aiSession.isProcessing || (!inputText.trim() && !selectedFile)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiSession.isProcessing ? 'Processing...' : 'Analyze'}
          </button>
        </div>

        {aiSession.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{aiSession.error}</p>
          </div>
        )}
      </div>
    </div>
  )
}