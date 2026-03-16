import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import {
  ClipboardList, Loader2, ArrowRight, Clock, AlertCircle,
  Building2, Calendar, Calculator, ChevronRight,
} from 'lucide-react'

interface OSItem {
  id: number
  numero_os_cliente: string | null
  desenho: string | null
  data_cadastro: string
  data_entrega: string | null
  empresa_nome: string
  status: string
}

const formatDate = (d: string | null) => {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`
}

const diasRestantes = (data_entrega: string | null) => {
  if (!data_entrega) return null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const entrega = new Date(data_entrega + 'T00:00:00')
  return Math.ceil((entrega.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

type Filtro = 'liberado_orcamento' | 'processo_concluido'

export default function DashboardOrcamentista() {
  const navigate = useNavigate()
  const [osList, setOsList] = useState<OSItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('liberado_orcamento')

  const totalAguardando = osList.filter(o => o.status === 'liberado_orcamento').length
  const totalOrcamento  = osList.filter(o => o.status === 'processo_concluido').length
  const osFiltradas     = osList.filter(o => o.status === filtro)

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      const { data: os } = await supabase
        .from('ordens_servico')
        .select('id, numero_os_cliente, desenho, data_cadastro, data_entrega, empresa_id, status')
        .in('status', ['liberado_orcamento', 'processo_concluido'])
        .order('data_cadastro', { ascending: true })

      if (!os || os.length === 0) { setOsList([]); setLoading(false); return }

      const empresaIds = [...new Set(os.map((o: any) => o.empresa_id))]
      const { data: empresas } = await supabase.from('empresas').select('id, nome').in('id', empresaIds)
      const empresaMap = Object.fromEntries((empresas ?? []).map((e: any) => [e.id, e.nome]))

      setOsList(os.map((o: any) => ({
        id: o.id,
        numero_os_cliente: o.numero_os_cliente,
        desenho: o.desenho,
        data_cadastro: o.data_cadastro,
        data_entrega: o.data_entrega,
        empresa_nome: empresaMap[o.empresa_id] ?? '—',
        status: o.status,
      })))
      setLoading(false)
    }
    carregar()
  }, [])

  const handleClickOS = (os: OSItem) => {
    if (os.status === 'liberado_orcamento') {
      navigate('/cadastro-processo', { state: { os_id: os.id } })
    } else {
      navigate('/orcamento', { state: { os_id: os.id } })
    }
  }

  return (
    <div className="min-h-full p-6 md:p-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Olá, Orçamentista 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">Acompanhe as ordens de serviço em andamento</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setFiltro('liberado_orcamento')}
          className={`rounded-xl p-5 text-left border transition-all
            ${filtro === 'liberado_orcamento'
              ? 'bg-violet-500/10 border-violet-500/30 shadow-lg shadow-violet-500/5'
              : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center
              ${filtro === 'liberado_orcamento' ? 'bg-violet-500/20' : 'bg-white/[0.05]'}`}>
              <Clock size={18} className={filtro === 'liberado_orcamento' ? 'text-violet-400' : 'text-gray-500'} />
            </div>
            {filtro === 'liberado_orcamento' && (
              <span className="text-xs text-violet-400 font-medium">Selecionado</span>
            )}
          </div>
          <p className={`text-3xl font-bold mb-1 ${filtro === 'liberado_orcamento' ? 'text-violet-400' : 'text-white'}`}>
            {loading ? '—' : totalAguardando}
          </p>
          <p className="text-xs text-gray-500">Aguardando Processo</p>
        </button>

        <button
          onClick={() => setFiltro('processo_concluido')}
          className={`rounded-xl p-5 text-left border transition-all
            ${filtro === 'processo_concluido'
              ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
              : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center
              ${filtro === 'processo_concluido' ? 'bg-emerald-500/20' : 'bg-white/[0.05]'}`}>
              <Calculator size={18} className={filtro === 'processo_concluido' ? 'text-emerald-400' : 'text-gray-500'} />
            </div>
            {filtro === 'processo_concluido' && (
              <span className="text-xs text-emerald-400 font-medium">Selecionado</span>
            )}
          </div>
          <p className={`text-3xl font-bold mb-1 ${filtro === 'processo_concluido' ? 'text-emerald-400' : 'text-white'}`}>
            {loading ? '—' : totalOrcamento}
          </p>
          <p className="text-xs text-gray-500">Aguardando Orçamento</p>
        </button>
      </div>

      {/* Lista OS */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.05]">
          {filtro === 'liberado_orcamento'
            ? <Clock size={14} className="text-violet-400" />
            : <Calculator size={14} className="text-amber-400" />}
          <h2 className="text-sm font-bold text-white">
            {filtro === 'liberado_orcamento' ? 'Aguardando Processo' : 'Aguardando Orçamento'}
          </h2>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ml-1
            ${filtro === 'processo_concluido'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
            {osFiltradas.length}
          </span>
          <span className="ml-auto text-xs text-gray-600">
            {filtro === 'liberado_orcamento' ? 'Clique para abrir o Processo' : 'Clique para fazer o Orçamento'}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-gray-600 animate-spin" />
          </div>
        ) : osFiltradas.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList size={32} className="text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {filtro === 'liberado_orcamento' ? 'Nenhuma OS aguardando processo' : 'Nenhuma OS aguardando orçamento'}
            </p>
          </div>
        ) : (
          <div>
            {osFiltradas.map((os, i) => {
              const dias = diasRestantes(os.data_entrega)
              const urgente = dias !== null && dias <= 3 && dias >= 0
              const atrasado = dias !== null && dias < 0

              return (
                <button
                  key={os.id}
                  onClick={() => handleClickOS(os)}
                  className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.03] transition text-left
                    ${i < osFiltradas.length - 1 ? 'border-b border-white/[0.03]' : ''}
                    ${atrasado ? 'bg-rose-500/[0.02]' : urgente ? 'bg-amber-500/[0.02]' : ''}`}>

                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${atrasado ? 'bg-rose-500/10' : urgente ? 'bg-amber-500/10' : 'bg-white/[0.04]'}`}>
                    <ClipboardList size={14} className={atrasado ? 'text-rose-400' : urgente ? 'text-amber-400' : 'text-gray-500'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white font-medium">
                        OS #{os.id}
                        {os.numero_os_cliente && (
                          <span className="text-gray-500 font-normal ml-1.5 text-xs">· Cliente: {os.numero_os_cliente}</span>
                        )}
                      </p>
                      {atrasado && (
                        <span className="flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          <AlertCircle size={10} /> Atrasado
                        </span>
                      )}
                      {urgente && (
                        <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <AlertCircle size={10} /> Urgente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <Building2 size={10} />{os.empresa_nome}
                      </span>
                      {os.desenho && (
                        <span className="text-xs text-gray-600 truncate max-w-[150px]">{os.desenho}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      <Calendar size={10} /> {formatDate(os.data_cadastro)}
                    </span>
                    {os.data_entrega && (
                      <span className={`text-xs ${atrasado ? 'text-rose-400' : urgente ? 'text-amber-400' : 'text-gray-600'}`}>
                        Entrega: {formatDate(os.data_entrega)}
                        {dias !== null && (
                          <span className="ml-1">
                            ({atrasado ? `${Math.abs(dias)}d atraso` : `${dias}d`})
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <ChevronRight size={14} className="text-gray-700 flex-shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
