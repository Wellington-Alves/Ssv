import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import {
  MessageSquare, ChevronDown, Loader2, CheckCircle,
  XCircle, Building2, Calendar, FileText, ChevronRight,
} from 'lucide-react'

interface OSItem {
  id: number
  numero_os_cliente: string | null
  desenho: string | null
  data_entrega: string | null
  data_cadastro: string
  empresa_nome: string
  coordenador_nome: string
  status: string
}

const formatDate = (d: string | null) => {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`
}

const labelCls = "block text-xs font-medium text-gray-500 mb-1"
const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition"

export default function RespostaCliente() {
  const location = useLocation()
  const [osList, setOsList] = useState<OSItem[]>([])
  const [osSelecionada, setOsSelecionada] = useState<OSItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [osDropdown, setOsDropdown] = useState(false)
  const [buscaOs, setBuscaOs] = useState('')
  const [resposta, setResposta] = useState<'aprovado' | 'reprovado' | null>(null)
  const [observacao, setObservacao] = useState('')
  const [concluido, setConcluido] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'erro' } | null>(null)

  const showToast = (msg: string, tipo: 'ok' | 'erro' = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      const { data: os } = await supabase
        .from('ordens_servico')
        .select('id, numero_os_cliente, desenho, data_entrega, data_cadastro, empresa_id, coordenador_id, status')
        .eq('status', 'enviado')
        .order('data_cadastro', { ascending: true })

      if (!os || os.length === 0) { setOsList([]); setLoading(false); return }

      const empresaIds = [...new Set(os.map((o: any) => o.empresa_id))]
      const coordIds = [...new Set(os.filter((o: any) => o.coordenador_id).map((o: any) => o.coordenador_id))]

      const [{ data: empresas }, { data: coords }] = await Promise.all([
        supabase.from('empresas').select('id, nome').in('id', empresaIds),
        supabase.from('coordenadores').select('id, nome').in('id', coordIds),
      ])

      const empMap = Object.fromEntries((empresas ?? []).map((e: any) => [e.id, e.nome]))
      const coordMap = Object.fromEntries((coords ?? []).map((c: any) => [c.id, c.nome]))

      setOsList(os.map((o: any) => ({
        id: o.id,
        numero_os_cliente: o.numero_os_cliente,
        desenho: o.desenho,
        data_entrega: o.data_entrega,
        data_cadastro: o.data_cadastro,
        empresa_nome: empMap[o.empresa_id] ?? '—',
        coordenador_nome: coordMap[o.coordenador_id] ?? '—',
        status: o.status,
      })))
      setLoading(false)
    }
    carregar()
  }, [])

  // Auto-selecionar OS vinda do dashboard
  useEffect(() => {
    const state = location.state as { os_id?: number } | null
    if (state?.os_id && osList.length > 0) {
      const os = osList.find(o => o.id === state.os_id)
      if (os) selecionarOS(os)
    }
  }, [osList, location.state])

  const selecionarOS = (os: OSItem) => {
    setOsSelecionada(os)
    setOsDropdown(false)
    setBuscaOs('')
    setResposta(null)
    setObservacao('')
    setConcluido(false)
  }

  const registrarResposta = async () => {
    if (!osSelecionada || !resposta) return
    if (resposta === 'reprovado' && !observacao.trim()) {
      showToast('Informe o motivo da reprovação', 'erro')
      return
    }
    setSalvando(true)
    try {
      await supabase
        .from('ordens_servico')
        .update({
          status: resposta,
          ...(observacao.trim() ? { observacao } : {}),
        })
        .eq('id', osSelecionada.id)

      setConcluido(true)
      setOsList(prev => prev.filter(o => o.id !== osSelecionada.id))
      showToast(resposta === 'aprovado' ? 'OS aprovada com sucesso!' : 'OS reprovada registrada!')
    } catch {
      showToast('Erro ao registrar resposta', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const osFiltradas = osList.filter(o =>
    (o.numero_os_cliente ?? String(o.id)).toLowerCase().includes(buscaOs.toLowerCase()) ||
    o.empresa_nome.toLowerCase().includes(buscaOs.toLowerCase())
  )

  return (
    <div className="min-h-full p-6 md:p-8">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium
          ${toast.tipo === 'ok' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <MessageSquare size={20} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Resposta do Cliente</h1>
          <p className="text-xs text-gray-500">Registre a resposta do cliente para os orçamentos enviados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Coluna esquerda: seleção + info ── */}
        <div className="space-y-4">

          {/* Seleção OS */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <label className={labelCls}>OS Aguardando Resposta</label>
            <div className="relative">
              <div onClick={() => setOsDropdown(o => !o)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm flex items-center gap-2 cursor-pointer hover:border-sky-500/50 transition">
                <span className={`flex-1 ${osSelecionada ? 'text-white' : 'text-gray-600'}`}>
                  {osSelecionada ? `OS #${osSelecionada.id} — ${osSelecionada.empresa_nome}` : 'Selecionar OS...'}
                </span>
                <ChevronDown size={14} className="text-gray-500" />
              </div>

              {osDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e2130] border border-white/[0.1] rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-white/[0.06]">
                    <input type="text" placeholder="Buscar OS..." value={buscaOs}
                      onChange={e => setBuscaOs(e.target.value)} autoFocus
                      className="w-full bg-white/[0.04] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none" />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={16} className="text-gray-600 animate-spin" />
                      </div>
                    ) : osFiltradas.length === 0 ? (
                      <p className="text-xs text-gray-600 px-3 py-3">Nenhuma OS aguardando resposta</p>
                    ) : osFiltradas.map(os => (
                      <button key={os.id} onClick={() => selecionarOS(os)}
                        className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition border-b border-white/[0.03] last:border-0">
                        <p className="text-sm text-white font-medium">
                          OS #{os.id} {os.numero_os_cliente ? `· ${os.numero_os_cliente}` : ''}
                        </p>
                        <p className="text-xs text-gray-500">{os.empresa_nome} · Entrega: {formatDate(os.data_entrega)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Lista rápida */}
            {!osSelecionada && !loading && osList.length > 0 && (
              <div className="mt-3 space-y-1">
                {osList.slice(0, 5).map(os => (
                  <button key={os.id} onClick={() => selecionarOS(os)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition text-left">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-xs text-gray-300 flex-1 truncate">
                      {os.numero_os_cliente ?? `OS #${os.id}`} — {os.empresa_nome}
                    </span>
                    <ChevronRight size={12} className="text-gray-600" />
                  </button>
                ))}
              </div>
            )}

            {osSelecionada && (
              <div className="mt-3 bg-white/[0.02] rounded-lg px-3 py-2 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <Building2 size={11} className="text-gray-600" />
                  <span className="text-gray-300">{osSelecionada.empresa_nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={11} className="text-gray-600" />
                  <span className="text-gray-300">Entrega: {formatDate(osSelecionada.data_entrega)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare size={11} className="text-gray-600" />
                  <span className="text-gray-300">Coordenador: {osSelecionada.coordenador_nome}</span>
                </div>
              </div>
            )}
          </div>

          {/* Contador de OS aguardando */}
          {osList.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-500/[0.08] border border-blue-500/20 rounded-xl">
              <MessageSquare size={14} className="text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-300">
                <span className="font-bold">{osList.length}</span> OS aguardando resposta
              </p>
            </div>
          )}
        </div>

        {/* ── Coluna direita: registrar resposta ── */}
        <div className="lg:col-span-2">
          {!osSelecionada ? (
            <div className="flex items-center justify-center py-32">
              <div className="text-center">
                <MessageSquare size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Selecione uma OS para registrar a resposta</p>
              </div>
            </div>
          ) : concluido ? (
            <div className="flex items-center justify-center py-32">
              <div className="text-center">
                {resposta === 'aprovado'
                  ? <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
                  : <XCircle size={40} className="text-rose-400 mx-auto mb-3" />}
                <p className="text-white font-semibold text-lg">
                  {resposta === 'aprovado' ? 'OS Aprovada!' : 'OS Reprovada'}
                </p>
                <p className="text-gray-500 text-sm mt-1">Resposta registrada com sucesso</p>
                <button
                  onClick={() => { setOsSelecionada(null); setConcluido(false); setResposta(null); setObservacao('') }}
                  className="mt-4 px-4 py-2 text-xs text-sky-400 hover:text-sky-300 transition">
                  Registrar outra resposta
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.05]">
                <MessageSquare size={14} className="text-violet-400" />
                <h2 className="text-sm font-bold text-white">Registrar Resposta</h2>
                <span className="text-xs text-gray-600 ml-auto">
                  OS #{osSelecionada.id} · {osSelecionada.empresa_nome}
                </span>
              </div>

              <div className="p-5 space-y-5">

                {/* Botões de resposta */}
                <div>
                  <label className={labelCls}>Resposta do Cliente</label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                      onClick={() => setResposta('aprovado')}
                      className={`flex items-center justify-center gap-2 py-4 rounded-xl border transition-all
                        ${resposta === 'aprovado'
                          ? 'bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                          : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]'}`}>
                      <CheckCircle size={20} className={resposta === 'aprovado' ? 'text-emerald-400' : 'text-gray-600'} />
                      <span className={`font-semibold text-sm ${resposta === 'aprovado' ? 'text-emerald-400' : 'text-gray-400'}`}>
                        Aprovado
                      </span>
                    </button>

                    <button
                      onClick={() => setResposta('reprovado')}
                      className={`flex items-center justify-center gap-2 py-4 rounded-xl border transition-all
                        ${resposta === 'reprovado'
                          ? 'bg-rose-500/15 border-rose-500/40 shadow-lg shadow-rose-500/10'
                          : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]'}`}>
                      <XCircle size={20} className={resposta === 'reprovado' ? 'text-rose-400' : 'text-gray-600'} />
                      <span className={`font-semibold text-sm ${resposta === 'reprovado' ? 'text-rose-400' : 'text-gray-400'}`}>
                        Reprovado
                      </span>
                    </button>
                  </div>
                </div>

                {/* Observação — obrigatória se reprovado, opcional se aprovado */}
                <div>
                  <label className={labelCls}>
                    Observação {resposta === 'reprovado' ? <span className="text-rose-400">*obrigatório</span> : '(opcional)'}
                  </label>
                  <textarea
                    value={observacao}
                    onChange={e => setObservacao(e.target.value)}
                    placeholder={resposta === 'reprovado' ? 'Informe o motivo da reprovação...' : 'Alguma observação do cliente...'}
                    rows={5}
                    className={`${inputCls} resize-none ${resposta === 'reprovado' && !observacao.trim() ? 'border-rose-500/30' : ''}`}
                  />
                </div>

                {/* Preview do que será salvo */}
                {resposta && (
                  <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border
                    ${resposta === 'aprovado'
                      ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                      : 'bg-rose-500/[0.06] border-rose-500/20'}`}>
                    <FileText size={13} className={resposta === 'aprovado' ? 'text-emerald-400' : 'text-rose-400'} />
                    <p className={`text-xs ${resposta === 'aprovado' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      A OS será marcada como <strong>{resposta === 'aprovado' ? 'Aprovada' : 'Reprovada'}</strong> e
                      {resposta === 'aprovado' ? ' seguirá para produção.' : ' o orçamento precisará ser revisado.'}
                    </p>
                  </div>
                )}

                {/* Botão confirmar */}
                <button
                  onClick={registrarResposta}
                  disabled={!resposta || salvando || (resposta === 'reprovado' && !observacao.trim())}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition disabled:opacity-40
                    ${resposta === 'aprovado'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                      : resposta === 'reprovado'
                        ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20'
                        : 'bg-white/[0.05] text-gray-500'}`}>
                  {salvando
                    ? <Loader2 size={15} className="animate-spin" />
                    : resposta === 'aprovado'
                      ? <CheckCircle size={15} />
                      : resposta === 'reprovado'
                        ? <XCircle size={15} />
                        : <MessageSquare size={15} />}
                  {salvando ? 'Salvando...' : resposta === 'aprovado' ? 'Confirmar Aprovação' : resposta === 'reprovado' ? 'Confirmar Reprovação' : 'Selecione uma resposta'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
