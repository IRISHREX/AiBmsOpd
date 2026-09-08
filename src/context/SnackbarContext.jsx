import React, { createContext, useState, useCallback, useEffect } from 'react';

export const SnackbarContext = createContext();

export const SnackbarProvider = ({ children }) => {
  const [snackbars, setSnackbars] = useState([]);

  const showSnackbar = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    
    setSnackbars(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setSnackbars(prev => prev.filter(s => s.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeSnackbar = useCallback((id) => {
    setSnackbars(prev => prev.filter(s => s.id !== id));
  }, []);

  // Listen for snackbar events from sagas
  useEffect(() => {
    const handleSnackbarEvent = (event) => {
      const { message, type, duration } = event.detail;
      showSnackbar(message, type, duration);
    };

    window.addEventListener('snackbar:show', handleSnackbarEvent);
    return () => window.removeEventListener('snackbar:show', handleSnackbarEvent);
  }, [showSnackbar]);

  const snackbar = {
    show: (message, type = 'info', duration = 4000) => showSnackbar(message, type, duration),
    success: (message, duration = 3000) => showSnackbar(message, 'success', duration),
    error: (message, duration = 4000) => showSnackbar(message, 'error', duration),
    warning: (message, duration = 4000) => showSnackbar(message, 'warning', duration),
    info: (message, duration = 3000) => showSnackbar(message, 'info', duration),
    confirm: (message, onConfirm, onCancel) => {
      const id = Date.now();
      const newSnackbar = {
        id,
        message,
        type: 'confirmation',
        onConfirm: () => {
          onConfirm();
          removeSnackbar(id);
        },
        onCancel: () => {
          if (onCancel) onCancel();
          removeSnackbar(id);
        },
      };
      setSnackbars(prev => [...prev, newSnackbar]);
    },
  };

  return (
    <SnackbarContext.Provider value={{ snackbars, snackbar, removeSnackbar }}>
      {children}
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => {
  const context = React.useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within SnackbarProvider');
  }
  return context.snackbar;
};
