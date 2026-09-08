import { createSlice } from '@reduxjs/toolkit';

const medicineSlice = createSlice({
  name: 'medicines',
  initialState: { medicines: [], loading: false, error: null },
  reducers: {
    fetchMedicinesRequest(state, action) { state.loading = true; state.error = null; },
    fetchMedicinesSuccess(state, action) { state.loading = false; state.medicines = action.payload; },
    fetchMedicinesFailure(state, action) { state.loading = false; state.error = action.payload; },
    addMedicineRequest(state, action) { state.loading = true; state.error = null; },
    addMedicineSuccess(state, action) { state.loading = false; },
    addMedicineFailure(state, action) { state.loading = false; state.error = action.payload; },
    addMedicinesRequest(state, action) { state.loading = true; state.error = null; },
    addMedicinesSuccess(state, action) { state.loading = false; },
    addMedicinesFailure(state, action) { state.loading = false; state.error = action.payload; },
    updateMedicineRequest(state, action) { state.loading = true; state.error = null; },
    updateMedicineSuccess(state, action) { state.loading = false; },
    updateMedicineFailure(state, action) { state.loading = false; state.error = action.payload; },
    deleteMedicineRequest(state, action) { state.loading = true; state.error = null; },
    deleteMedicineSuccess(state, action) { state.loading = false; },
    deleteMedicineFailure(state, action) { state.loading = false; state.error = action.payload; },
  }
});

export const {
  fetchMedicinesRequest,
  fetchMedicinesSuccess,
  fetchMedicinesFailure,
  addMedicineRequest,
  addMedicineSuccess,
  addMedicineFailure,
  addMedicinesRequest,
  addMedicinesSuccess,
  addMedicinesFailure,
  updateMedicineRequest,
  updateMedicineSuccess,
  updateMedicineFailure,
  deleteMedicineRequest,
  deleteMedicineSuccess,
  deleteMedicineFailure,
} = medicineSlice.actions;

export default medicineSlice.reducer;
