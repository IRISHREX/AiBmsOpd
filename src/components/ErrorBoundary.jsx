import React from 'react';
import { BiErrorCircle } from 'react-icons/bi';
import { MdRefresh } from 'react-icons/md';
import { TiHome } from 'react-icons/ti';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isCompact = this.props.compact;

      if (isCompact) {
        return (
          <div
            style={{
              padding: '1rem',
              margin: '0.5rem 0',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--text-color, #333)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BiErrorCircle style={{ color: '#ef4444', fontSize: '1.25rem' }} />
              <span style={{ fontSize: '0.875rem' }}>
                {this.props.title || 'Unable to display this section right now.'}
              </span>
            </div>
            <button
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.75rem',
                fontSize: '0.8rem',
                background: '#3939d9',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <MdRefresh /> Retry
            </button>
          </div>
        );
      }

      return (
        <div
          style={{
            minHeight: this.props.inline ? '240px' : '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            margin: this.props.inline ? '1rem auto' : '2rem auto',
            maxWidth: '680px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            color: 'var(--text-color, #1f2937)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              color: '#ef4444',
            }}
          >
            <BiErrorCircle size={36} />
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {this.props.title || 'Something went wrong'}
          </h2>

          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: '0.925rem', marginBottom: '1.5rem', maxWidth: '480px' }}>
            {this.props.message ||
              'An unexpected error occurred while rendering this part of the application. Your other data and navigation are safe.'}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                background: '#3939d9',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <MdRefresh size={16} /> Try Again
            </button>

            <button
              onClick={() => {
                window.location.href = '/';
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                background: 'transparent',
                color: 'var(--text-color, #374151)',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <TiHome size={16} /> Return to Dashboard
            </button>
          </div>

          {this.state.error && (
            <div style={{ marginTop: '1.5rem', width: '100%', textAlign: 'left' }}>
              <button
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6366f1',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                {this.state.showDetails ? 'Hide error details' : 'Show error details'}
              </button>

              {this.state.showDetails && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: '#1e293b',
                    color: '#f87171',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    maxHeight: '160px',
                    lineHeight: 1.4,
                  }}
                >
                  <div>{this.state.error.toString()}</div>
                  {this.state.errorInfo?.componentStack && (
                    <div style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
