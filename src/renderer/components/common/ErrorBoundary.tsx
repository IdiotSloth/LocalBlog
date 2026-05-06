import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback. Default shows error message + reload button */
  fallback?: ReactNode;
  /** Called when an error is caught, for logging */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.hash = '#/dashboard';
    this.handleReset();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center" style={{ minHeight: '60vh' }}>
          <div className="rounded-full p-4" style={{ background: 'var(--bg-tertiary)' }}>
            <span style={{ fontSize: 32 }}>⚠️</span>
          </div>
          <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            页面加载出错
          </h2>
          <p className="max-w-md text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {this.state.error?.message || '渲染过程中发生了未预期的错误。'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-[6px] px-4 py-2 text-[13px] font-medium transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            >
              重试
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-[6px] px-4 py-2 text-[13px] font-medium text-white transition-colors"
              style={{ background: 'var(--color-primary)' }}
            >
              返回首页
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
