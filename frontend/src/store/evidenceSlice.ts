import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from './store'

export interface EvidenceItem {
  id: number
  deviation_id: number
  evidence_type: string
  description: string | null
  source: string | null
  collected: boolean
  is_ai_flagged_missing: boolean
  notes: string | null
  isAIFilled?: boolean
  confirmedByUser?: boolean
}

interface EvidenceState {
  items: EvidenceItem[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: EvidenceState = {
  items: [],
  status: 'idle',
  error: null,
}

export const fetchEvidenceItems = createAsyncThunk(
  'evidence/fetchEvidenceItems',
  async (deviationId: number) => {
    const response = await fetch(`/api/deviations/${deviationId}/full`)
    if (!response.ok) throw new Error('Failed to fetch evidence')
    const data = await response.json()
    return data.evidence_items || []
  }
)

export const createEvidenceItem = createAsyncThunk(
  'evidence/createEvidenceItem',
  async (item: Omit<EvidenceItem, 'id' | 'deviation_id'>) => {
    const response = await fetch('/api/evidence/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
    if (!response.ok) throw new Error('Failed to create evidence item')
    return response.json()
  }
)

export const updateEvidenceItem = createAsyncThunk(
  'evidence/updateEvidenceItem',
  async ({ id, data }: { id: number; data: Partial<EvidenceItem> }) => {
    const response = await fetch(`/api/evidence/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update evidence item')
    return response.json()
  }
)

const evidenceSlice = createSlice({
  name: 'evidence',
  initialState,
  reducers: {
    addEvidenceItem: (state, action: PayloadAction<EvidenceItem>) => {
      state.items.push(action.payload)
    },
    updateEvidenceLocally: (state, action: PayloadAction<{ id: number; data: Partial<EvidenceItem> }>) => {
      const index = state.items.findIndex(item => item.id === action.payload.id)
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...action.payload.data }
      }
    },
    markAsCollected: (state, action: PayloadAction<number>) => {
      const item = state.items.find(i => i.id === action.payload)
      if (item) {
        item.collected = true
        item.confirmedByUser = true
      }
    },
    populateFromAI: (state, action: PayloadAction<EvidenceItem[]>) => {
      const now = new Date().toISOString()
      action.payload.forEach(newItem => {
        const existing = state.items.find(i => i.id === newItem.id || i.evidence_type === newItem.evidence_type)
        if (!existing) {
          state.items.push({
            ...newItem,
            isAIFilled: true,
            confirmedByUser: false,
          })
        }
      })
    },
    clearEvidence: (state) => {
      state.items = []
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvidenceItems.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchEvidenceItems.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload.map((item: EvidenceItem) => ({
          ...item,
          isAIFilled: false,
          confirmedByUser: true,
        }))
      })
      .addCase(fetchEvidenceItems.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message || 'Failed to fetch evidence'
      })
      .addCase(createEvidenceItem.fulfilled, (state, action) => {
        state.items.push({ ...action.payload, isAIFilled: false, confirmedByUser: true })
      })
      .addCase(updateEvidenceItem.fulfilled, (state, action) => {
        const index = state.items.findIndex(i => i.id === action.payload.id)
        if (index !== -1) {
          state.items[index] = {
            ...action.payload,
            isAIFilled: state.items[index].isAIFilled,
            confirmedByUser: true,
          }
        }
      })
  },
})

export const { addEvidenceItem, updateEvidenceLocally, markAsCollected, populateFromAI, clearEvidence } = evidenceSlice.actions
export const selectEvidence = (state: RootState) => state.evidence
export default evidenceSlice.reducer