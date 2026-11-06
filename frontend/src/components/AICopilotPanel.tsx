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
        confirmed_root_cause: null,
        confidence_notes: result.rca.evidence_support_notes,
        five_whys_steps: [],
        fishbone_causes: [],
        root_cause_proposals: (result.rca.root_cause_proposals || []).map((prop, index) => ({
          id: -(index + 1),
          rca_investigation_id: -1,
          cause_text: prop.cause_type,
          ai_rationale: prop.ai_rationale,
          is_primary: prop.is_primary,
          confidence_score: Math.round(prop.confidence_score * 100),
          supporting_evidence_ids: JSON.stringify(prop.supporting_evidence_ids || []),
          status: 'proposed',
          user_edited: false,
        })),
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
    }

    if (result.evidence_gap) {
      parts.push(`✓ Identified ${result.evidence_gap.suggested_evidence_types?.length || 0} evidence gaps`)
    }

    if (result.rca && result.rca.root_cause_proposals) {
      parts.push(`✓ Proposed ${result.rca.root_cause_proposals.length} root cause hypotheses`)
    }

    if (result.capa && result.capa.proposed_capas) {
      parts.push(`✓ Proposed ${result.capa.proposed_capas?.length || 0} CAPA actions`)
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
    <div className="h-full flex flex-col bg-[#1A1A1A] text-gray-200">
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide flex items-center">
            <span className="w-2 h-2 rounded-full bg-[#D5FF40] inline-block mr-2 animate-pulse"></span>
            AI Copilot
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Drop a PDF or paste text to analyze</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-4">
        {aiSession.messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-12 px-4">
            <div className="w-12 h-12 rounded-2xl bg-[#2A2A2A] border border-white/10 flex items-center justify-center mx-auto mb-3 text-[#D5FF40]">
              ⚡
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Paste a complaint email or upload a PDF document to start automated RCA and evidence gap detection.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {aiSession.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-[#2A2A2A] border border-[#D5FF40]/30 text-[#D5FF40] flex items-center justify-center text-xs flex-shrink-0 mr-2 mt-1">
                    ⚡
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-[#D5FF40] text-gray-900 font-medium rounded-br-none'
                      : 'bg-[#2A2A2A] text-gray-200 border border-white/10 rounded-bl-none shadow-sm'
                  }`}
                >
                  <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                  <div className={`text-[10px] mt-2 ${
                    message.role === 'user' ? 'text-gray-700 text-right' : 'text-gray-400 text-right'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {aiSession.isProcessing && (
              <div className="flex justify-start items-center space-x-2">
                <div className="w-7 h-7 rounded-xl bg-[#2A2A2A] border border-[#D5FF40]/30 text-[#D5FF40] flex items-center justify-center text-xs flex-shrink-0">
                  ⚡
                </div>
                <div className="bg-[#2A2A2A] text-gray-300 border border-white/10 rounded-2xl rounded-bl-none p-3.5 text-xs flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#D5FF40] border-t-transparent"></div>
                  <span>{aiSession.processingStep || 'Analyzing deviation & extracting fields...'}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div
        className="p-5 border-t border-white/10 bg-[#1A1A1A]"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {selectedFile && (
          <div className="mb-3 p-2.5 bg-[#2A2A2A] border border-[#D5FF40]/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-[#D5FF40]">📄</span>
              <span className="text-xs text-gray-200 font-medium">{selectedFile.name}</span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-gray-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        )}

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste complaint or description..."
          className="w-full p-3.5 bg-[#0D0D0D] border border-white/10 text-gray-200 rounded-2xl resize-none text-xs focus:ring-2 focus:ring-[#D5FF40] focus:border-transparent placeholder-gray-500"
          rows={3}
          disabled={aiSession.isProcessing}
        />

        <div className="mt-3 flex items-center justify-between">
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileSelect}
              className="hidden"
              disabled={aiSession.isProcessing}
            />
            <span className="inline-flex items-center px-3.5 py-2 bg-[#2A2A2A] border border-white/10 rounded-full text-xs text-gray-300 hover:border-[#D5FF40] hover:text-[#D5FF40] transition-all">
              📎 Attach PDF
            </span>
          </label>

          <button
            onClick={handleSubmit}
            disabled={aiSession.isProcessing || (!inputText.trim() && !selectedFile)}
            className="px-5 py-2 bg-[#D5FF40] text-gray-900 rounded-full text-xs font-semibold hover:bg-[#c2eb35] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-[#D5FF40]/10"
          >
            {aiSession.isProcessing ? 'Analyzing...' : 'Send to Copilot'}
          </button>
        </div>

        {aiSession.error && (
          <div className="mt-3 p-3 bg-red-950/50 border border-red-500/30 rounded-xl">
            <p className="text-xs text-red-400">{aiSession.error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
