import React from 'react';

/** Keeps a failed map download (offline, new deploy) from blanking the whole app: shows a retry instead. */
export default class MapBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="map-fail">
        <span>{this.props.message}</span>
        <button type="button" className="btn sm" onClick={() => window.location.reload()}>{this.props.retry}</button>
      </div>
    );
  }
}
