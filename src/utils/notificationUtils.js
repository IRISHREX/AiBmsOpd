/**
 * Snackbar notification service for use in Redux sagas and components
 */

let snackbarQueue = [];

export const createSnackbarService = () => {
  return {
    show: (message, type = 'info', duration = 2500) => {
      const notification = { message, type, duration };
      snackbarQueue.push(notification);
      window.dispatchEvent(new CustomEvent('snackbar:show', { detail: notification }));
      return notification;
    },
    success: (message, duration = 2000) => {
      return createSnackbarService().show(message, 'success', duration);
    },
    error: (message, duration = 3000) => {
      return createSnackbarService().show(message, 'error', duration);
    },
    warning: (message, duration = 2500) => {
      return createSnackbarService().show(message, 'warning', duration);
    },
    info: (message, duration = 2000) => {
      return createSnackbarService().show(message, 'info', duration);
    },
  };
};

export const snackbar = createSnackbarService();

