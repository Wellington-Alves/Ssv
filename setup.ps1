# setup.ps1 - Cria toda a estrutura do projeto SSV
# Execute: powershell -ExecutionPolicy Bypass -File .\setup.ps1

Write-Host "Criando estrutura do projeto SSV..." -ForegroundColor Cyan

# src/types/database.ts
$database = @"
export type Perfil = 'admin' | 'orcamentista' | 'pcp' | 'gerente'
export type StatusOS = 'rascunho' | 'orcado' | 'enviado' | 'aprovado' | 'reprovado' | 'em_producao' | 'concluido'
export type StatusOperacao = 'pendente' | 'em_andamento' | 'concluida'

export interface Profile { id: string; nome: string; perfil: Perfil; ativo: boolean; created_at: string }
export interface Cliente { id: number; nome: string; contato: string | null; email: string | null; telefone: string | null; ativo: boolean; created_at: string }
export interface Maquina { id: number; maquina: string; jornada: number; vl_hora: number; ativo: boolean; created_at: string }
export interface Material { id: number; nome_material: string; densidade: number | null; valor_kg: number | null; ativo: boolean; created_at: string }
export interface OrdemServico { id: number; numero_os_cliente: string | null; cliente_id: number; coordenador: string | null; desenho: string | null; data_entrega: string | null; data_cadastro: string; status: StatusOS; email_enviado: boolean; email_enviado_em: string | null; criado_por: string | null; created_at: string; updated_at: string }
export interface HistoricoStatusOS { id: number; os_id: number; status_de: StatusOS | null; status_para: StatusOS; alterado_por: string | null; observacao: string | null; created_at: string }
export interface Posicao { id: number; os_id: number; posicao: number; quantidade_pecas: number | null; quantidade_material: number | null; tipo: string | null; formato: string | null; material_id: number | null; beneficiado: boolean; bitola: string | null; largura: number | null; comprimento: number | null; parede: string | null; status_posicao: string | null; created_at: string; updated_at: string }
export interface OperacaoPosicao { id: number; posicao_id: number; ordem: number; maquina_id: number | null; horas: number | null; status: StatusOperacao; data_limite: string | null; data_planejada: string | null; numero_dias: number | null; observacao: string | null; created_at: string; updated_at: string }
export interface OrcamentoMaterial { id: number; os_id: number; posicao_id: number; material_id: number | null; formato: string | null; diametro: number | null; diametro_interno: number | null; largura: number | null; espessura: number | null; comprimento: number | null; peso_calculado: number | null; valor_total: number | null; created_at: string }
export interface Carga { id: number; os_id: number; posicao_id: number; operacao_id: number | null; maquina_id: number | null; horas_programadas: number | null; data: string | null; created_at: string }
export interface DataUtil { id: number; data: string; dia_util: boolean }
export interface OperacaoComMaquina extends OperacaoPosicao { maquinas: Pick<Maquina, 'id' | 'maquina' | 'vl_hora'> | null }
export interface PosicaoComOperacoes extends Posicao { operacoes_posicao: OperacaoComMaquina[]; material: Pick<Material, 'id' | 'nome_material'> | null }
export interface OrdemServicoComCliente extends OrdemServico { clientes: Pick<Cliente, 'id' | 'nome' | 'email' | 'telefone'> }
export type ClientePayload = Omit<Cliente, 'id' | 'created_at'>
export type MaquinaPayload = Omit<Maquina, 'id' | 'created_at'>
export type MaterialPayload = Omit<Material, 'id' | 'created_at'>
export type PosicaoPayload = Omit<Posicao, 'id' | 'created_at' | 'updated_at'>
export type OperacaoPosicaoPayload = Omit<OperacaoPosicao, 'id' | 'created_at' | 'updated_at'>
export interface Database {
  public: {
    Tables: {
      profiles:            { Row: Profile;           Insert: Omit<Profile, 'created_at'>;                             Update: Partial<Omit<Profile, 'id'>> }
      clientes:            { Row: Cliente;           Insert: Omit<Cliente, 'id' | 'created_at'>;                      Update: Partial<Omit<Cliente, 'id' | 'created_at'>> }
      maquinas:            { Row: Maquina;           Insert: Omit<Maquina, 'id' | 'created_at'>;                      Update: Partial<Omit<Maquina, 'id' | 'created_at'>> }
      material:            { Row: Material;          Insert: Omit<Material, 'id' | 'created_at'>;                     Update: Partial<Omit<Material, 'id' | 'created_at'>> }
      ordens_servico:      { Row: OrdemServico;      Insert: Omit<OrdemServico, 'id' | 'created_at' | 'updated_at'>;  Update: Partial<Omit<OrdemServico, 'id' | 'created_at'>> }
      historico_status_os: { Row: HistoricoStatusOS; Insert: Omit<HistoricoStatusOS, 'id' | 'created_at'>;            Update: never }
      posicoes:            { Row: Posicao;           Insert: Omit<Posicao, 'id' | 'created_at' | 'updated_at'>;       Update: Partial<Omit<Posicao, 'id' | 'created_at'>> }
      operacoes_posicao:   { Row: OperacaoPosicao;   Insert: Omit<OperacaoPosicao, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<OperacaoPosicao, 'id' | 'created_at'>> }
      orcamento_materiais: { Row: OrcamentoMaterial; Insert: Omit<OrcamentoMaterial, 'id' | 'created_at'>;            Update: Partial<Omit<OrcamentoMaterial, 'id' | 'created_at'>> }
      carga:               { Row: Carga;             Insert: Omit<Carga, 'id' | 'created_at'>;                        Update: Partial<Omit<Carga, 'id' | 'created_at'>> }
      datas_uteis:         { Row: DataUtil;          Insert: Omit<DataUtil, 'id'>;                                    Update: Partial<Omit<DataUtil, 'id'>> }
    }
  }
}
"@
Set-Content -Path "src\types\database.ts" -Value $database -Encoding UTF8
Write-Host "  [OK] src/types/database.ts" -ForegroundColor Green

