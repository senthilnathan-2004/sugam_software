import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-100 p-6">
          <Card className="max-w-md p-6 bg-white border border-slate-100 shadow-xl rounded-hms text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-rose-50 rounded-full">
                <AlertCircle className="h-10 w-10 text-danger" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Application Error Caught</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              An unexpected render error occurred in this panel component. Please try reloading the system workspace.
            </p>
            {this.state.error && (
              <pre className="text-[10px] text-rose-600 bg-rose-50/50 p-3 rounded-lg overflow-x-auto text-left font-mono max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="w-full h-11 bg-primary hover:bg-primary-light text-white font-bold rounded-xl shadow"
            >
              Attempt Panel Reset
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
