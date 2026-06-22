import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40, textAlign: 'center', color: '#fff',
          background: '#1a5c2a', minHeight: '100vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: 16 }}>😅 出错了</h1>
          <p style={{ color: '#a0d8a0', marginBottom: 24, fontSize: '0.9rem' }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
            style={{
              padding: '12px 32px', border: 'none', borderRadius: 12,
              background: '#f0d060', color: '#3d2e00', fontSize: '1rem',
              fontWeight: 700, cursor: 'pointer'
            }}
          >
            重新开始
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
