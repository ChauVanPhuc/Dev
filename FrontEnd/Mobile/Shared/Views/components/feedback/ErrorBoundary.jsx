import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#FAF7F2',
          color: '#4A240E',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
          }}>
            <AlertTriangle size={32} color="#DC2626" />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#991B1B' }}>
            Đã xảy ra lỗi khi tải giao diện
          </h2>

          <p style={{ fontSize: '13px', color: '#7B5233', margin: '0 0 20px 0', maxWidth: '340px', lineHeight: 1.5 }}>
            {this.state.error?.message || 'Hệ thống gặp sự cố không mong muốn. Vui lòng tải lại trang hoặc kiểm tra kết nối mạng.'}
          </p>

          <button
            type="button"
            onClick={this.handleReload}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(123, 82, 51, 0.25)'
            }}
          >
            <RotateCcw size={16} />
            <span>Tải lại trang</span>
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
