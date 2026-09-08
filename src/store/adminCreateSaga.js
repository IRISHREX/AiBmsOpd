import { call, put, takeLatest } from 'redux-saga/effects';
import api from '../utils/api';
import { snackbar } from '../utils/notificationUtils';
import { createAdminRequest, createAdminSuccess, createAdminFailure } from './adminCreateSlice';
import { playSaveSound, playLoadSound } from '../utils/soundUtils';

function* createAdminSaga(action) {
  try {
    playLoadSound();
    const payload = action.payload;
    yield call(api.post, '/api/v1/user/compounder/addnew', payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    playSaveSound();
    yield put(createAdminSuccess());
    snackbar.success('Compounder created successfully');
  } catch (err) {
    const msg = err?.response?.data?.message || err.message || 'Failed to create compounder';
    yield put(createAdminFailure(msg));
    snackbar.error(msg);
    playLoadSound();
  }
}

export default function* adminCreateWatcher() {
  yield takeLatest(createAdminRequest.type, createAdminSaga);
}