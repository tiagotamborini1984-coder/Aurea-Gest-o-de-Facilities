import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'

export default function ComingSoon() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-slate-50">
            Acesso Restrito
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-light leading-relaxed">
            A plataforma Áurea encontra-se temporariamente em ambiente privado durante a fase de
            testes e configurações finais.
          </p>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
          <Link to="/login">
            <Button className="w-full sm:w-auto min-w-[200px] h-12 text-base" size="lg">
              Acesso ao Sistema
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
