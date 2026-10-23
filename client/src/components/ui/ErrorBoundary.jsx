import React from 'react';

import { AlertIcon, TrainIcon } from './icons';

/**
 * Last line of defence: catches render-time crashes so one bad message or a
 * failed third-party widget shows a recovery screen instead of a blank page.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Surface the crash in the console for local debugging and in whatever
    // error reporter is wired up in production.
    console.error('[RailHub] render error:', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null, info: null });
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    const { error, info } = this.state;

    if (!error) return this.props.children;

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__icon">
          <AlertIcon size={28} />
        </div>

        <h1 className="error-boundary__title">Something went off the rails</h1>

        <p className="error-boundary__message">
          An unexpected error stopped Rail Hub from rendering. Reloading usually fixes it - your
          conversation history is safe on the server.
        </p>

        <div className="empty-state__actions">
          <button type="button" className="btn btn--primary" onClick={this.handleReload}>
            Reload Rail Hub
          </button>
          <button type="button" className="btn btn--secondary" onClick={this.handleReset}>
            Try again
          </button>
        </div>

        {process.env.NODE_ENV !== 'production' && (
          <pre className="error-boundary__details">
            {String(error?.stack || error?.message || error)}
            {info?.componentStack ? `\n\nComponent stack:${info.componentStack}` : ''}
          </pre>
        )}

        <p className="splash__subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrainIcon size={14} /> Nigerian Railway Corporation - Rail Hub Operations
        </p>
      </div>
    );
  }
}

export default ErrorBoundary;
