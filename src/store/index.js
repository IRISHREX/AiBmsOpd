import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import rootReducer from './rootReducer';
import rootSaga from './rootSaga';

const sagaMiddleware = createSagaMiddleware();

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ 
    thunk: false,
    serializableCheck: {
      // Allow FormData and File objects in actions (used for image uploads)
      ignoredActions: ['doctorCreate/createDoctorRequest', 'doctorUpdate/updateDoctorRequest'],
      ignoredPaths: ['doctorCreate', 'doctorUpdate'],
    }
  }).concat(sagaMiddleware),
  devTools: Boolean(import.meta.env?.DEV),
});

sagaMiddleware.run(rootSaga);

export default store;
