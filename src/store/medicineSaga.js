import { call, put, takeLatest, debounce } from 'redux-saga/effects';
import api from '../utils/api';
import { playSaveSound, playLoadSound } from '../utils/soundUtils';
import {
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
} from './medicineSlice';

function* fetchMedicinesSaga(action) {
  try {
    const { payload } = action;
    let url = '/api/v1/medicine/getall';
    if (payload) {
      if (payload.name) {
        url = `/api/v1/medicine/search/name?name=${encodeURIComponent(payload.name)}`;
      } else if (payload.composition) {
        url = `/api/v1/medicine/search/composition?composition=${encodeURIComponent(payload.composition)}`;
      }
    }
    const { data } = yield call(api.get, url);
    yield put(fetchMedicinesSuccess(data.medicines || []));
  } catch (err) {
    yield put(fetchMedicinesFailure(err?.response?.data?.message || err.message || 'Failed to fetch medicines'));
  }
}

function* addMedicineSaga(action) {
  try {
    yield call(api.post, '/api/v1/medicine/add', action.payload);
    playSaveSound();
    yield put(addMedicineSuccess());
    yield put(fetchMedicinesRequest());
  } catch (err) {
    yield put(addMedicineFailure(err?.response?.data?.message || err.message || 'Failed to add medicine'));
  }
}

function* addMedicinesSaga(action) {
  try {
    yield call(api.post, '/api/v1/medicine/add/bulk', action.payload);
    playSaveSound();
    yield put(addMedicinesSuccess());
    yield put(fetchMedicinesRequest());
  } catch (err) {
    yield put(addMedicinesFailure(err?.response?.data?.message || err.message || 'Failed to add medicines'));
  }
}

function* updateMedicineSaga(action) {
  try {
    const { id, ...data } = action.payload;
    yield call(api.put, `/api/v1/medicine/update/${id}`, data);
    playSaveSound();
    yield put(updateMedicineSuccess());
    yield put(fetchMedicinesRequest());
  } catch (err) {
    yield put(updateMedicineFailure(err?.response?.data?.message || err.message || 'Failed to update medicine'));
  }
}

function* deleteMedicineSaga(action) {
  try {
    yield call(api.delete, `/api/v1/medicine/delete/${action.payload}`);
    playSaveSound();
    yield put(deleteMedicineSuccess());
    yield put(fetchMedicinesRequest());
  } catch (err) {
    yield put(deleteMedicineFailure(err?.response?.data?.message || err.message || 'Failed to delete medicine'));
  }
}

export default function* medicineSaga() {
  yield debounce(300, fetchMedicinesRequest.type, fetchMedicinesSaga);
  yield takeLatest(addMedicineRequest.type, addMedicineSaga);
  yield takeLatest(addMedicinesRequest.type, addMedicinesSaga);
  yield takeLatest(updateMedicineRequest.type, updateMedicineSaga);
  yield takeLatest(deleteMedicineRequest.type, deleteMedicineSaga);
}
