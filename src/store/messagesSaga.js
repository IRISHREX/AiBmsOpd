import { call, put, takeLatest } from 'redux-saga/effects';
import api from '../utils/api';
import { playSaveSound, playLoadSound } from '../utils/soundUtils';
import { fetchMessagesRequest, fetchMessagesSuccess, fetchMessagesFailure } from './messagesSlice';

function* fetchMessagesSaga(action) {
  try {
    playLoadSound();
    const { q = '', page = 1, limit = 10, doctorId, filterOption, customStart, customEnd, email } = action.payload || {};
    const params = { limit, page };
    if (q) params.q = q;
    if (email) params.email = email;
    if (doctorId) params.doctorId = doctorId;
    if (filterOption) params.filterOption = filterOption;
    if (customStart) params.customStart = customStart;
    if (customEnd) params.customEnd = customEnd;
    // Primary fetch: use getall which supports filters, pagination and returns doctors
    const { data } = yield call(api.get, '/api/v1/message/getall', { params });
    // Debugging: log response and params so we can trace empty results when doctorId is used
    try {
      console.log('[messagesSaga] GET /message/getall response', { params, data });
    } catch (e) {}
    let messages = data.messages || [];
    // If caller explicitly asked for a doctorId but getall returned no messages
    // it's possible messages were stored differently (recipient unset) or
    // pagination prevented results. As a fallback, call the dedicated doctor endpoint
    // to ensure doctor-specific messages are retrieved.
    if (params.doctorId && Array.isArray(messages) && messages.length === 0) {
      try {
        const { data: docData } = yield call(api.get, `/api/v1/message/doctor/${params.doctorId}`);
        // Debugging: log fallback response
        try {
          console.log('[messagesSaga] fallback GET /message/doctor/:id', { doctorId: params.doctorId, docData });
        } catch (e) {}
        if (docData && Array.isArray(docData.messages)) {
          messages = docData.messages;
        }
      } catch (e) {
        // ignore fallback error and continue with empty messages
      }
      // If still empty, try a search-based fallback: fetch doctor info then search messages
      if (Array.isArray(messages) && messages.length === 0) {
        try {
          const { data: doctorInfo } = yield call(api.get, `/api/v1/user/doctor/${params.doctorId}`);
          console.log('[messagesSaga] fetched doctorInfo for search fallback', { doctorInfo });
          const doc = doctorInfo?.doctor || doctorInfo?.user || null;
          if (doc) {
            // Try searching by email first, then by full name
            let searchQ = doc.email || `${doc.firstName || ''} ${doc.lastName || ''}`.trim();
            if (!searchQ) searchQ = doc.firstName || doc.lastName || '';

            if (searchQ) {
              try {
                const { data: searchData } = yield call(api.get, '/api/v1/message/search', { params: { q: searchQ } });
                console.log('[messagesSaga] search fallback by doctor', { searchQ, searchData });
                if (searchData && Array.isArray(searchData.messages) && searchData.messages.length > 0) {
                  messages = searchData.messages;
                }
              } catch (se) {
                // ignore search errors
              }
            }
          }
        } catch (diErr) {
          // ignore doctorInfo fetch error
        }
      }
    }

    const payload = {
      messages,
      doctors: data.doctors || [],
      counts: { total: data.total || (messages.length || 0), read: data.readCount || 0, unread: data.unreadCount || 0 },
      page: data.page || 1,
      totalPages: data.totalPages || 1
    };
    try {
      console.log('[messagesSaga] dispatching fetchMessagesSuccess', { payloadSummary: { messagesLength: payload.messages.length, page: payload.page, totalPages: payload.totalPages } });
    } catch (e) {}
    yield put(fetchMessagesSuccess(payload));
  } catch (err) {
    yield put(fetchMessagesFailure(err?.response?.data?.message || err.message || 'Failed to load messages'));
  }
}

export default function* messagesSaga() {
  yield takeLatest(fetchMessagesRequest.type, fetchMessagesSaga);
}
