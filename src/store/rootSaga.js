import { all } from 'redux-saga/effects';
import authSaga from './authSaga';
import appointmentSaga from './appointmentSaga';
import doctorsSaga from './doctorsSaga';
import messagesSaga from './messagesSaga';
import doctorCreateWatcher from './doctorCreateSaga';
import adminCreateWatcher from './adminCreateSaga';
import previewWatcher from './previewSaga';
import medicineSaga from './medicineSaga';
import doctorUpdateWatcher from './doctorUpdateSaga';

export default function* rootSaga() {
  yield all([
    authSaga(),
    appointmentSaga(),
    doctorsSaga(),
    messagesSaga(),
    doctorCreateWatcher(),
    adminCreateWatcher(),
    previewWatcher(),
    medicineSaga(),
    doctorUpdateWatcher(),
  ]);
}
