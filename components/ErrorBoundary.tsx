import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Log error for debugging (in production, you might want to send to error tracking service)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', {
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  componentDidMount() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    // Catch unhandled errors
    window.addEventListener('error', this.handleGlobalError);
  }

  componentWillUnmount() {
    // Cleanup event listeners
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.removeEventListener('error', this.handleGlobalError);
  }

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection:', event.reason);
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason || 'Unhandled promise rejection'));
    
    if (!this.state.hasError) {
      this.setState({
        hasError: true,
        error,
        errorInfo: {
          componentStack: 'Unhandled Promise Rejection',
        } as ErrorInfo,
      });
    }
    
    // Prevent default browser behavior
    event.preventDefault();
  };

  handleGlobalError = (event: ErrorEvent) => {
    console.error('Global error caught:', event.error);
    const error = event.error instanceof Error 
      ? event.error 
      : new Error(event.message || 'Unknown error');
    
    if (!this.state.hasError) {
      this.setState({
        hasError: true,
        error,
        errorInfo: {
          componentStack: `At: ${event.filename}:${event.lineno}:${event.colno}`,
        } as ErrorInfo,
      });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconContainer}>
              <svg
                style={styles.icon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 style={styles.title}>Something went wrong</h1>
            <p style={styles.subtitle}>
              An unexpected error occurred. Don't worry, you can try again.
            </p>
            <div style={styles.errorBox}>
              <code style={styles.errorText}>
                {this.state.error?.message || 'Unknown error'}
              </code>
            </div>
            {this.state.errorInfo && (
              <details style={styles.details}>
                <summary style={styles.summary}>Stack trace</summary>
                <pre style={styles.stackTrace}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <div style={styles.buttonContainer}>
              <button
                onClick={this.handleReset}
                style={styles.secondaryButton}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(88, 129, 87, 0.15)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={styles.primaryButton}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = '#3A5A40')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = '#588157')
                }
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    background: 'linear-gradient(135deg, #DAD7CD 0%, #A3B18A 100%)',
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: '1.5rem',
    padding: '3rem',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(58, 90, 64, 0.25)',
    border: '1px solid rgba(88, 129, 87, 0.2)',
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #588157 0%, #3A5A40 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
    boxShadow: '0 10px 30px -10px rgba(88, 129, 87, 0.5)',
  },
  icon: {
    width: '40px',
    height: '40px',
    color: '#DAD7CD',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#344E41',
    margin: '0 0 0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#588157',
    margin: '0 0 1.5rem',
    lineHeight: 1.5,
  },
  errorBox: {
    background: 'rgba(58, 90, 64, 0.1)',
    borderRadius: '0.75rem',
    padding: '1rem',
    marginBottom: '1.5rem',
    border: '1px solid rgba(88, 129, 87, 0.2)',
  },
  errorText: {
    fontSize: '0.875rem',
    color: '#3A5A40',
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    wordBreak: 'break-word',
  },
  details: {
    textAlign: 'left',
    marginBottom: '1.5rem',
  },
  summary: {
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#588157',
    fontWeight: 600,
    marginBottom: '0.5rem',
  },
  stackTrace: {
    fontSize: '0.75rem',
    color: '#344E41',
    background: 'rgba(58, 90, 64, 0.05)',
    padding: '1rem',
    borderRadius: '0.5rem',
    overflow: 'auto',
    maxHeight: '200px',
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  buttonContainer: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  primaryButton: {
    padding: '0.75rem 1.5rem',
    background: '#588157',
    color: '#DAD7CD',
    border: 'none',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 15px -5px rgba(88, 129, 87, 0.4)',
  },
  secondaryButton: {
    padding: '0.75rem 1.5rem',
    background: 'transparent',
    color: '#588157',
    border: '2px solid #588157',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

export default ErrorBoundary;
