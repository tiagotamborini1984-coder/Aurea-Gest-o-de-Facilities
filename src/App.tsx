import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import DashboardGestor from './pages/gestao-terceiros/DashboardGestor'
import Lancamentos from './pages/gestao-terceiros/Lancamentos'
import Cadastros from './pages/gestao-terceiros/Cadastros'
import Relatorios from './pages/gestao-terceiros/Relatorios'
import Encomendas from './pages/gestao-terceiros/Encomendas'
import TiposEncomenda from './pages/gestao-terceiros/TiposEncomenda'
import ConfiguracoesEncomendas from './pages/gestao-terceiros/ConfiguracoesEncomendas'
import BIDashboard from './pages/gestao-terceiros/BIDashboard'
import Auditoria from './pages/gestao-terceiros/Auditoria'
import Usuarios from './pages/gestao-terceiros/Usuarios'
import EmailReports from './pages/gestao-terceiros/EmailReports'
import BookMetas from './pages/gestao-terceiros/BookMetas'
import Clientes from './pages/admin/Clientes'

// Gestão de Imóveis Pages
// Gestão de Lockers Pages
import DashboardLockers from './pages/gestao-lockers/Dashboard'
import Lockers from './pages/gestao-lockers/Lockers'
import ColaboradoresLockers from './pages/gestao-lockers/Colaboradores'
import OcupacaoLockers from './pages/gestao-lockers/Ocupacao'

import DashboardImoveis from './pages/gestao-imoveis/Dashboard'
import OcupacaoImoveis from './pages/gestao-imoveis/Ocupacao'
import Imoveis from './pages/gestao-imoveis/Imoveis'
import Hospedes from './pages/gestao-imoveis/Hospedes'
import CentrosCustoImoveis from './pages/gestao-imoveis/CentrosCusto'
import RelatoriosImoveis from './pages/gestao-imoveis/Relatorios'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import Login from './pages/Login'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AccessGuard } from './components/AccessGuard'
import { MasterGuard } from './components/MasterGuard'
import { AppProvider } from './store/AppContext'
import { AuthProvider } from './hooks/use-auth'
import { ThemeProvider } from './components/theme-provider'

// Limpeza e Jardinagem Pages
import AreasLJ from './pages/gestao-terceiros/limpeza-jardinagem/Areas'
import CronogramaLJ from './pages/gestao-terceiros/limpeza-jardinagem/Cronograma'
import DashboardLJ from './pages/gestao-terceiros/limpeza-jardinagem/Dashboard'
import RelatoriosLJ from './pages/gestao-terceiros/limpeza-jardinagem/Relatorios'

// Gestão de Tarefas Pages
import PainelChamados from './pages/gestao-tarefas/PainelChamados'
import TiposChamado from './pages/gestao-tarefas/TiposChamado'
import StatusChamado from './pages/gestao-tarefas/StatusChamado'
import RelatoriosTarefas from './pages/gestao-tarefas/RelatoriosTarefas'

// Auditoria e Checklist Pages
import AuditoriaConfig from './pages/auditoria-checklist/Configuracao'
import AuditoriasCriadas from './pages/auditoria-checklist/AuditoriasCriadas'
import AuditoriaRealizadas from './pages/auditoria-checklist/Realizadas'
import AuditoriaDashboard from './pages/auditoria-checklist/Dashboard'

// Gestão de Budget
import DashboardBudget from './pages/gestao-budget/Dashboard'
import CentrosCustoBudget from './pages/gestao-budget/CentrosCusto'

// Gestão de Acidentes Pages
import DashboardAcidentes from './pages/gestao-acidentes/Dashboard'
import RegistroAcidente from './pages/gestao-acidentes/Registro'
import HistoricoAcidentes from './pages/gestao-acidentes/Historico'

// Organograma e Fluxos
import OrgDashboard from './pages/organograma/Dashboard'
import OrgCadastros from './pages/organograma/Cadastros'
import OrgFluxogramas from './pages/organograma/Fluxogramas'
import ContasContabeisBudget from './pages/gestao-budget/ContasContabeis'
import LancamentosBudget from './pages/gestao-budget/Lancamentos'

