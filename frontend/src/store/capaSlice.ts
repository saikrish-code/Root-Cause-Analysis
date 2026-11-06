import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from './store'

export interface ProposedCAPA {
  action_type: string
  description: string
  rationale: string
  owner: string | null
  priority: string
  estimated_effort: string | null
}

export interface CAPAAction {
  id: number
  deviation_id: number
  action_type: 'Corrective' | 'Preventive'
  description: string
  rationale: string | null
  owner: string | null
  due_date: string | null
  status: 'Proposed' | 'Approved' | 'In Progress' | 'Completed'
  ai_generated: boolean
  reviewed_by_user: boolean
  isAIFilled?: boolean
  confirmedByUser?: boolean
}

interface CAPAState {
  actions: CAPAAction[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: CAPAState = {
  actions: [],
  status: 'idle',
  error: null,
}

export const fetchCAPAActions = createAsyncThunk(
  'capa/fetchCAPAActions',
  async (deviationId: number) => {
    const response = await fetch(`/api/deviations/${deviationId}/full`)
    if (!response.ok) throw new Error('Failed to fetch CAPA')
    const data = await response.json()
    return data.capa_actions || []
  }
)

export const createCAPAAction = createAsyncThunk(
  'capa/createCAPAAction',
  async (data: Omit<CAPAAction, 'id' | 'deviation_id'>) => {
    const response = await fetch('/api/capa/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create CAPA')
    return response.json()
  }
)

export const updateCAPAAction = createAsyncThunk(
  'capa/updateCAPAAction',
  async ({ id, data }: { id: number; data: Partial<CAPAAction> }) => {
    const response = await fetch(`/api/capa/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update CAPA')
    return response.json()
  }
)

const capaSlice = createSlice({
  name: 'capa',
  initialState,
  reducers: {
    addCAPAAction: (state, action: PayloadAction<CAPAAction>) => {
      state.actions.push({ ...action.payload, isAIFilled: false, confirmedByUser: true })
    },
    updateCAPALocally: (state, action: PayloadAction<{ id: number; data: Partial<CAPAAction> }>) => {
      const index = state.actions.findIndex(a => a.id === action.payload.id)
      if (index !== -1) {
        state.actions[index] = { ...state.actions[index], ...action.payload.data, isAIFilled: false, confirmedByUser: true }
      }
    },
    approveCAPA: (state, action: PayloadAction<number>) => {
      const capa = state.actions.find(a => a.id === action.payload)
      if (capa) {
        capa.status = 'Approved'
        capa.confirmedByUser = true
      }
    },
    markCAPAComplete: (state, action: PayloadAction<number>) => {
      const capa = state.actions.find(a => a.id === action.payload)
      if (capa) {
        capa.status = 'Completed'
        capa.confirmedByUser = true
      }
    },
    populateFromAI: (state, action: PayloadAction<ProposedCAPA[]>) => {
      const now = new Date().toISOString()
      action.payload.forEach((capa, index) => {
        const newCAPA: CAPAAction = {
          id: -(index + 1),
          deviation_id: 0,
          action_type: capa.action_type as 'Corrective' | 'Preventive',
          description: capa.description,
          rationale: capa.rationale,
          owner: capa.owner,
          due_date: null,
          status: 'Proposed',
          ai_generated: true,
          reviewed_by_user: false,
          isAIFilled: true,
          confirmedByUser: false,
        }
        state.actions.push(newCAPA)
      })
    },
    clearCAPA: (state) => {
      state.actions = []
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCAPAActions.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchCAPAActions.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.actions = action.payload.map((capa: CAPAAction) => ({
          ...capa,
          isAIFilled: false,
          confirmedByUser: true,
        }))
      })
      .addCase(fetchCAPAActions.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message || 'Failed to fetch CAPA'
      })
      .addCase(createCAPAAction.fulfilled, (state, action) => {
        state.actions.push({ ...action.payload, isAIFilled: false, confirmedByUser: true })
      })
      .addCase(updateCAPAAction.fulfilled, (state, action) => {
        const index = state.actions.findIndex(a => a.id === action.payload.id)
        if (index !== -1) {
          state.actions[index] = {
            ...action.payload,
            isAIFilled: state.actions[index].isAIFilled,
            confirmedByUser: true,
          }
        }
      })
  },
})

export const {
  addCAPAAction,
  updateCAPALocally,
  approveCAPA,
  markCAPAComplete,
  populateFromAI,
  clearCAPA,
} = capaSlice.actions
export const selectCAPA = (state: RootState) => state.capa
export default capaSlice.reducer