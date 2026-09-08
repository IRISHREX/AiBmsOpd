import React, { useContext } from 'react';
import { SnackbarContext } from '../context/SnackbarContext';
import './SnackbarContainer.css';

const SnackbarContainer = () => {
  const { snackbars, removeSnackbar } = useContext(SnackbarContext);

  const getTypeConfig = (type) => {
    const configs = {
      success: {
        icon: '✓',
        bgColor: '#10b981',
        borderColor: '#059669',
        lightBg: '#ecfdf5',
      },
      error: {
        icon: '✕',
        bgColor: '#ef4444',
        borderColor: '#dc2626',
        lightBg: '#fef2f2',
      },
      warning: {
        icon: '⚠',
        bgColor: '#f59e0b',
        borderColor: '#d97706',
        lightBg: '#fffbeb',
      },
      info: {
        icon: 'ℹ',
        bgColor: '#3b82f6',
        borderColor: '#1d4ed8',
        lightBg: '#eff6ff',
      },
      confirmation: {
        icon: '?',
        bgColor: '#6b7280',
        borderColor: '#4b5563',
        lightBg: '#f3f4f6',
      },
    };
    return configs[type] || configs.info;
  };

  return (
    <div className="snackbar-container">
      {snackbars.map((snackbar) => {
        const config = getTypeConfig(snackbar.type);

        if (snackbar.type === 'confirmation') {
          return (
            <div
              key={snackbar.id}
              className="snackbar-item"
              style={{
                background: config.lightBg,
                borderLeft: `4px solid ${config.bgColor}`,
              }}
            >
              <div className="snackbar-content">
                <span
                  className="snackbar-icon"
                  style={{ color: config.bgColor }}
                >
                  {config.icon}
                </span>
                <span className="snackbar-message">{snackbar.message}</span>
                <div className="snackbar-confirmation-buttons">
                  <button onClick={snackbar.onConfirm}>Yes</button>
                  <button onClick={snackbar.onCancel}>No</button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={snackbar.id}
            className="snackbar-item"
            style={{
              background: config.lightBg,
              borderLeft: `4px solid ${config.bgColor}`,
              animation: 'slideIn 0.2s ease-out forwards',
            }}
          >
            <div className="snackbar-content">
              <span
                className="snackbar-icon"
                style={{ color: config.bgColor }}
              >
                {config.icon}
              </span>
              <span className="snackbar-message">{snackbar.message}</span>
              <button
                className="snackbar-close"
                onClick={() => removeSnackbar(snackbar.id)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div
              className="snackbar-progress"
              style={{
                background: config.bgColor,
                animation: 'progress 1s linear forwards',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default SnackbarContainer;
