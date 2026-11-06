import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from './store'

interface AIFieldStatus {
  isAIFilled: boolean
  confirmedByUser: boolean
  lastUpdated: string | null
}

interface DeviationFields {
  deviationNumber: string
  title: string
  description: string
  productName: string | null
  batchLotNumber: string | null
  manufacturingDate: string | null
  detectedDate: string | null
  siteBlock: string | null
  severity: string | null
  sourceDocumentText: string
}

interface DeviationState {
  fields: DeviationFields
  fieldStatus: Record<keyof DeviationFields, AIFieldStatus>
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialFieldStatus: Record<keyof DeviationFields, AIFieldStatus> = {
  deviationNumber: { isAIFilled: false, confirmedByUser: false, lastUpdated: null },
  title: { isAIFilled: false, confirmedByUser: false, lastUpdated: null },
  description: { isAIFilled: false, confirmedByUser: false, lastUpdated: null },
  productName: { isAIFilled: false, confirmedByUser: false, lastUpdated: null },
  batchLotNumber: { isAIFilled: false, confirmedByUser: false, lastUpdated: null },
  manufacturingDate: { isAIFilled: false, confirmedByUser: false, lastUpdated: null },
  detectedDate: { isAIFilled: false, confirmedByUser: false, lastUpdated: null },
  siteBlock: { isAIFilled: false, confirmedByUser: false, lastUpdated: null },
  severity: { isAIFilled: false, confirmedByUser: false, lastUpdated: null },
  sourceDocumentText: { isAIFilled: false, confirmedByUser: false, lastUpdated: null },
}

const initialState: DeviationState = {
  fields: {
    deviationNumber: '',
    title: '',
    description: '',
    productName: null,
    batchLotNumber: null,
    manufacturingDate: null,
    detectedDate: null,
    siteBlock: null,
    severity: null,
    sourceDocumentText: '',
  },
  fieldStatus: initialFieldStatus,
  status: 'idle',
  error: null,
}

export const fetchDeviation = createAsyncThunk(
  'deviation/fetchDeviation',
  async (id: number) => {
    const response = await fetch(`/api/deviations/${id}/full`)
    if (!response.ok) throw new Error('Failed to fetch deviation')
    return response.json()
  }
)

export const saveDeviation = createAsyncThunk(
  'deviation/saveDeviation',
  async (data: Partial<DeviationFields>) => {
    const response = await fetch('/api/deviations/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to save deviation')
    return response.json()
  }
)

const deviationSlice = createSlice({
  name: 'deviation',
  initialState,
  reducers: {
    updateField: (state, action: PayloadAction<{ field: keyof DeviationFields; value: string | null }>) => {
      const { field, value } = action.payload
      state.fields[field] = value
      state.fieldStatus[field] = {
        isAIFilled: false,
        confirmedByUser: true,
        lastUpdated: new Date().toISOString(),
      }
    },
    populateFromAI: (state, action: PayloadAction<Partial<DeviationFields>>) => {
      const now = new Date().toISOString()
      Object.entries(action.payload).forEach(([key, value]) => {
        const field = key as keyof DeviationFields
        if (value !== undefined && state.fields[field] !== value) {
          state.fields[field] = value
          state.fieldStatus[field] = {
            isAIFilled: true,
            confirmedByUser: false,
            lastUpdated: now,
          }
        }
      })
    },
    confirmField: (state, action: PayloadAction<keyof DeviationFields>) => {
      state.fieldStatus[action.payload].confirmedByUser = true
    },
    clearDeviation: (state) => {
      state.fields = initialState.fields
      state.fieldStatus = initialFieldStatus
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeviation.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchDeviation.fulfilled, (state, action) => {
        state.status = 'succeeded'
        Object.entries(action.payload).forEach(([key, value]) => {
          const field = key as keyof DeviationFields
          if (field in state.fields && value !== undefined) {
            state.fields[field] = value
            state.fieldStatus[field] = {
              isAIFilled: false,
              confirmedByUser: true,
              lastUpdated: null,
            }
          }
        })
      })
      .addCase(fetchDeviation.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message || 'Failed to fetch deviation'
      })
      .addCase(saveDeviation.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(saveDeviation.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(saveDeviation.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message || 'Failed to save deviation'
      })
  },
})

export const { updateField, populateFromAI, confirmField, clearDeviation } = deviationSlice.actions
export const selectDeviation = (state: RootState) => state.deviation
export default deviationSlice.reducer