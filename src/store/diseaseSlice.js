import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  value: [],
}

export const diseaseSlice = createSlice({
  name: 'disease',
  initialState,
  reducers: {
    changeSdisease: (state, action) => {
      state.value = action.payload;
    },
  },
})

export const { changeSdisease } = diseaseSlice.actions

export default diseaseSlice.reducer