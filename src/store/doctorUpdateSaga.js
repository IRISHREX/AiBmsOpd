import { call, put, takeLatest } from 'redux-saga/effects';
import api from '../utils/api';
import { snackbar } from '../utils/notificationUtils';
import { updateDoctorRequest, updateDoctorSuccess, updateDoctorFailure } from './doctorUpdateSlice';
import { playSaveSound, playLoadSound } from '../utils/soundUtils';

function* updateDoctorSaga(action) {
  try {
    playLoadSound();
    const { id, formData } = action.payload;
    yield call(api.put, `/api/v1/user/user/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    playSaveSound();
    yield put(updateDoctorSuccess());
    snackbar.success('Doctor updated successfully');
  } catch (err) {
    const msg = err?.response?.data?.message || err.message || 'Failed to update doctor';
    yield put(updateDoctorFailure(msg));
    snackbar.error(msg);
    playLoadSound();
  }
}

export default function* doctorUpdateWatcher() {
  yield takeLatest(updateDoctorRequest.type, updateDoctorSaga);
}
