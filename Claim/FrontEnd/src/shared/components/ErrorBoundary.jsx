import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '32px',
            backgroundColor: '#FAF6F0',
            border: '1.5px solid #EADCC9',
            borderRadius: '12px',
            margin: '24px auto',
            maxWidth: '680px',
            boxShadow: '0 8px 24px rgba(123, 82, 51, 0.08)',
            textAlign: 'center',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #FCA5A5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}
          >
            <AlertTriangle size={28} color="#DC2626" />
          </div>

          <h3
            style={{
              fontSize: '1.15rem',
              fontWeight: '800',
              color: '#2D1A12',
              margin: '0 0 8px 0'
            }}
          >
            Đã Xảy Ra Lỗi Hiển Thị
          </h3>

          <p
            style={{
              fontSize: '0.88rem',
              color: '#7B5233',
              maxWidth: '480px',
              lineHeight: 1.5,
              margin: '0 0 20px 0'
            }}
          >
            {this.state.error?.message || 'Có một lỗi không mong muốn đã xảy ra trong giao diện này.'}
          </p>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                padding: '8px 18px',
                fontSize: '0.84rem',
                fontWeight: '700',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                color: '#7B5233',
                border: '1.5px solid #EADCC9',
                cursor: 'pointer'
              }}
            >
              Thử Lại
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                fontSize: '0.84rem',
                fontWeight: '700',
                borderRadius: '6px',
                backgroundColor: '#7B5233',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={15} />
              <span>Tải Lại Trang</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
