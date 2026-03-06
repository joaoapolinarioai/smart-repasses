import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-premium border border-zinc-100 text-center space-y-8">
                        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-2xl font-[950] text-zinc-900 uppercase tracking-tighter">
                                Oops! Algo deu errado.
                            </h1>
                            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                                Tivemos um problema inesperado ao carregar esta parte do app.
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-4 bg-zinc-900 text-white rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Recarregar Sistema
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
