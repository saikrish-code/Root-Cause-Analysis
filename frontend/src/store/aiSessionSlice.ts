import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from './store'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  attachments?: { name: string; type: string }[]
}

export interface AIProcessResult {
  intake: {
    text_type: string
    text_length: number
    is_garbled: boolean
    language_detected: string
  } | null
  extraction: {
    product_name: string | null
    batch_lot_number: string | null
    manufacturing_date: string | null
    detected_date: string | null
    site_block: string | null
    severity: string | null
    title: string | null
    description: string | null
    extraction_confidence: number
    missing_fields: string[]
  } | null
  evidence_gap: {
    missing_information: string[]
    suggested_evidence_types: string[]
    questions_to_investigate: string[]
    risk_flags: string[]
  } | null
  rca: {
    method_used: string
    root_cause: string
    contributing_factors: string[]
    confidence_score: number
    evidence_support_notes: string
    limitations: string
  } | null
  capa: {
    proposed_capas: Array<{
      action_type: string
      description: string
      rationale: string
      owner: string | null
      priority: string
      estimated_effort: string | null
    }>
    immediate_actions: string[]
    long_term_improvements: string[]
  } | null
  all_nodes_completed: boolean
  errors: string[] | null
}

interface AISessionState {
  messages: ChatMessage[]
  isProcessing: boolean
  processingStep: string | null
  lastResult: AIProcessResult | null
  error: string | null
}

const initialState: AISessionState = {
  messages: [],
  isProcessing: false,
  processingStep: null,
  lastResult: null,
  error: null,
}

export const processWithAI = createAsyncThunk(
  'aiSession/processWithAI',
  async (data: { raw_text?: string; file?: File; deviation_id?: number }, { rejectWithValue }) => {
    try {
      const formData = new FormData()
      if (data.raw_text) {
        formData.append('raw_text', data.raw_text)
      }
      if (data.file) {
        formData.append('file', data.file)
      }
      if (data.deviation_id) {
        formData.append('deviation_id', data.deviation_id.toString())
      }

      const response = await fetch('/api/ai/ingest', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        return rejectWithValue(error.detail || 'AI processing failed')
      }

      return response.json() as Promise<AIProcessResult>
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'AI processing failed')
    }
  }
)

const aiSessionSlice = createSlice({
  name: 'aiSession',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload)
    },
    setProcessing: (state, action: PayloadAction<{ isProcessing: boolean; step?: string }>) => {
      state.isProcessing = action.payload.isProcessing
      state.processingStep = action.payload.step || null
    },
    clearSession: (state) => {
      state.messages = []
      state.isProcessing = false
      state.processingStep = null
      state.lastResult = null
      state.error = null
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isProcessing = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(processWithAI.pending, (state) => {
        state.isProcessing = true
        state.processingStep = 'Analyzing...'
        state.error = null
      })
      .addCase(processWithAI.fulfilled, (state, action) => {
        state.isProcessing = false
        state.processingStep = null
        state.lastResult = action.payload
        state.error = null
      })
      .addCase(processWithAI.rejected, (state, action) => {
        state.isProcessing = false
        state.processingStep = null
        state.error = action.payload as string || 'Processing failed'
      })
  },
})

export const { addMessage, setProcessing, clearSession, setError } = aiSessionSlice.actions
export const selectAISession = (state: RootState) => state.aiSession
export default aiSessionSlice.reducer