import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import DashboardGestor from './pages/gestao-terceiros/DashboardGestor'
import Lancamentos from './pages/gestao-terceiros/Lancamentos'
import Treinamentos from './pages/gestao-terceiros/Treinamentos'
import Cadastros from './pages/gestao-terceiros/Cadastros'
import Relatorios from './pages/gestao-terceiros/Relatorios'
import Encomendas from './pages/gestao-terceiros/Encomendas'
import TiposEncomenda from './pages/gestao-terceiros/TiposEncomenda'
import ConfiguracoesEncomendas from './pages/gestao-terceiros/ConfiguracoesEncomendas'
import BIDashboard from './pages/gestao-terceiros/BIDashboard'
import Usuarios from './pages/gestao-terceiros/Usuarios'
import Auditoria from './pages/admin/Auditoria'
import EmailReports from './pages/gestao-terceiros/EmailReports'
import BookMetas from './pages/gestao-terceiros/BookMetas'
import Clientes from './pages/admin/Clientes'

// Gestão de Documentos Pages
import Documentos from './pages/gestao-documentos/Documentos'

// Gestão de Imóveis Pages
// Gestão de Lockers Pages
import DashboardLockers from './pages/gestao-lockers/Dashboard'
import Lockers from './pages/gestao-lockers/Lockers'
import ColaboradoresLockers from './pages/gestao-lockers/Colaboradores'
import OcupacaoLockers from './pages/gestao-lockers/Ocupacao'

import DashboardImoveis from './pages/gestao-imoveis/Dashboard'
import DashboardEstrategico from './pages/dashboard-estrategico/Dashboard'
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
import { SubscriptionGuard } from './components/SubscriptionGuard'
// import LandingPage from './pages/LandingPage'
import { AppProvider } from './store/AppContext'
import { AuthProvider } from './hooks/use-auth'
import { ThemeProvider } from './components/theme-provider'
import { AutoLogout } from './components/AutoLogout'

// Limpeza e Jardinagem Pages
import MapaLJ from './pages/gestao-terceiros/limpeza-jardinagem/Mapa'
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
import AuditoriaDetalhes from './pages/auditoria-checklist/AuditoriaDetalhes'
import AuditoriaDashboard from './pages/auditoria-checklist/Dashboard'
import ModeloImprimir from './pages/auditoria-checklist/ModeloImprimir'
import RelatorioImprimir from './pages/auditoria-checklist/RelatorioImprimir'

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

// Gestão de Manutenção
import NovaSolicitacaoPublica from './pages/gestao-manutencao/public/NovaSolicitacao'
import RegistroPublico from './pages/gestao-manutencao/public/Registro'
import LoginPublico from './pages/gestao-manutencao/public/LoginPublico'
import MeusChamadosPublico from './pages/gestao-manutencao/public/MeusChamados'
import DetalheChamadoPublico from './pages/gestao-manutencao/public/DetalheChamado'
import DashboardManutencao from './pages/gestao-manutencao/Dashboard'
import ChamadosManutencao from './pages/gestao-manutencao/Chamados'
import PlanejamentoManutencao from './pages/gestao-manutencao/Planejamento'
import PreventivasManutencao from './pages/gestao-manutencao/Preventivas'
import CadastrosManutencao from './pages/gestao-manutencao/Cadastros'

// Gestão de Férias
import FeriasCalendario from './pages/ferias/Calendario'
import FeriasDashboard from './pages/ferias/Dashboard'
import FeriasMeusPedidos from './pages/ferias/MeusPedidos'

// Gestão de Ferramentas
import DashboardFerramentas from './pages/gestao-ferramentas/Dashboard'

// Gestão de EPIs
import GestaoEPIs from './pages/gestao-epis/Dashboard'

// Gestão de Estoque
import CatalogoEstoque from './pages/gestao-estoque/Catalogo'
import MeusPedidosEstoque from './pages/gestao-estoque/MeusPedidos'
import GestaoPedidosEstoque from './pages/gestao-estoque/GestaoPedidos'
import ProdutosEstoque from './pages/gestao-estoque/Produtos'
import HistoricoImportacoes from './pages/gestao-estoque/HistoricoImportacoes'
import DashboardEstoque from './pages/gestao-estoque/Dashboard'
import AreasEstoque from './pages/gestao-estoque/Areas'

// Pesquisa de Satisfação
import PesquisasSatisfacaoList from './pages/pesquisa-satisfacao/PesquisasSatisfacaoList'
import PesquisaSatisfacaoDashboard from './pages/pesquisa-satisfacao/PesquisaSatisfacaoDashboard'
import PublicSurveyForm from './pages/pesquisa-satisfacao/public/PublicSurveyForm'