# src/lib/supabaseClient.ts
$client = @"
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variaveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nao configuradas')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
"@
Set-Content -Path "src\lib\supabaseClient.ts" -Value $client -Encoding UTF8
Write-Host "  [OK] src/lib/supabaseClient.ts" -ForegroundColor Green

# src/contexts/AuthContext.tsx
$auth = @"
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Profile, Perfil } from '../types/database'

interface AuthContextData {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  perfil: Perfil | null
  isAdmin: boolean
  isOrcamentista: boolean
  isPCP: boolean
  isGerente: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) return null
    return data
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) setProfile(await fetchProfile(s.user.id))
      setLoading(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) setProfile(await fetchProfile(s.user.id))
      else setProfile(null)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return { error: traduzirErro(error.message) }
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null); setUser(null); setSession(null)
  }

  const perfil = profile?.perfil ?? null

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading, perfil,
      isAdmin: perfil === 'admin',
      isOrcamentista: perfil === 'orcamentista',
      isPCP: perfil === 'pcp',
      isGerente: perfil === 'gerente',
      signIn, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}

function traduzirErro(message: string): string {
  const erros: Record<string, string> = {
    'Invalid login credentials': 'Email ou senha incorretos',
    'Email not confirmed': 'Email ainda nao confirmado',
    'User not found': 'Usuario nao encontrado',
    'Too many requests': 'Muitas tentativas. Aguarde um momento',
  }
  return erros[message] ?? 'Erro ao fazer login. Tente novamente'
}
"@
Set-Content -Path "src\contexts\AuthContext.tsx" -Value $auth -Encoding UTF8
Write-Host "  [OK] src/contexts/AuthContext.tsx" -ForegroundColor Green

# src/components/ProtectedRoute.tsx
$protected = @"
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { Perfil } from '../types/database'

interface Props {
  children: React.ReactNode
  perfisPermitidos?: Perfil[]
}

export default function ProtectedRoute({ children, perfisPermitidos }: Props) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Carregando...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (perfisPermitidos && profile && !perfisPermitidos.includes(profile.perfil)) {
    return <Navigate to="/sem-permissao" replace />
  }

  return <>{children}</>
}
"@
Set-Content -Path "src\components\ProtectedRoute.tsx" -Value $protected -Encoding UTF8
Write-Host "  [OK] src/components/ProtectedRoute.tsx" -ForegroundColor Green

# src/pages/Login.tsx
$login = @"
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)
    setLoading(true)
    const { error } = await signIn(email, senha)
    setLoading(false)
    if (error) { setErro(error); return }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">SSV</h1>
          <p className="text-gray-500 mt-1">Gestao da Ferramentaria</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" required autoFocus
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="..." required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{erro}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
"@
Set-Content -Path "src\pages\Login.tsx" -Value $login -Encoding UTF8
Write-Host "  [OK] src/pages/Login.tsx" -ForegroundColor Green

# src/pages/SemPermissao.tsx
$semperm = @"
import { useNavigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'

export default function SemPermissao() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <ShieldOff size={48} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Acesso negado</h1>
        <p className="text-gray-500 mb-6">Voce nao tem permissao para acessar esta pagina.</p>
        <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Voltar ao inicio
        </button>
      </div>
    </div>
  )
}
"@
Set-Content -Path "src\pages\SemPermissao.tsx" -Value $semperm -Encoding UTF8
Write-Host "  [OK] src/pages/SemPermissao.tsx" -ForegroundColor Green