const App = () => (
  <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme" attribute="class">
    <AuthProvider>
      <AppProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route element={<MasterGuard />}>
                    <Route path="/admin/clientes" element={<Clientes />} />
                  </Route>
                  <Route element={<AccessGuard />}>
                    <Route path="/" element={<Navigate to="/gestao-terceiros" replace />} />
                    <Route path="/gestao-terceiros" element={<DashboardGestor />} />
                    <Route path="/gestao-terceiros/lancamentos" element={<Lancamentos />} />

                    {/* Limpeza e Jardinagem */}
                    <Route path="/limpeza-jardinagem/areas" element={<AreasLJ />} />
                    <Route path="/limpeza-jardinagem/cronograma" element={<CronogramaLJ />} />
                    <Route path="/limpeza-jardinagem/dashboard" element={<DashboardLJ />} />
                    <Route path="/limpeza-jardinagem/relatorios" element={<RelatoriosLJ />} />

                    {/* Gestão de Tarefas */}
                    <Route path="/gestao-tarefas" element={<PainelChamados />} />
                    <Route path="/gestao-tarefas/tipos" element={<TiposChamado />} />
                    <Route path="/gestao-tarefas/status" element={<StatusChamado />} />
                    <Route path="/gestao-tarefas/relatorios" element={<RelatoriosTarefas />} />

                    {/* Auditoria e Checklist */}
                    <Route path="/auditoria-checklist/configuracao" element={<AuditoriaConfig />} />
                    <Route
                      path="/auditoria-checklist/configuracao/:id"
                      element={<AuditoriaConfig />}
                    />
                    <Route path="/auditoria-checklist/criadas" element={<AuditoriasCriadas />} />
                    <Route
                      path="/auditoria-checklist/realizadas"
                      element={<AuditoriaRealizadas />}
                    />
                    <Route path="/auditoria-checklist/dashboard" element={<AuditoriaDashboard />} />

                    {/* Organograma e Fluxos */}
                    <Route path="/organograma/dashboard" element={<OrgDashboard />} />
                    <Route path="/organograma/cadastros" element={<OrgCadastros />} />
                    <Route path="/organograma/fluxogramas" element={<OrgFluxogramas />} />

                    {/* Gestão de Acidentes */}
                    <Route path="/gestao-acidentes/dashboard" element={<DashboardAcidentes />} />
                    <Route path="/gestao-acidentes/registro" element={<RegistroAcidente />} />
                    <Route path="/gestao-acidentes/registro/:id" element={<RegistroAcidente />} />
                    <Route path="/gestao-acidentes/historico" element={<HistoricoAcidentes />} />

                    {/* Gestão de Budget */}
                    <Route path="/gestao-budget/dashboard" element={<DashboardBudget />} />
                    <Route path="/gestao-budget/centros-custo" element={<CentrosCustoBudget />} />
                    <Route path="/gestao-budget/contas" element={<ContasContabeisBudget />} />
                    <Route path="/gestao-budget/lancamentos" element={<LancamentosBudget />} />

                    {/* Gestão de Lockers */}
                    <Route path="/gestao-lockers/dashboard" element={<DashboardLockers />} />
                    <Route path="/gestao-lockers/ocupacao" element={<OcupacaoLockers />} />
                    <Route path="/gestao-lockers/lockers" element={<Lockers />} />
                    <Route
                      path="/gestao-lockers/colaboradores"
                      element={<ColaboradoresLockers />}
                    />

                    {/* Gestão de Imóveis */}
                    <Route path="/gestao-imoveis/dashboard" element={<DashboardImoveis />} />
                    <Route path="/gestao-imoveis/ocupacao" element={<OcupacaoImoveis />} />
                    <Route path="/gestao-imoveis/imoveis" element={<Imoveis />} />
                    <Route path="/gestao-imoveis/hospedes" element={<Hospedes />} />
                    <Route path="/gestao-imoveis/centros-custo" element={<CentrosCustoImoveis />} />
                    <Route path="/gestao-imoveis/relatorios" element={<RelatoriosImoveis />} />

                    {/* Gestão de Encomendas */}
                    <Route path="/gestao-terceiros/encomendas" element={<Encomendas />} />
                    <Route path="/gestao-terceiros/encomendas/tipos" element={<TiposEncomenda />} />
                    <Route
                      path="/gestao-terceiros/encomendas/configuracoes"
                      element={<ConfiguracoesEncomendas />}
                    />

                    <Route path="/gestao-terceiros/cadastros/:type" element={<Cadastros />} />
                    <Route path="/gestao-terceiros/relatorios" element={<Relatorios />} />
                    <Route path="/gestao-terceiros/bi" element={<BIDashboard />} />
                    <Route path="/gestao-terceiros/metas" element={<BookMetas />} />
                    <Route path="/gestao-terceiros/email-reports" element={<EmailReports />} />
                    <Route path="/gestao-terceiros/auditoria" element={<Auditoria />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  </ThemeProvider>
)

export default App
