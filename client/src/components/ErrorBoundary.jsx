import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('TaskFlow interface error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-screen">
          <div className="app-error-mark" aria-hidden="true">!</div>
          <p className="eyebrow">TaskFlow recovered your data</p>
          <h1>That screen ran into a problem.</h1>
          <p>Your saved tasks and documents are still safe. Reload the workspace to continue.</p>
          <button className="btn" onClick={() => window.location.reload()}>Reload workspace</button>
        </main>
      );
    }
    return this.props.children;
  }
}