# src/pages/Home.tsx
$home = @"
export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800">Home</h1>
    </div>
  )
}
"@
Set-Content -Path "src\pages\Home.tsx" -Value $home -Encoding UTF8
Write-Host "  [OK] src/pages/Home.tsx" -ForegroundColor Green

# Placeholders
$pages = @(
  @("src\pages\admin\CadastroOS.tsx", "CadastroOS"),
  @("src\pages\admin\CadastroClientes.tsx", "CadastroClientes"),
  @("src\pages\orcamentista\CadastroMaquina.tsx", "CadastroMaquina"),
  @("src\pages\orcamentista\CadastroMaterial.tsx", "CadastroMaterial"),
  @("src\pages\orcamentista\CadastroProcesso.tsx", "CadastroProcesso"),
  @("src\pages\pcp\DiasUteis.tsx", "DiasUteis"),
  @("src\pages\pcp\ControleCarga.tsx", "ControleCarga"),
  @("src\pages\gerente\Dashboard.tsx", "Dashboard")
)
foreach ($p in $pages) {
  $c = "export default function $($p[1])() { return <div className=""p-8""><h1 className=""text-2xl font-bold"">$($p[1])</h1></div> }"
  Set-Content -Path $p[0] -Value $c -Encoding UTF8
  Write-Host "  [OK] $($p[0])" -ForegroundColor Green
}

# src/App.tsx
$app = @"
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login            from './pages/Login'
import Home             from './pages/Home'
import SemPermissao     from './pages/SemPermissao'
import CadastroClientes from './pages/admin/CadastroClientes'
import CadastroOS       from './pages/admin/CadastroOS'
import CadastroMaquina  from './pages/orcamentista/CadastroMaquina'
import CadastroMaterial from './pages/orcamentista/CadastroMaterial'
import CadastroProcesso from './pages/orcamentista/CadastroProcesso'
import DiasUteis        from './pages/pcp/DiasUteis'
import ControleCarga    from './pages/pcp/ControleCarga'
import Dashboard        from './pages/gerente/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/sem-permissao" element={<SemPermissao />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute perfisPermitidos={['admin']}><CadastroClientes /></ProtectedRoute>} />
          <Route path="/cadastro-os" element={<ProtectedRoute perfisPermitidos={['admin']}><CadastroOS /></ProtectedRoute>} />
          <Route path="/maquinas" element={<ProtectedRoute perfisPermitidos={['admin','orcamentista']}><CadastroMaquina /></ProtectedRoute>} />
          <Route path="/materiais" element={<ProtectedRoute perfisPermitidos={['admin','orcamentista']}><CadastroMaterial /></ProtectedRoute>} />
          <Route path="/cadastro-processo" element={<ProtectedRoute perfisPermitidos={['admin','orcamentista']}><CadastroProcesso /></ProtectedRoute>} />
          <Route path="/dias-uteis" element={<ProtectedRoute perfisPermitidos={['admin','pcp']}><DiasUteis /></ProtectedRoute>} />
          <Route path="/carga" element={<ProtectedRoute perfisPermitidos={['admin','pcp']}><ControleCarga /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute perfisPermitidos={['admin','gerente']}><Dashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
"@
Set-Content -Path "src\App.tsx" -Value $app -Encoding UTF8
Write-Host "  [OK] src/App.tsx" -ForegroundColor Green

# src/main.tsx
$main = @"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
"@
Set-Content -Path "src\main.tsx" -Value $main -Encoding UTF8
Write-Host "  [OK] src/main.tsx" -ForegroundColor Green

# src/index.css
Set-Content -Path "src\index.css" -Value '@import "tailwindcss";' -Encoding UTF8
Write-Host "  [OK] src/index.css" -ForegroundColor Green

# vite.config.ts
$vite = @"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
"@
Set-Content -Path "vite.config.ts" -Value $vite -Encoding UTF8
Write-Host "  [OK] vite.config.ts" -ForegroundColor Green

# .env.example
Set-Content -Path ".env.example" -Value "VITE_SUPABASE_URL=https://xxxx.supabase.co`nVITE_SUPABASE_ANON_KEY=eyJ..." -Encoding UTF8
Write-Host "  [OK] .env.example" -ForegroundColor Green

Write-Host ""
Write-Host "Pronto! Estrutura criada com sucesso." -ForegroundColor Cyan
Write-Host "Lembre de criar o arquivo .env com suas chaves do Supabase." -ForegroundColor Yellow
