import { configureStore } from '@reduxjs/toolkit'
import deviationReducer from './deviationSlice'
import aiSessionReducer from './aiSessionSlice'
import evidenceReducer from './evidenceSlice'
import rcaReducer from './rcaSlice'
import capaReducer from './capaSlice'

export const store = configureStore({
  reducer: {
    deviation: deviationReducer,
    aiSession: aiSessionReducer,
    evidence: evidenceReducer,
    rca: rcaReducer,
    capa: capaReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch