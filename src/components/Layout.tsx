import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Building2, Send, ClipboardList, Cpu, Package,
  GitBranch, Calendar, BarChart2, Clock, LogOut, Menu, X,
  ShieldCheck, Wrench, CalendarClock, BarChart, ChevronDown,
  LayoutDashboard, Calculator, MessageSquare,
} from 'lucide-react'
import type { Perfil } from '../types/database'

interface SubItem {
  label: string
  path: string
  icon: React.ReactNode
}

interface NavGroup {
  id: string
  groupLabel: string
  groupIcon: React.ReactNode
  perfis: Perfil[]
  items: SubItem[]
  homePath?: string
}

const navGroups: NavGroup[] = [
  {
    id: 'adm',
    groupLabel: 'ADM',
    groupIcon: <ShieldCheck size={15} />,
    perfis: ['admin', 'diretoria'],
    homePath: '/dashboard-adm',
    items: [
      { label: 'Cadastro de Clientes', path: '/clientes',      icon: <Building2 size={14} /> },
      { label: 'Cadastro de Serviços', path: '/cadastro-os',    icon: <ClipboardList size={14} /> },
      { label: 'Enviar Orçamento',     path: '/enviar-orcamento',  icon: <Send size={14} /> },
      { label: 'Resposta do Cliente',   path: '/resposta-cliente',  icon: <MessageSquare size={14} /> },
    ],
  },
  {
    id: 'orc',
    groupLabel: 'Orçamentista',
    groupIcon: <Wrench size={15} />,
    perfis: ['orcamentista', 'diretoria'],
    homePath: '/dashboard-orcamentista',
    items: [
      { label: 'Processos',  path: '/cadastro-processo', icon: <GitBranch size={14} /> },
      { label: 'Orçamento',  path: '/orcamento',         icon: <Calculator size={14} /> },
      { label: 'Materiais',  path: '/materiais',         icon: <Package size={14} /> },
      { label: 'Máquinas',   path: '/maquinas',          icon: <Cpu size={14} /> },
      { label: 'Dias Úteis', path: '/dias-uteis',        icon: <Calendar size={14} /> },
    ],
  },
  {
    id: 'pcp',
    groupLabel: 'PCP',
    groupIcon: <CalendarClock size={15} />,
    perfis: ['pcp', 'diretoria'],
    items: [
      { label: 'Dias Úteis',        path: '/dias-uteis',  icon: <Calendar size={14} /> },
      { label: 'Controle de Carga', path: '/carga',       icon: <BarChart2 size={14} /> },
      { label: 'Gasto de Horas',    path: '/gasto-horas', icon: <Clock size={14} /> },
    ],
  },
  {
    id: 'ger',
    groupLabel: 'Gerência',
    groupIcon: <BarChart size={15} />,
    perfis: ['gerente', 'diretoria'],
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={14} /> },
    ],
  },
]

const perfilLabel: Record<string, string> = {
  admin: 'Administrador',
  orcamentista: 'Orçamentista',
  pcp: 'PCP',
  gerente: 'Gerente',
  diretoria: 'Diretoria',
}

const perfilColor: Record<string, string> = {
  admin: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  orcamentista: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  pcp: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  gerente: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  diretoria: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

export default function Layout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const perfil = profile?.perfil as Perfil | undefined
  const visibleGroups = navGroups.filter(g => perfil && g.perfis.includes(perfil))

  const [expandidos, setExpandidos] = useState<Record<string, boolean>>(
    () => Object.fromEntries(navGroups.map(g => [g.id, true]))
  )

  const toggleGrupo = (id: string) => {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const nomeExibido = profile?.nome ?? user?.email?.split('@')[0] ?? 'Usuário'

  return (
    <div className="flex h-screen bg-[#0f1117] text-white overflow-hidden">

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`
        fixed md:relative z-30 h-full flex flex-col
        bg-[#13151f] border-r border-white/[0.06]
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-56' : 'w-14'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        <div className="flex items-center justify-between px-3 py-4 border-b border-white/[0.06]">
          {sidebarOpen && (
            <span className="text-base font-bold tracking-tight pl-1">
              SSV<span className="text-sky-400">.</span>
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition ml-auto"
          >
            {sidebarOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1">
          {visibleGroups.map(group => {
            const isExpanded = expandidos[group.id] ?? true
            const grupoAtivo =
              group.items.some(i => i.path === location.pathname) ||
              location.pathname === group.homePath

            const handleGroupClick = () => {
              if (!sidebarOpen) return
              if (group.homePath) {
                navigate(group.homePath)
              } else {
                toggleGrupo(group.id)
              }
            }

            return (
              <div key={group.id} className="px-2">
                <button
                  onClick={handleGroupClick}
                  title={!sidebarOpen ? group.groupLabel : undefined}
                  className={`
                    w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all
                    ${grupoAtivo ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
                    ${sidebarOpen ? 'justify-between' : 'justify-center'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className={grupoAtivo ? 'text-sky-400' : ''}>{group.groupIcon}</span>
                    {sidebarOpen && (
                      <span className="text-[11px] font-bold uppercase tracking-widest">
                        {group.groupLabel}
                      </span>
                    )}
                  </div>
                  {sidebarOpen && !group.homePath && (
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                    />
                  )}
                  {!sidebarOpen && (
                    <span className="absolute left-full ml-3 px-2 py-1 bg-gray-800 text-white text-xs rounded-md
                      opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl transition-opacity">
                      {group.groupLabel}
                    </span>
                  )}
                </button>

                <div className={`overflow-hidden transition-all duration-200 ${isExpanded || !sidebarOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <ul className="mt-0.5 space-y-0.5 mb-2">
                    {group.items.map(item => (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          title={!sidebarOpen ? item.label : undefined}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 rounded-lg text-sm transition-all group relative
                            ${sidebarOpen ? 'pl-6 pr-2 py-2' : 'px-2 py-2 justify-center'}
                            ${isActive
                              ? 'bg-sky-500/10 text-sky-400'
                              : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span className={`flex-shrink-0 ${isActive ? 'text-sky-400' : ''}`}>
                                {item.icon}
                              </span>
                              {sidebarOpen && (
                                <span className="truncate text-xs">{item.label}</span>
                              )}
                              {!sidebarOpen && (
                                <span className="absolute left-full ml-3 px-2 py-1 bg-gray-800 text-white text-xs rounded-md
                                  opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl transition-opacity">
                                  {item.label}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            )
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <div className={`flex items-center gap-2.5 ${!sidebarOpen ? 'flex-col' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase">
              {nomeExibido[0]}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{nomeExibido}</p>
                {perfil && (
                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border font-medium mt-0.5 ${perfilColor[perfil] ?? ''}`}>
                    {perfilLabel[perfil] ?? perfil}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={handleSignOut}
              title="Sair"
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-500 hover:text-rose-400 transition"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#13151f] border-b border-white/[0.06]">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-400">
            <Menu size={20} />
          </button>
          <span className="text-base font-bold tracking-tight">SSV<span className="text-sky-400">.</span></span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto bg-[#0f1117]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
