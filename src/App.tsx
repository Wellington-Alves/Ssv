import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout           from './components/Layout'
import Login            from './pages/Login'
import Home             from './pages/Home'
import SemPermissao     from './pages/SemPermissao'
import CadastroClientes from './pages/admin/CadastroClientes'
import CadastroOS       from './pages/admin/CadastroOS'
import RespostaCliente        from './pages/admin/RespostaCliente'
import EnviarOrcamento        from './pages/admin/EnviarOrcamento'
import DashboardADM          from './pages/admin/DashboardADM'
import DashboardOrcamentista from './pages/orcamentista/DashboardOrcamentista'
import Orcamento             from './pages/orcamentista/Orcamento'
import CadastroMaquina  from './pages/orcamentista/CadastroMaquina'
import CadastroMaterial from './pages/orcamentista/CadastroMaterial'
import CadastroProcesso from './pages/orcamentista/CadastroProcesso'
import DiasUteis        from './pages/orcamentista/DiasUteis'
import ControleCarga    from './pages/pcp/ControleCarga'
import GastoHoras       from './pages/pcp/GastoHoras'
import Dashboard        from './pages/gerente/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/sem-permissao" element={<SemPermissao />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/"                  element={<Home />} />
            <Route path="/resposta-cliente"   element={<RespostaCliente />} />
            <Route path="/enviar-orcamento"  element={<EnviarOrcamento />} />
            <Route path="/dashboard-adm"          element={<DashboardADM />} />
            <Route path="/dashboard-orcamentista" element={<DashboardOrcamentista />} />
            <Route path="/orcamento"             element={<Orcamento />} />
            <Route path="/clientes"          element={<CadastroClientes />} />
            <Route path="/cadastro-os"       element={<CadastroOS />} />
            <Route path="/maquinas"          element={<CadastroMaquina />} />
            <Route path="/materiais"         element={<CadastroMaterial />} />
            <Route path="/cadastro-processo" element={<CadastroProcesso />} />
            <Route path="/dias-uteis"        element={<DiasUteis />} />
            <Route path="/carga"             element={<ControleCarga />} />
            <Route path="/gasto-horas"       element={<GastoHoras />} />
            <Route path="/dashboard"         element={<Dashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
