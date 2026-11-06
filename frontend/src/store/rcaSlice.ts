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
  selectedMethod: 'five_whys' | 'fishbone'
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
  isRunningDeeperAnalysis: boolean
  deeperAnalysisStepId: number | null
}

const initialState: RCAState = {
  investigation: null,
  selectedMethod: 'five_whys',
  status: 'idle',
  error: null,
  isRunningDeeperAnalysis: false,
  deeperAnalysisStepId: null,
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
    if (data.confirmed_root_cause) {
      const investigation = data as any
      const confirmedSteps = investigation.five_whys_steps?.filter((s: any) => s.confirmedByUser) || []
      const confirmedCauses = investigation.fishbone_causes?.filter((c: any) => c.confirmedByUser) || []

      if (investigation.five_whys_steps && confirmedSteps.length === 0 && investigation.five_whys_steps.length > 0) {
        throw new Error('Cannot confirm root cause: no steps have been confirmed by user')
      }
      if (investigation.fishbone_causes && confirmedCauses.length === 0 && investigation.fishbone_causes.length > 0) {
        throw new Error('Cannot confirm root cause: no causes have been confirmed by user')
      }
    }

    const response = await fetch(`/api/rca/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to update RCA')
    }
    return response.json()
  }
)

export const askAIDeeper = createAsyncThunk(
  'rca/askAIDeeper',
  async ({ deviationId, stepAnswer, method }: { deviationId: number; stepAnswer: string; method: string }) => {
    const response = await fetch(`/api/ai/${deviationId}/rca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extraction: { raw_text: stepAnswer },
        method: method,
      }),
    })
    if (!response.ok) throw new Error('Failed to get deeper analysis')
    return response.json()
  }
)

const rcaSlice = createSlice({
  name: 'rca',
  initialState,
  reducers: {
    setSelectedMethod: (state, action: PayloadAction<'five_whys' | 'fishbone'>) => {
      state.selectedMethod = action.payload
      if (state.investigation) {
        state.investigation.method = action.payload
      }
    },
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
          const wasEdited = action.payload.data.answer !== state.investigation.five_whys_steps[index].answer
          state.investigation.five_whys_steps[index] = {
            ...state.investigation.five_whys_steps[index],
            ...action.payload.data,
            user_edited: wasEdited ? true : state.investigation.five_whys_steps[index].user_edited,
          }
        }
      }
    },
    confirmFiveWhysStep: (state, action: PayloadAction<number>) => {
      if (state.investigation) {
        const step = state.investigation.five_whys_steps.find(s => s.id === action.payload)
        if (step) {
          step.confirmedByUser = true
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
          const wasEdited = action.payload.data.cause_text !== state.investigation.fishbone_causes[index].cause_text
          state.investigation.fishbone_causes[index] = {
            ...state.investigation.fishbone_causes[index],
            ...action.payload.data,
            user_edited: wasEdited ? true : state.investigation.fishbone_causes[index].user_edited,
          }
        }
      }
    },
    confirmFishboneCause: (state, action: PayloadAction<number>) => {
      if (state.investigation) {
        const cause = state.investigation.fishbone_causes.find(c => c.id === action.payload)
        if (cause) {
          cause.confirmedByUser = true
        }
      }
    },
    removeFishboneCause: (state, action: PayloadAction<number>) => {
      if (state.investigation) {
        state.investigation.fishbone_causes = state.investigation.fishbone_causes.filter(c => c.id !== action.payload)
      }
    },
    confirmRootCause: (state, action: PayloadAction<string>) => {
      if (state.investigation) {
        state.investigation.confirmed_root_cause = action.payload
        state.investigation.confirmedByUser = true
        state.investigation.reviewed_by_user = true
        state.investigation.status = 'Completed'
      }
    },
    populateFromAI: (state, action: PayloadAction<RCAInvestigation>) => {
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
      state.selectedMethod = action.payload.method
    },
    clearRCA: (state) => {
      state.investigation = null
      state.selectedMethod = 'five_whys'
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
          state.selectedMethod = action.payload[0].method
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
        state.selectedMethod = action.payload.method
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
      .addCase(askAIDeeper.pending, (state) => {
        state.isRunningDeeperAnalysis = true
      })
      .addCase(askAIDeeper.fulfilled, (state, action) => {
        state.isRunningDeeperAnalysis = false
        if (action.payload.rca && state.investigation) {
          state.investigation.five_whys_steps = [
            ...state.investigation.five_whys_steps,
            ...action.payload.rca.contributing_factors.map((factor: string, index: number) => ({
              id: -(Date.now() + index),
              rca_investigation_id: state.investigation!.id,
              step_number: state.investigation!.five_whys_steps.length + index + 1,
              why_question: null,
              answer: factor,
              is_ai_suggested: true,
              user_edited: false,
              isAIFilled: true,
              confirmedByUser: false,
            })),
          ]
        }
      })
      .addCase(askAIDeeper.rejected, (state, action) => {
        state.isRunningDeeperAnalysis = false
        state.error = action.error.message || 'Failed to get deeper analysis'
      })
  },
})

export const {
  setSelectedMethod,
  updateRCALocally,
  addFiveWhysStep,
  updateFiveWhysStep,
  confirmFiveWhysStep,
  addFishboneCause,
  updateFishboneCause,
  confirmFishboneCause,
  removeFishboneCause,
  confirmRootCause,
  populateFromAI,
  clearRCA,
} = rcaSlice.actions
export const selectRCA = (state: RootState) => state.rca
export default rcaSlice.reducer