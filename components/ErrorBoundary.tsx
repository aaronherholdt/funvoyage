// components/ErrorBoundary.tsx
// React Error Boundary component for graceful error handling in production

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createLogger } from '../lib/logger';

const log = createLogger({ component: 'ErrorBoundary' });

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        log.error('Uncaught error in component tree', {
            errorMessage: error.message,
            componentStack: errorInfo.componentStack,
        });
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-coral-50 to-sand-100 p-8">
                    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
                        <div className="w-16 h-16 bg-coral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-3xl">😢</span>
                        </div>
                        <h2 className="text-2xl font-bold text-sand-900 mb-3">
                            Oops! Something went wrong
                        </h2>
                        <p className="text-sand-600 mb-6">
                            We're sorry, but something unexpected happened. Please try refreshing the page.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={this.handleReset}
                                className="w-full bg-coral-500 hover:bg-coral-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-sand-100 hover:bg-sand-200 text-sand-700 font-bold py-3 px-6 rounded-xl transition-colors"
                            >
                                Refresh Page
                            </button>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="cursor-pointer text-sm text-sand-500 hover:text-sand-700">
                                    Error Details (Dev Only)
                                </summary>
                                <pre className="mt-2 p-4 bg-sand-50 rounded-lg text-xs overflow-auto text-red-600">
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
