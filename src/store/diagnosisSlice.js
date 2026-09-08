import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  value: "",
}

export const diagnosisSlice = createSlice({
  name: 'diagnosis',
  initialState,
  reducers: {
    change: (state, action) => {
      state.value = action.payload
    },
    add: (state, action) => {
      state.value = state.value + action.payload + ", "
    },
    remove: (state, action) => {
      const v = state.value;
      if(v.includes(action.payload + ", ")) {
        state.value = v.replace(action.payload + ", ", '');
      }else if(v.includes(action.payload + ",")){
        state.value = v.replace(action.payload + ",", '');
      }else{
        state.value = v.replace(action.payload, '');
      }
    },
  },
})

export const { change, add, remove } = diagnosisSlice.actions

export default diagnosisSlice.reducer