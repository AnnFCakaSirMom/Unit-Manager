import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from './icons';
import { Button } from './Button';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center p-4">
                    <div className="bg-gray-800 border-2 border-red-500/50 rounded-lg p-8 max-w-lg w-full shadow-2xl text-center space-y-6">
                        <AlertTriangle size={64} className="text-red-400 mx-auto" />

                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                            <p className="text-gray-400 text-sm">
                                The application encountered an unexpected error and couldn't continue.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="bg-gray-900 rounded p-3 text-left overflow-x-auto text-xs font-mono text-red-300 border border-gray-700">
                                {this.state.error.toString()}
                            </div>
                        )}

                        <div className="flex gap-4 justify-center pt-2">
                            <Button
                                variant="primary"
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Reload Application
                            </Button>
                        </div>

                        <p className="text-xs text-gray-500 mt-4">
                            If reloading doesn't work, your latest save file might be corrupted. Try clearing your browser cache or re-importing a valid save.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
