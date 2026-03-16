import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import {
  ClipboardList, Send, CheckCircle,
  Plus, Loader2, ArrowRight, TrendingUp,
  AlertCircle, Search
} from 'lucide-react'

interface OSCounts {
  cadastrado: number
  orcado: number
  enviado: number
  aprovado: number
  reprovado: number
  concluido: number
  total: number
}

interface OSRecente {
  id: number
  numero_os_cliente: string | null
  desenho: string | null
  status: string
  data_cadastro: string
  empresa_id: number | null
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  'liberado_orcamento': { label: 'Aguard. Processo',   color: 'text-gray-400',    bg: 'bg-gray-500/10',    dot: 'bg-gray-400' },
  'processo_concluido': { label: 'Aguard. Orçamento',  color: 'text-violet-400',  bg: 'bg-violet-500/10',  dot: 'bg-violet-400' },
  'orcado':             { label: 'Orçado',             color: 'text-amber-400',   bg: 'bg-amber-500/10',   dot: 'bg-amber-400' },
  'enviado':            { label: 'Enviado',            color: 'text-blue-400',    bg: 'bg-blue-500/10',    dot: 'bg-blue-400' },
  'aprovado':           { label: 'Aprovado',           color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
  'reprovado':          { label: 'Reprovado',          color: 'text-rose-400',    bg: 'bg-rose-500/10',    dot: 'bg-rose-400' },
  'concluido':          { label: 'Concluído',          color: 'text-sky-400',     bg: 'bg-sky-500/10',     dot: 'bg-sky-400' },
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function DashboardADM({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [counts, setCounts] = useState<OSCounts>({
    cadastrado: 0, orcado: 0, enviado: 0, aprovado: 0, reprovado: 0, concluido: 0, total: 0,
  })
  const [recentes, setRecentes] = useState<OSRecente[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [todasOS, setTodasOS] = useState<OSRecente[]>([])
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)

      const { data: os } = await supabase
        .from('ordens_servico').select('id, numero_os_cliente, desenho, status, data_cadastro').order('data_cadastro', { ascending: false })

      if (os) {
        const c: OSCounts = {
          cadastrado: os.filter(o => o.status === 'liberado_orcamento' || o.status === 'processo_concluido').length,
          orcado:     os.filter(o => o.status === 'orcado').length,
          enviado:    os.filter(o => o.status === 'enviado').length,
          aprovado:   os.filter(o => o.status === 'aprovado').length,
          reprovado:  os.filter(o => o.status === 'reprovado').length,
          concluido:  os.filter(o => o.status === 'concluido').length,
          total:      os.length,
        }
        setCounts(c)
        setTodasOS(os)
        setRecentes(os.slice(0, 6))
      }

      setLoading(false)
    }

    carregar()
  }, [])

  const cards = [
    {
      label: 'Cadastradas',
      value: counts.cadastrado,
      icon: ClipboardList,
      color: 'text-gray-400',
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/20',
      glow: 'shadow-gray-500/10',
      desc: 'Aguardando orçamento',
      status: 'cadastradas',
    },
    {
      label: 'Orçadas',
      value: counts.orcado,
      icon: TrendingUp,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      glow: 'shadow-amber-500/10',
      desc: 'Orçamento concluído',
      status: 'orcado',
    },
    {
      label: 'Enviadas ao Cliente',
      value: counts.enviado,
      icon: Send,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      glow: 'shadow-blue-500/10',
      desc: 'Aguardando resposta',
      status: 'enviado',
    },

  ]

  return (
    <div className="min-h-full p-6 md:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral das Ordens de Serviço</p>
        </div>
        <button
          onClick={() => navigate('/cadastro-os', { state: { novo: true } })}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-lg transition shadow-lg shadow-sky-500/20"
        >
          <Plus size={16} /> Nova OS
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={28} className="text-gray-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Cards de status */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {cards.map((card) => {
              const Icon = card.icon
              const selecionado = filtroStatus === card.status
              return (
                <button key={card.label}
                  onClick={() => setFiltroStatus(selecionado ? null : card.status)}
                  className={`text-left bg-white/[0.03] border ${card.border} rounded-xl p-4 shadow-lg ${card.glow} hover:bg-white/[0.05] transition
                    ${selecionado ? 'ring-2 ring-offset-2 ring-offset-[#0f1117] ring-current ' + card.color : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                      <Icon size={18} className={card.color} />
                    </div>
                    <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{card.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{card.desc}</p>
                </button>
              )
            })}
          </div>

          {/* Busca */}
          <div className="relative mb-6">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="Buscar por OS, empresa ou desenho..."
              value={busca}
              onChange={e => { setBusca(e.target.value); setFiltroStatus(null) }}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition"
            />
          </div>

          {/* OS Recentes */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <h2 className="text-sm font-bold text-white">{busca ? `Busca: "${busca}"` : filtroStatus ? (STATUS_MAP[filtroStatus]?.label ?? filtroStatus) : 'OS Recentes'}</h2>
              <button
                onClick={() => navigate('/cadastro-os')}
                className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition"
              >
                Ver todas <ArrowRight size={12} />
              </button>
            </div>

            {(() => { const lista = (() => {
                let l = filtroStatus ? todasOS.filter(o => o.status === filtroStatus) : busca ? todasOS : recentes
                if (busca) l = todasOS.filter(o =>
                  String(o.id).includes(busca) ||
                  (o.numero_os_cliente ?? '').toLowerCase().includes(busca.toLowerCase()) ||
                  (o.desenho ?? '').toLowerCase().includes(busca.toLowerCase())
                )
                if (filtroStatus && !busca) l = todasOS.filter(o => filtroStatus === 'cadastradas' ? (o.status === 'liberado_orcamento' || o.status === 'processo_concluido') : o.status === filtroStatus)
                return l
              })(); const lista2 = lista; return lista2.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList size={32} className="text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Nenhuma OS cadastrada</p>
              </div>
            ) : (
              <div>
                {lista2.map((os, i) => {
                  const st = STATUS_MAP[os.status] ?? { label: os.status, color: 'text-gray-400', bg: 'bg-gray-500/10', dot: 'bg-gray-400' }
                  return (
                    <div key={os.id}
                      onClick={() => { if (os.status === 'orcado') navigate('/enviar-orcamento', { state: { os_id: os.id } })
                        else if (os.status === 'enviado') navigate('/resposta-cliente', { state: { os_id: os.id } }) }}
                      className={`flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition ${i < lista2.length - 1 ? 'border-b border-white/[0.03]' : ''} ${['orcado','enviado'].includes(os.status) ? 'cursor-pointer' : ''}`}>
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                        <ClipboardList size={14} className="text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          OS #{os.id}{os.numero_os_cliente && <span className="text-gray-500 font-normal ml-1.5 text-xs">· Cliente: {os.numero_os_cliente}</span>}
                        </p>
                        {os.desenho && (
                          <p className="text-xs text-gray-600 truncate">{os.desenho}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${st.bg} ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                        <span className="text-xs text-gray-600 hidden sm:block">
                          {formatDate(os.data_cadastro)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ); })()} 
          </div>
        </>
      )}
    </div>
  )
}
