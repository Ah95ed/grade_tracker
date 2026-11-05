import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Gradebook caught application error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCorruptSession = () => {
    try {
      // Clear potentially corrupt auth or transient state keys without deleting students/models data
      localStorage.removeItem('gradebook_auth_current_user_v2');
      localStorage.removeItem('gradebook_active_cancelled_user');
      localStorage.removeItem('gradebook_trial_expired_notice_v2');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed clearing corrupt session keys:', e);
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-['Cairo',sans-serif] text-slate-800"
          dir="rtl"
        >
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                حدث خطأ غير متوقع أثناء تشغيل التطبيق
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-semibold">
                نعتذر عن هذا الخطأ. يمكنك إعادة تحميل الصفحة أو إصلاح الجلسة دون فقدان بياناتك ودرجاتك المحفوظة.
              </p>
            </div>

            {this.state.error && (
              <div className="text-right bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-rose-800 font-mono overflow-x-auto max-h-32 dir-ltr">
                {this.state.error.toString()}
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-[#2B6CB0] hover:bg-[#255C96] text-white rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحميل الصفحة الآن</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCorruptSession}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
              >
                <Trash2 className="w-4 h-4 text-slate-500" />
                <span>تنظيف الجلسة المؤقتة وإعادة الدخول</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
