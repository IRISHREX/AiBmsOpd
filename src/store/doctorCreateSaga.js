import { call, put, takeLatest } from 'redux-saga/effects';
import api from '../utils/api';
import { snackbar } from '../utils/notificationUtils';
import { createDoctorRequest, createDoctorSuccess, createDoctorFailure } from './doctorCreateSlice';
import { playSaveSound, playLoadSound } from '../utils/soundUtils';

function* createDoctorSaga(action) {
  try {
    playLoadSound();
    // action.payload.formData is the FormData object built by the component
    // FormData is kept local to saga and never stored in Redux state
    const { formData } = action.payload;
    
    // Post with multipart/form-data (axios will set correct headers for FormData)
    yield call(api.post, '/api/v1/user/doctor/addnew', formData);
    playSaveSound();
    yield put(createDoctorSuccess());
    snackbar.success('Doctor created successfully');
  } catch (err) {
    const msg = err?.response?.data?.message || err.message || 'Failed to create doctor';
    yield put(createDoctorFailure(msg));
    snackbar.error(msg);
    playLoadSound();
  }
}

export default function* doctorCreateWatcher() {
  yield takeLatest(createDoctorRequest.type, createDoctorSaga);
}