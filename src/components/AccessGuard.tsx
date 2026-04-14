import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'
import { useAppStore } from '@/store/AppContext'

const routeMenuMap: Record<string, string> = {
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
}

export function AccessGuard() {
  const location = useLocation()
  const { profile } = useAppStore()

  const getBasePath = (path: string) => {
    if (path.startsWith('/gestao-terceiros/cadastros')) return 'Cadastros'

    const exactMatch = Object.keys(routeMenuMap).find((r) => path === r || path.startsWith(r + '/'))
    return exactMatch ? routeMenuMap[exactMatch] : null
  }

  const menuName = getBasePath(location.pathname)
  const hasAccess = useHasAccess(menuName || '')

  if (profile?.role === 'Master' || profile?.role === 'Administrador') {
    return <Outlet />
  }

  if (location.pathname === '/gestao-terceiros') {
    return <Outlet />
  }

  if (menuName && !hasAccess) {
    return <Navigate to="/gestao-terceiros" replace />
  }

  return <Outlet />
}
