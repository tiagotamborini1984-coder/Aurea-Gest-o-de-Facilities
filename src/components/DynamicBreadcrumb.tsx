import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const routeLabels: Record<string, string> = {
  'gestao-terceiros': 'Gestão de Terceiros',
  'cadastros': 'Cadastros',
  'colaborador': 'Colaboradores',
  'funcoes': 'Funções',
  'equipamento': 'Equipamentos',
  'empresas': 'Empresas',
  'plantas': 'Plantas',
  'treinamentos': 'Treinamentos',
  'lancamentos': 'Lançamentos',
  'relatorios': 'Relatórios',
  'encomendas': 'Encomendas',
  'tipos': 'Tipos de Encomenda',
  'configuracoes': 'Configurações',
  'bi': 'BI Dashboard',
  'metas': 'Metas',
  'email-reports': 'Relatórios por E-mail',
  'auditoria': 'Auditoria',
  'dashboard': 'Dashboard'
}

export function DynamicBreadcrumb() {
  const location = useLocation()
  
  if (!location.pathname.startsWith('/gestao-terceiros')) {
    return (
      <h1 className="text-base lg:text-lg font-semibold tracking-tight hidden sm:block text-foreground">
        Gestão de Facilities
      </h1>
    )
  }

  const pathnames = location.pathname.split('/').filter((x) => x)

  return (
    <Breadcrumb className="hidden sm:block ml-2">
      <BreadcrumbList>
        {pathnames.map((value, index) => {
          const isLast = index === pathnames.length - 1
          let to = `/${pathnames.slice(0, index + 1).join('/')}`
          
          if (value === 'cadastros' && isLast) {
            to = '/gestao-terceiros/cadastros/colaborador'
          }

          const label = routeLabels[value] || value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ')

          return (
            <React.Fragment key={to}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={to}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
