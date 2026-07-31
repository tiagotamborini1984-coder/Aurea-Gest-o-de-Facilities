import { useEffect } from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'
import { useAppStore } from '@/store/AppContext'
import { toast } from 'sonner'

function ModuleAccessDenied() {
  useEffect(() => {
    toast.error('Acesso Negado', {
      description:
        'O módulo não está ativado para a sua empresa. Entre em contato com o administrador do sistema.',
    })
  }, [])
  return <Navigate to="/gestao-terceiros/dashboard-gestor" replace />
}

const routeMenuMap: Record<string, string> = {
  '/ferias/calendario': 'Gestão de Férias',
  '/ferias/dashboard': 'Gestão de Férias',
  '/gestao-epis': 'Gestão de EPIs',
  '/gestao-ferramentas': 'Gestão de Ferramentas',
  '/gestao-terceiros/dashboard-gestor': 'Gestão de Terceiros:Dashboard do Gestor',
  '/gestao-terceiros/lancamentos': 'Lançamentos',
  '/gestao-terceiros/relatorios': 'Relatórios',
  '/gestao-terceiros/bi': 'BI Dashboard',
  '/gestao-terceiros/email-reports': 'Email Reports',
  '/gestao-terceiros/auditoria': 'Log de Auditoria',
  '/gestao-terceiros/encomendas': 'Gestão de Encomendas',
  '/gestao-terceiros/encomendas/tipos': 'Gestão de Encomendas',
  '/gestao-terceiros/encomendas/configuracoes': 'Gestão de Encomendas',
  '/usuarios': 'Usuários',
  '/limpeza-jardinagem/areas': 'Limpeza e Jardinagem',
  '/limpeza-jardinagem/cronograma': 'Limpeza e Jardinagem',
  '/limpeza-jardinagem/dashboard': 'Limpeza e Jardinagem',
  '/limpeza-jardinagem/relatorios': 'Limpeza e Jardinagem',
  '/gestao-tarefas': 'Gestão de Tarefas:Painel de Chamados',
  '/gestao-tarefas/tipos': 'Gestão de Tarefas:Tipos de Chamado',
  '/gestao-tarefas/status': 'Gestão de Tarefas',
  '/gestao-tarefas/relatorios': 'Gestão de Tarefas',
  '/auditoria-checklist/configuracao': 'Auditoria e Checklist:Nova Auditoria',
  '/auditoria-checklist/criadas': 'Auditoria e Checklist:Auditorias Criadas',
  '/auditoria-checklist/realizadas': 'Auditoria e Checklist:Auditorias Realizadas',
  '/auditoria-checklist/dashboard': 'Auditoria e Checklist:Dashboard',
  '/organograma/dashboard': 'Organograma e Fluxos:Organograma',
  '/organograma/cadastros': 'Organograma e Fluxos:Cadastros',
  '/organograma/fluxogramas': 'Organograma e Fluxos:Fluxogramas',
  '/gestao-ferramentas': 'Gestão de Ferramentas',
  '/gestao-epis': 'Gestão de EPIs',
}

const moduleRouteMap: Record<string, string> = {
  '/ferias': 'Gestão de Férias',
  '/gestao-ferramentas': 'Gestão de Ferramentas',
  '/gestao-epis': 'Gestão de EPIs',
}

export function AccessGuard() {
  const location = useLocation()
  const { profile, activeClient } = useAppStore()

  const getBasePath = (path: string) => {
    if (path.startsWith('/gestao-terceiros/cadastros')) return 'Cadastros'

    const exactMatch = Object.keys(routeMenuMap).find((r) => path === r || path.startsWith(r + '/'))
    return exactMatch ? routeMenuMap[exactMatch] : null
  }

  const menuName = getBasePath(location.pathname)
  const hasAccess = useHasAccess(menuName || '')

  const requiredModule = Object.keys(moduleRouteMap).find(
    (r) => location.pathname === r || location.pathname.startsWith(r + '/'),
  )

  if (
    requiredModule &&
    activeClient &&
    !activeClient.modules?.includes(moduleRouteMap[requiredModule])
  ) {
    return <ModuleAccessDenied />
  }

  if (profile?.role === 'Master' || profile?.role === 'Administrador') {
    return <Outlet />
  }

  if (location.pathname === '/gestao-terceiros') {
    return <Outlet />
  }

  if (menuName && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-8">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
          <p className="text-slate-600 mb-6">
            Você não tem permissão para visualizar esta página. Se acredita que isso é um erro,
            entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    )
  }

  return <Outlet />
}
