import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from './store'

export interface FiveWhysStep {
  id: number
  rca_investigation_id: number
  step_number: number
  why_question: string | null
  answer: string
  is_ai_suggested: boolean
  user_edited: boolean
  isAIFilled?: boolean
  confirmedByUser?: boolean
}

export interface FishboneCause {
  id: number
  rca_investigation_id: number
  category: string
  cause_text: string
  is_ai_suggested: boolean
  user_edited: boolean
  isAIFilled?: boolean
  confirmedByUser?: boolean
}

export interface RCAInvestigation {
  id: number
  deviation_id: number
  method: 'five_whys' | 'fishbone'
  status: 'In Progress' | 'Completed' | 'Rejected'
  ai_generated: boolean
  reviewed_by_user: boolean
  confirmed_root_cause: string | null
  confidence_notes: string | null
  five_whys_steps: FiveWhysStep[]
  fishbone_causes: FishboneCause[]
  isAIFilled?: boolean
  confirmedByUser?: boolean
}

interface RCAState {
  investigation: RCAInvestigation | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: RCAState = {
  investigation: null,
  status: 'idle',
  error: null,
}

export const fetchRCA = createAsyncThunk(
  'rca/fetchRCA',
  async (deviationId: number) => {
    const response = await fetch(`/api/rca/?deviation_id=${deviationId}`)
    if (!response.ok) throw new Error('Failed to fetch RCA')
    return response.json()
  }
)

export const createRCA = createAsyncThunk(
  'rca/createRCA',
  async (data: { deviation_id: number; method: string; five_whys_steps?: object[]; fishbone_causes?: object[] }) => {
    const response = await fetch('/api/rca/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create RCA')
    return response.json()
  }
)

export const updateRCA = createAsyncThunk(
  'rca/updateRCA',
  async ({ id, data }: { id: number; data: Partial<RCAInvestigation> }) => {
    const response = await fetch(`/api/rca/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update RCA')
    return response.json()
  }
)

const rcaSlice = createSlice({
  name: 'rca',
  initialState,
  reducers: {
    updateRCALocally: (state, action: PayloadAction<Partial<RCAInvestigation>>) => {
      if (state.investigation) {
        state.investigation = { ...state.investigation, ...action.payload }
        state.investigation.isAIFilled = false
        state.investigation.confirmedByUser = true
      }
    },
    addFiveWhysStep: (state, action: PayloadAction<FiveWhysStep>) => {
      if (state.investigation) {
        state.investigation.five_whys_steps.push({
          ...action.payload,
          isAIFilled: false,
          confirmedByUser: true,
        })
      }
    },
    updateFiveWhysStep: (state, action: PayloadAction<{ id: number; data: Partial<FiveWhysStep> }>) => {
      if (state.investigation) {
        const index = state.investigation.five_whys_steps.findIndex(s => s.id === action.payload.id)
        if (index !== -1) {
          state.investigation.five_whys_steps[index] = {
            ...state.investigation.five_whys_steps[index],
            ...action.payload.data,
            isAIFilled: false,
            confirmedByUser: true,
          }
        }
      }
    },
    addFishboneCause: (state, action: PayloadAction<FishboneCause>) => {
      if (state.investigation) {
        state.investigation.fishbone_causes.push({
          ...action.payload,
          isAIFilled: false,
          confirmedByUser: true,
        })
      }
    },
    updateFishboneCause: (state, action: PayloadAction<{ id: number; data: Partial<FishboneCause> }>) => {
      if (state.investigation) {
        const index = state.investigation.fishbone_causes.findIndex(c => c.id === action.payload.id)
        if (index !== -1) {
          state.investigation.fishbone_causes[index] = {
            ...state.investigation.fishbone_causes[index],
            ...action.payload.data,
            isAIFilled: false,
            confirmedByUser: true,
          }
        }
      }
    },
    confirmRootCause: (state) => {
      if (state.investigation) {
        state.investigation.confirmedByUser = true
        state.investigation.status = 'Completed'
      }
    },
    populateFromAI: (state, action: PayloadAction<RCAInvestigation>) => {
      const now = new Date().toISOString()
      state.investigation = {
        ...action.payload,
        isAIFilled: true,
        confirmedByUser: false,
        five_whys_steps: action.payload.five_whys_steps.map(step => ({
          ...step,
          isAIFilled: step.is_ai_suggested,
          confirmedByUser: false,
        })),
        fishbone_causes: action.payload.fishbone_causes.map(cause => ({
          ...cause,
          isAIFilled: cause.is_ai_suggested,
          confirmedByUser: false,
        })),
      }
    },
    clearRCA: (state) => {
      state.investigation = null
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRCA.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchRCA.fulfilled, (state, action) => {
        state.status = 'succeeded'
        if (action.payload.length > 0) {
          state.investigation = {
            ...action.payload[0],
            isAIFilled: false,
            confirmedByUser: true,
            five_whys_steps: action.payload[0].five_whys_steps.map((step: FiveWhysStep) => ({
              ...step,
              isAIFilled: false,
              confirmedByUser: true,
            })),
            fishbone_causes: action.payload[0].fishbone_causes.map((cause: FishboneCause) => ({
              ...cause,
              isAIFilled: false,
              confirmedByUser: true,
            })),
          }
        }
      })
      .addCase(fetchRCA.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message || 'Failed to fetch RCA'
      })
      .addCase(createRCA.fulfilled, (state, action) => {
        state.investigation = {
          ...action.payload,
          isAIFilled: false,
          confirmedByUser: true,
          five_whys_steps: (action.payload.five_whys_steps || []).map((step: FiveWhysStep) => ({
            ...step,
            isAIFilled: false,
            confirmedByUser: true,
          })),
          fishbone_causes: (action.payload.fishbone_causes || []).map((cause: FishboneCause) => ({
            ...cause,
            isAIFilled: false,
            confirmedByUser: true,
          })),
        }
      })
      .addCase(updateRCA.fulfilled, (state, action) => {
        if (state.investigation && state.investigation.id === action.payload.id) {
          state.investigation = {
            ...action.payload,
            isAIFilled: state.investigation.isAIFilled,
            confirmedByUser: true,
          }
        }
      })
  },
})

export const {
  updateRCALocally,
  addFiveWhysStep,
  updateFiveWhysStep,
  addFishboneCause,
  updateFishboneCause,
  confirmRootCause,
  populateFromAI,
  clearRCA,
} = rcaSlice.actions
export const selectRCA = (state: RootState) => state.rca
export default rcaSlice.reducer