import { createSlice } from '@reduxjs/toolkit';

const doctorUpdateSlice = createSlice({
  name: 'doctorUpdate',
  initialState: { updating: false, error: null, success: false },
  reducers: {
    updateDoctorRequest(state) { state.updating = true; state.error = null; state.success = false; },
    updateDoctorSuccess(state) { state.updating = false; state.success = true; },
    updateDoctorFailure(state, action) { state.updating = false; state.error = action.payload; state.success = false; },
    resetDoctorUpdate(state) { state.updating = false; state.error = null; state.success = false; },
  }
});

export const { updateDoctorRequest, updateDoctorSuccess, updateDoctorFailure, resetDoctorUpdate } = doctorUpdateSlice.actions;
export default doctorUpdateSlice.reducer;
