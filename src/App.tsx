import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import DashboardGestor from './pages/gestao-terceiros/DashboardGestor'
import Lancamentos from './pages/gestao-terceiros/Lancamentos'
import Cadastros from './pages/gestao-terceiros/Cadastros'
import Relatorios from './pages/gestao-terceiros/Relatorios'
import BIDashboard from './pages/gestao-terceiros/BIDashboard'
import Auditoria from './pages/gestao-terceiros/Auditoria'
import Usuarios from './pages/gestao-terceiros/Usuarios'
import EmailReports from './pages/gestao-terceiros/EmailReports'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import Login from './pages/Login'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppProvider } from './store/AppContext'
import { AuthProvider } from './hooks/use-auth'

const App = () => (
  <AuthProvider>
    <AppProvider>
      <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/gestao-terceiros" replace />} />
                <Route path="/gestao-terceiros" element={<DashboardGestor />} />
                <Route path="/gestao-terceiros/lancamentos" element={<Lancamentos />} />
                <Route path="/gestao-terceiros/cadastros/:type" element={<Cadastros />} />
                <Route path="/gestao-terceiros/relatorios" element={<Relatorios />} />
                <Route path="/gestao-terceiros/bi" element={<BIDashboard />} />
                <Route path="/gestao-terceiros/email-reports" element={<EmailReports />} />
                <Route path="/gestao-terceiros/auditoria" element={<Auditoria />} />
                <Route path="/gestao-terceiros/usuarios" element={<Usuarios />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </AppProvider>
  </AuthProvider>
)

export default App
