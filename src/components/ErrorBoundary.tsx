import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, LogOut, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  private handleClearAndReload = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // ignore
    }
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      const errorMessage =
        this.state.error?.message || 'Ocorreu um erro inesperado na renderização.'

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans text-slate-100">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8 text-center space-y-6 backdrop-blur-md animate-fade-in">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {this.props.fallbackTitle || 'Ops! Algo deu errado'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Um erro inesperado impediu o carregamento desta tela. Não se preocupe, seus dados
                estão seguros.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-black/40 border border-slate-700/60 rounded-lg text-left overflow-hidden">
                <p className="text-[11px] font-mono text-red-400 break-words line-clamp-3">
                  {errorMessage}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="tech"
                className="w-full h-10 text-xs font-semibold uppercase tracking-wider"
                onClick={this.handleReset}
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Recarregar Página
              </Button>

              <Button
                variant="outline"
                className="w-full h-10 text-xs text-slate-300 border-slate-700 hover:bg-slate-700/50 hover:text-white"
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null })
                  window.location.href = '/'
                }}
              >
                <Home className="w-4 h-4 mr-2" /> Ir para Início / Login
              </Button>

              <Button
                variant="ghost"
                className="w-full h-9 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                onClick={this.handleClearAndReload}
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" /> Limpar Sessão e Recarregar
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