const App = () => (
  <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme" attribute="class">
    <AuthProvider>
      <AppProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AutoLogout />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Navigate to="/" replace />} />

              <Route path="/m/:slug/nova-solicitacao" element={<NovaSolicitacaoPublica />} />
              <Route path="/m/:slug/registro" element={<RegistroPublico />} />
              <Route path="/m/:slug/entrar" element={<LoginPublico />} />
              <Route path="/m/:slug/meus-chamados" element={<MeusChamadosPublico />} />
              <Route path="/m/:slug/chamado/:ticketId" element={<DetalheChamadoPublico />} />

              {/* Rota pública para formulário de Pesquisa de Satisfação (Totem / QR Code / Tablet) */}
              <Route path="/p/:id" element={<PublicSurveyForm />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<SubscriptionGuard />}>
                  <Route element={<Layout />}>
                    <Route element={<MasterGuard />}>
                      <Route path="/admin/clientes" element={<Clientes />} />
                    </Route>
                    <Route element={<AccessGuard />}>
                      <Route
                        path="/gestao-terceiros"
                        element={<Navigate to="/gestao-terceiros/dashboard-gestor" replace />}
                      />
                      <Route
                        path="/gestao-terceiros/dashboard-gestor"
                        element={<DashboardGestor />}
                      />
                      <Route path="/gestao-terceiros/lancamentos" element={<Lancamentos />} />
                      <Route path="/gestao-terceiros/treinamentos" element={<Treinamentos />} />

                      {/* Limpeza e Jardinagem */}
                      <Route path="/limpeza-jardinagem/mapa" element={<MapaLJ />} />
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
                      <Route
                        path="/auditoria-checklist/configuracao"
                        element={<AuditoriaConfig />}
                      />
                      <Route
                        path="/auditoria-checklist/configuracao/:id"
                        element={<AuditoriaConfig />}
                      />
                      <Route path="/auditoria-checklist/criadas" element={<AuditoriasCriadas />} />
                      <Route
                        path="/auditoria-checklist/realizadas"
                        element={<AuditoriaRealizadas />}
                      />
                      <Route
                        path="/auditoria-checklist/detalhes/:id"
                        element={<AuditoriaDetalhes />}
                      />
                      <Route path="/auditoria-checklist/modelo/:id" element={<ModeloImprimir />} />
                      <Route
                        path="/auditoria-checklist/relatorio/:id"
                        element={<RelatorioImprimir />}
                      />
                      <Route
                        path="/auditoria-checklist/dashboard"
                        element={<AuditoriaDashboard />}
                      />

                      {/* Dashboard Estratégico */}
                      <Route path="/dashboard-estrategico" element={<DashboardEstrategico />} />

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

                      {/* Gestão de Manutenção */}
                      <Route
                        path="/gestao-manutencao/dashboard"
                        element={<DashboardManutencao />}
                      />
                      <Route path="/gestao-manutencao/chamados" element={<ChamadosManutencao />} />
                      <Route
                        path="/gestao-manutencao/planejamento"
                        element={<PlanejamentoManutencao />}
                      />
                      <Route
                        path="/gestao-manutencao/preventivas"
                        element={<PreventivasManutencao />}
                      />
                      <Route
                        path="/gestao-manutencao/cadastros"
                        element={<CadastrosManutencao />}
                      />

                      {/* Gestão de Documentos */}
                      <Route path="/gestao-documentos" element={<Documentos />} />

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
                      <Route
                        path="/gestao-imoveis/centros-custo"
                        element={<CentrosCustoImoveis />}
                      />
                      <Route path="/gestao-imoveis/relatorios" element={<RelatoriosImoveis />} />

                      {/* Gestão de Estoque */}
                      <Route path="/gestao-estoque/catalogo" element={<CatalogoEstoque />} />
                      <Route path="/gestao-estoque/meus-pedidos" element={<MeusPedidosEstoque />} />
                      <Route
                        path="/gestao-estoque/gestao-pedidos"
                        element={<GestaoPedidosEstoque />}
                      />
                      <Route path="/gestao-estoque/produtos" element={<ProdutosEstoque />} />
                      <Route
                        path="/gestao-estoque/historico-importacoes"
                        element={<HistoricoImportacoes />}
                      />
                      <Route path="/gestao-estoque/areas" element={<AreasEstoque />} />
                      <Route path="/gestao-estoque/dashboard" element={<DashboardEstoque />} />

                      {/* Gestão de Férias */}
                      <Route path="/ferias/calendario" element={<FeriasCalendario />} />
                      <Route path="/ferias/dashboard" element={<FeriasDashboard />} />
                      <Route path="/ferias/meus-pedidos" element={<FeriasMeusPedidos />} />

                      {/* Gestão de Ferramentas */}
                      <Route path="/gestao-ferramentas" element={<DashboardFerramentas />} />

                      {/* Gestão de EPIs */}
                      <Route path="/gestao-epis" element={<GestaoEPIs />} />

                      {/* Pesquisa de Satisfação */}
                      <Route path="/pesquisa-satisfacao" element={<PesquisasSatisfacaoList />} />
                      <Route
                        path="/pesquisa-satisfacao/dashboard"
                        element={<PesquisaSatisfacaoDashboard />}
                      />

                      {/* Gestão de Encomendas */}
                      <Route path="/gestao-terceiros/encomendas" element={<Encomendas />} />
                      <Route
                        path="/gestao-terceiros/encomendas/tipos"
                        element={<TiposEncomenda />}
                      />
                      <Route
                        path="/gestao-terceiros/encomendas/configuracoes"
                        element={<ConfiguracoesEncomendas />}
                      />

                      <Route path="/gestao-terceiros/cadastros/:type" element={<Cadastros />} />
                      <Route path="/gestao-terceiros/relatorios" element={<Relatorios />} />
                      <Route path="/gestao-terceiros/bi" element={<BIDashboard />} />
                      <Route path="/gestao-terceiros/metas" element={<BookMetas />} />
                      <Route path="/gestao-terceiros/email-reports" element={<EmailReports />} />
                      <Route path="/admin/auditoria" element={<Auditoria />} />
                      <Route path="/usuarios" element={<Usuarios />} />
                    </Route>
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
