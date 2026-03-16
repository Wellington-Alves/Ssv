import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import {
  GitBranch, Plus, Trash2, Save, Loader2, X, Check, ChevronDown, Download, FileText,
} from 'lucide-react'

// ─── Interfaces ───────────────────────────────────────────────
interface OS {
  id: number
  numero_os_cliente: string | null
  empresa_nome?: string
  data_entrega: string | null
}

interface Posicao {
  id: number
  os_id: number
  posicao: number
  quantidade_pecas: number | null
  quantidade_material: number | null
  tipo: string | null
  formato: string | null
  material_id: number | null
  beneficiado: boolean
  bitola: string | null
  largura: number | null
  comprimento: number | null
  parede: string | null
  status_posicao: string | null
}

interface Operacao {
  id?: number
  posicao_id?: number
  ordem: number
  maquina_id: number | null
  horas: number | null
  status: string
  observacao: string
}

interface Maquina {
  id: number
  maquina: string
  jornada: number
}

interface Material {
  id: number
  nome_material: string
}

// ─── Constantes ───────────────────────────────────────────────
const TIPOS = ['Laminado', 'Trefilado', 'C.M', 'C.A', 'Reaproveitamento']
const FORMATOS = ['Ø', '#', 'Tubo Ø', 'Tubo #', 'Trefilado', 'Sextavado']
const BITOLAS = [
  '1/4" (6,35mm)', '3/8" (9,525mm)', '1/2" (12,7mm)', '5/8" (15,875mm)',
  '3/4" (19,05mm)', '7/8" (22,225mm)', '1" (25,4mm)', '1 1/4" (31,75mm)',
  '1 1/2" (38,1mm)', '1 3/4" (44,45mm)', '2" (50,8mm)', '2 1/2" (63,5mm)',
  '3" (76,2mm)', '4" (101,6mm)', '5" (127mm)', '6" (152,4mm)',
]
const STATUS_OP = ['', 'aguardando_material', 'em_andamento', 'concluida', 'cancelada']

const STATUS_OP_LABELS: Record<string, string> = {
  '': '—',
  'aguardando_material': 'Aguardando Material',
  'em_andamento': 'Em Andamento',
  'concluida': 'Concluída',
  'cancelada': 'Cancelada',
}

const emptyOp = (): Operacao => ({ ordem: 0, maquina_id: null, horas: null, status: '', observacao: '' })

const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition"
const selectCls = "w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 transition"
const labelCls = "block text-xs font-medium text-gray-500 mb-1"

const formatDate = (d: string | null) => {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`
}

// ─── Componente Principal ─────────────────────────────────────
export default function CadastroProcesso() {
  const [osList, setOsList] = useState<OS[]>([])
  const [maquinas, setMaquinas] = useState<Maquina[]>([])
  const [materiais, setMateriais] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'erro' } | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; posicao: Posicao | null }>({ open: false, posicao: null })

  // Seleção
  const [osSelecionada, setOsSelecionada] = useState<OS | null>(null)
  const [posicoes, setPosicoes] = useState<Posicao[]>([])
  const [posicaoSelecionada, setPosicaoSelecionada] = useState<Posicao | null>(null)

  // Form posição
  const [form, setForm] = useState<Partial<Posicao>>({})
  const [operacoes, setOperacoes] = useState<Operacao[]>([emptyOp()])
  const [novaPosicao, setNovaPosicao] = useState(false)

  // Dropdowns
  const [osDropdown, setOsDropdown] = useState(false)
  const [buscaOs, setBuscaOs] = useState('')

  // Anexos
  const [anexos, setAnexos] = useState<{ id: number; nome_arquivo: string; storage_path: string; tamanho: number | null }[]>([])
  const [baixandoTodos, setBaixandoTodos] = useState(false)

  const location = useLocation()

  // Auto-selecionar OS vinda do dashboard
  useEffect(() => {
    const state = location.state as { os_id?: number } | null
    if (state?.os_id && osList.length > 0) {
      const os = osList.find(o => o.id === state.os_id)
      if (os) selecionarOS(os)
    }
  }, [osList, location.state])

  const showToast = (msg: string, tipo: 'ok' | 'erro' = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  // ─── Carregar dados iniciais ───────────────────────────────
  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      const [{ data: os }, { data: maq }, { data: mat }] = await Promise.all([
        supabase.from('ordens_servico')
          .select('id, numero_os_cliente, data_entrega, empresa_id')
          .eq('status', 'liberado_orcamento')
          .order('id', { ascending: true }),
        supabase.from('maquinas').select('id, maquina, jornada').eq('ativo', true).order('maquina'),
        supabase.from('material').select('id, nome_material').eq('ativo', true).order('nome_material'),
      ])

      // Buscar nomes das empresas
      const empresaIds = [...new Set((os ?? []).map((o: any) => o.empresa_id))]
      const { data: empresas } = await supabase.from('empresas').select('id, nome').in('id', empresaIds)
      const empresaMap = Object.fromEntries((empresas ?? []).map((e: any) => [e.id, e.nome]))

      setOsList((os ?? []).map((o: any) => ({ ...o, empresa_nome: empresaMap[o.empresa_id] ?? '—' })))
      setMaquinas(maq ?? [])
      setMateriais(mat ?? [])
      setLoading(false)
    }
    carregar()
  }, [])

  // ─── Selecionar OS ────────────────────────────────────────
  const selecionarOS = async (os: OS) => {
    setOsSelecionada(os)
    setOsDropdown(false)
    setBuscaOs('')
    setPosicaoSelecionada(null)
    setForm({})
    setOperacoes([emptyOp()])
    setNovaPosicao(false)

    const [{ data: posData }, { data: anexosData }] = await Promise.all([
      supabase.from('posicoes').select('*').eq('os_id', os.id).order('posicao'),
      supabase.from('anexos_os').select('id, nome_arquivo, storage_path, tamanho').eq('os_id', os.id),
    ])
    setPosicoes(posData ?? [])
    setAnexos(anexosData ?? [])
  }


  // ─── Download de anexos ───────────────────────────────────
  const baixarArquivo = async (path: string, nome: string) => {
    const { data } = await supabase.storage.from('desenhos').download(path)
    if (!data) return
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    a.click()
    URL.revokeObjectURL(url)
  }

  const baixarTodos = async () => {
    if (anexos.length === 0) return
    setBaixandoTodos(true)
    for (const anexo of anexos) {
      await baixarArquivo(anexo.storage_path, anexo.nome_arquivo)
    }
    setBaixandoTodos(false)
  }

  // ─── Selecionar Posição ───────────────────────────────────
  const selecionarPosicao = async (pos: Posicao) => {
    setPosicaoSelecionada(pos)
    setNovaPosicao(false)
    setForm({ ...pos })

    const { data: ops } = await supabase
      .from('operacoes_posicao')
      .select('*')
      .eq('posicao_id', pos.id)
      .order('ordem')

    setOperacoes(ops && ops.length > 0 ? ops.map(o => ({
      id: o.id,
      posicao_id: o.posicao_id,
      ordem: o.ordem,
      maquina_id: o.maquina_id,
      horas: o.horas,
      status: o.status ?? '',
      observacao: o.observacao ?? '',
    })) : [emptyOp()])
  }

  const iniciarNovaPosicao = () => {
    setPosicaoSelecionada(null)
    setNovaPosicao(true)
    const proxNum = posicoes.length > 0 ? Math.max(...posicoes.map(p => p.posicao)) + 1 : 1
    setForm({ posicao: proxNum, beneficiado: false })
    setOperacoes([emptyOp()])
  }

  // ─── Operações ────────────────────────────────────────────
  const addOperacao = () => {
    setOperacoes(prev => [...prev, { ...emptyOp(), ordem: prev.length + 1 }])
  }

  const removeOperacao = (i: number) => {
    setOperacoes(prev => prev.filter((_, idx) => idx !== i).map((o, idx) => ({ ...o, ordem: idx + 1 })))
  }

  const updateOperacao = (i: number, field: keyof Operacao, value: any) => {
    setOperacoes(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: value } : o))
  }

  // ─── Salvar ───────────────────────────────────────────────
  const salvar = async () => {
    if (!osSelecionada) { showToast('Selecione uma OS', 'erro'); return }
    if (!form.posicao) { showToast('Informe o número da posição', 'erro'); return }

    setSalvando(true)
    try {
      const payload = {
        os_id: osSelecionada.id,
        posicao: form.posicao,
        quantidade_pecas: form.quantidade_pecas ?? null,
        quantidade_material: form.quantidade_material ?? null,
        tipo: form.tipo ?? null,
        formato: form.formato ?? null,
        material_id: form.material_id ?? null,
        beneficiado: form.beneficiado ?? false,
        bitola: form.bitola ?? null,
        largura: form.largura ?? null,
        comprimento: form.comprimento ?? null,
        parede: form.parede ?? null,
      }

      let posicaoId: number

      if (posicaoSelecionada) {
        await supabase.from('posicoes').update(payload).eq('id', posicaoSelecionada.id)
        posicaoId = posicaoSelecionada.id
        // Deletar operações antigas
        await supabase.from('operacoes_posicao').delete().eq('posicao_id', posicaoId)
      } else {
        const { data, error } = await supabase.from('posicoes').insert(payload).select().single()
        if (error || !data) { showToast('Erro ao criar posição', 'erro'); setSalvando(false); return }
        posicaoId = data.id
      }

      // Inserir operações
      const opsValidas = operacoes
        .filter(o => o.maquina_id && o.horas)
        .map((o, i) => ({
          posicao_id: posicaoId,
          ordem: i + 1,
          maquina_id: o.maquina_id,
          horas: o.horas,
          status: o.status || null,
          observacao: o.observacao || null,
        }))

      if (opsValidas.length > 0) {
        const { error: opsError } = await supabase.from('operacoes_posicao').insert(opsValidas)
        if (opsError) {
          console.error('Erro operacoes_posicao:', JSON.stringify(opsError))
          console.error('Payload:', JSON.stringify(opsValidas))
          showToast('Erro ao salvar operações: ' + opsError.message, 'erro')
          setSalvando(false)
          return
        }
      }

      showToast(posicaoSelecionada ? 'Posição atualizada!' : 'Posição criada!')

      // Atualizar status da OS para processo_concluido
      await supabase.from('ordens_servico')
        .update({ status: 'processo_concluido' })
        .eq('id', osSelecionada.id)
        .eq('status', 'liberado_orcamento') // só muda se ainda estiver no status inicial

      // Recarregar posições
      const { data: ps } = await supabase.from('posicoes').select('*').eq('os_id', osSelecionada.id).order('posicao')
      setPosicoes(ps ?? [])

      if (!posicaoSelecionada) {
        setNovaPosicao(false)
        setForm({})
        setOperacoes([emptyOp()])
      }
    } catch {
      showToast('Erro ao salvar', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  // ─── Deletar ──────────────────────────────────────────────
  const confirmarDelete = async () => {
    if (!deleteModal.posicao) return
    await supabase.from('operacoes_posicao').delete().eq('posicao_id', deleteModal.posicao.id)
    await supabase.from('posicoes').delete().eq('id', deleteModal.posicao.id)
    showToast('Posição excluída!')
    setPosicoes(prev => prev.filter(p => p.id !== deleteModal.posicao!.id))
    if (posicaoSelecionada?.id === deleteModal.posicao.id) {
      setPosicaoSelecionada(null)
      setForm({})
      setOperacoes([emptyOp()])
    }
    setDeleteModal({ open: false, posicao: null })
  }

  const osFiltradas = osList.filter(o =>
    (o.numero_os_cliente ?? String(o.id)).toLowerCase().includes(buscaOs.toLowerCase()) ||
    (o.empresa_nome ?? '').toLowerCase().includes(buscaOs.toLowerCase())
  )

  const totalHoras = operacoes.reduce((acc, o) => acc + (Number(o.horas) || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center min-h-full py-32">
      <Loader2 size={24} className="text-gray-600 animate-spin" />
    </div>
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
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <GitBranch size={20} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Cadastro de Processo</h1>
          <p className="text-xs text-gray-500">Defina as operações de cada posição da OS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Coluna esquerda: seleção de OS e posições ── */}
        <div className="space-y-4">

          {/* Dropdown OS */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <p className={labelCls}>Ordem de Serviço</p>
            <div className="relative">
              <div
                onClick={() => setOsDropdown(o => !o)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm flex items-center gap-2 cursor-pointer hover:border-sky-500/50 transition"
              >
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
                    {osFiltradas.length === 0
                      ? <p className="text-xs text-gray-600 px-3 py-2">Nenhuma OS encontrada</p>
                      : osFiltradas.map(os => (
                        <button key={os.id} onClick={() => selecionarOS(os)}
                          className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition border-b border-white/[0.03] last:border-0">
                          <p className="text-sm text-white font-medium">OS #{os.id} {os.numero_os_cliente ? `· ${os.numero_os_cliente}` : ''}</p>
                          <p className="text-xs text-gray-500">{os.empresa_nome} · Entrega: {formatDate(os.data_entrega)}</p>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {osSelecionada && (
              <div className="mt-3 bg-white/[0.02] rounded-lg px-3 py-2 text-xs text-gray-500 space-y-0.5">
                <p>Empresa: <span className="text-gray-300">{osSelecionada.empresa_nome}</span></p>
                <p>Entrega: <span className="text-gray-300">{formatDate(osSelecionada.data_entrega)}</span></p>
              </div>
            )}
          </div>

          {/* Anexos da OS */}
          {osSelecionada && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-sky-400" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Arquivos</p>
                  {anexos.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-xs font-bold border border-sky-500/20">
                      {anexos.length}
                    </span>
                  )}
                </div>
                {anexos.length > 0 && (
                  <button
                    onClick={baixarTodos}
                    disabled={baixandoTodos}
                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition px-2 py-1 rounded-lg hover:bg-sky-500/10 disabled:opacity-50">
                    {baixandoTodos ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                    {baixandoTodos ? 'Baixando...' : 'Baixar todos'}
                  </button>
                )}
              </div>
              {anexos.length === 0 ? (
                <p className="text-xs text-gray-600 px-4 py-3">Nenhum arquivo anexado</p>
              ) : (
                <div>
                  {anexos.map(a => (
                    <button
                      key={a.id}
                      onClick={() => baixarArquivo(a.storage_path, a.nome_arquivo)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/[0.03] transition border-b border-white/[0.03] last:border-0 group">
                      <FileText size={13} className="text-gray-600 group-hover:text-sky-400 transition flex-shrink-0" />
                      <span className="text-xs text-gray-400 group-hover:text-white transition truncate text-left flex-1">
                        {a.nome_arquivo}
                      </span>
                      <Download size={11} className="text-gray-700 group-hover:text-sky-400 transition flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lista de Posições */}
          {osSelecionada && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Posições</p>
                <button onClick={iniciarNovaPosicao}
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition px-2 py-1 rounded-lg hover:bg-sky-500/10">
                  <Plus size={12} /> Nova
                </button>
              </div>
              {posicoes.length === 0 ? (
                <p className="text-xs text-gray-600 px-4 py-3">Nenhuma posição cadastrada</p>
              ) : (
                <div>
                  {posicoes.map(pos => (
                    <div key={pos.id}
                      onClick={() => selecionarPosicao(pos)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition border-b border-white/[0.03] last:border-0 group
                        ${posicaoSelecionada?.id === pos.id ? 'bg-sky-500/5 border-l-2 border-l-sky-500' : ''}`}>
                      <div>
                        <p className="text-sm text-white font-medium">Posição {pos.posicao}</p>
                        <p className="text-xs text-gray-600">{pos.quantidade_pecas ?? '—'} peças</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteModal({ open: true, posicao: pos }) }}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10 text-gray-600 hover:text-rose-400 transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Coluna direita: formulário ── */}
        {(posicaoSelecionada || novaPosicao) && (
          <div className="lg:col-span-2 space-y-4">

            {/* Quadro 1 — Dados da posição */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">
                {novaPosicao ? 'Nova Posição' : `Posição ${posicaoSelecionada?.posicao}`}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>Nº Posição</label>
                  <input type="number" value={form.posicao ?? ''} onChange={e => setForm(f => ({ ...f, posicao: Number(e.target.value) }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Qtd. Peças</label>
                  <input type="number" step="1" min="1" value={form.quantidade_pecas ?? ''} onChange={e => setForm(f => ({ ...f, quantidade_pecas: Math.floor(Number(e.target.value)) }))} className={inputCls} />
                </div>
              </div>
            </div>

            {/* Quadro 2 — Material */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">Detalhes do Material</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>Qtd. Material</label>
                  <input type="number" step="1" min="1" value={form.quantidade_material ?? ''} onChange={e => setForm(f => ({ ...f, quantidade_material: Math.floor(Number(e.target.value)) || null }))} placeholder="Ex: 1" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Tipo</label>
                  <input type="text" value={form.tipo ?? ''} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    list="tipos" placeholder="Ex: Laminado" className={inputCls} />
                  <datalist id="tipos">{TIPOS.map(t => <option key={t} value={t} />)}</datalist>
                </div>
                <div>
                  <label className={labelCls}>Formato</label>
                  <input type="text" value={form.formato ?? ''} onChange={e => setForm(f => ({ ...f, formato: e.target.value }))}
                    list="formatos" placeholder="Ex: Ø" className={inputCls} />
                  <datalist id="formatos">{FORMATOS.map(t => <option key={t} value={t} />)}</datalist>
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Material</label>
                  <select value={form.material_id ?? ''} onChange={e => setForm(f => ({ ...f, material_id: Number(e.target.value) || null }))} className={selectCls}>
                    <option value="">Selecionar material...</option>
                    {materiais.map(m => <option key={m.id} value={m.id}>{m.nome_material}</option>)}
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <label className={labelCls}>Beneficiado</label>
                  <button onClick={() => setForm(f => ({ ...f, beneficiado: !f.beneficiado }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition
                      ${form.beneficiado ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' : 'bg-white/[0.04] border-white/[0.08] text-gray-500'}`}>
                    {form.beneficiado ? <Check size={14} /> : <X size={14} />}
                    {form.beneficiado ? 'Sim' : 'Não'}
                  </button>
                </div>
              </div>

              {/* Medidas da peça — linha separada */}
              {['Ø', '#', 'Tubo Ø', 'Tubo #', 'Trefilado', 'Sextavado'].includes(form.formato ?? '') && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-white/[0.05]">
                  {/* Bitola ou Espessura */}
                  <div>
                    <label className={labelCls}>
                      {['#', 'Tubo #'].includes(form.formato ?? '') ? 'Espessura' : 'Bitola'}
                    </label>
                    <input type="text" value={form.bitola ?? ''} onChange={e => setForm(f => ({ ...f, bitola: e.target.value }))}
                      list="bitolas" placeholder='Ex: 1/2"' className={inputCls} />
                    <datalist id="bitolas">{BITOLAS.map(t => <option key={t} value={t} />)}</datalist>
                  </div>
                  {/* Largura: #, Tubo # */}
                  {['#', 'Tubo #'].includes(form.formato ?? '') && (
                    <div>
                      <label className={labelCls}>Largura (mm)</label>
                      <input type="number" value={form.largura ?? ''} onChange={e => setForm(f => ({ ...f, largura: Number(e.target.value) || null }))} className={inputCls} />
                    </div>
                  )}
                  {/* Comprimento */}
                  <div>
                    <label className={labelCls}>Comprimento (mm)</label>
                    <input type="number" value={form.comprimento ?? ''} onChange={e => setForm(f => ({ ...f, comprimento: Number(e.target.value) || null }))} className={inputCls} />
                  </div>
                  {/* Parede: Tubo Ø e Tubo # */}
                  {['Tubo Ø', 'Tubo #'].includes(form.formato ?? '') && (
                    <div>
                      <label className={labelCls}>Parede (mm)</label>
                      <input type="text" value={form.parede ?? ''} onChange={e => setForm(f => ({ ...f, parede: e.target.value }))} placeholder="Ex: 3" className={inputCls} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quadro 3 — Operações */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                <div>
                  <h3 className="text-sm font-bold text-white">Controle de Horas</h3>
                  <p className="text-xs text-gray-600 mt-0.5">Total: {totalHoras}h</p>
                </div>
                <button onClick={addOperacao}
                  className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 px-2.5 py-1.5 rounded-lg hover:bg-sky-500/10 transition">
                  <Plus size={12} /> Operação
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-8">#</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Máquina</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-24">Horas</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Observação</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-36">Status</th>
                      <th className="px-4 py-2.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {operacoes.map((op, i) => (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <select value={op.maquina_id ?? ''} onChange={e => updateOperacao(i, 'maquina_id', Number(e.target.value) || null)}
                            className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500/50">
                            <option value="">Selecionar...</option>
                            {maquinas.map(m => <option key={m.id} value={m.id}>{m.maquina}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <input type="number" value={op.horas ?? ''} onChange={e => updateOperacao(i, 'horas', Number(e.target.value) || null)}
                            placeholder="0" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500/50" />
                        </td>
                        <td className="px-4 py-2.5">
                          <input type="text" value={op.observacao} onChange={e => updateOperacao(i, 'observacao', e.target.value)}
                            placeholder="Observação" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-sky-500/50" />
                        </td>
                        <td className="px-4 py-2.5">
                          <select value={op.status} onChange={e => updateOperacao(i, 'status', e.target.value)}
                            className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500/50">
                            {STATUS_OP.map(s => <option key={s} value={s}>{STATUS_OP_LABELS[s]}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => removeOperacao(i)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-rose-500/10 text-gray-600 hover:text-rose-400 transition">
                            <X size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Botão Salvar */}
            <div className="flex justify-end">
              <button onClick={salvar} disabled={salvando}
                className="flex items-center gap-2 px-6 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
                {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {salvando ? 'Salvando...' : 'Salvar Posição'}
              </button>
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {!posicaoSelecionada && !novaPosicao && osSelecionada && (
          <div className="lg:col-span-2 flex items-center justify-center">
            <div className="text-center py-20">
              <GitBranch size={36} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Selecione uma posição ou crie uma nova</p>
            </div>
          </div>
        )}

        {!osSelecionada && (
          <div className="lg:col-span-2 flex items-center justify-center">
            <div className="text-center py-20">
              <GitBranch size={36} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Selecione uma OS para começar</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Delete */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1d2b] border border-white/[0.08] rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-base font-bold text-white mb-1">Confirmar exclusão</h3>
            <p className="text-xs text-gray-500 mb-4">Esta ação não pode ser desfeita</p>
            <div className="bg-white/[0.03] rounded-xl p-3 mb-5 text-sm text-gray-400">
              Posição <span className="text-white font-semibold">{deleteModal.posicao?.posicao}</span> e todas as suas operações serão excluídas.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal({ open: false, posicao: null })}
                className="flex-1 py-2.5 rounded-lg border border-white/[0.08] text-gray-400 hover:text-white text-sm transition">Cancelar</button>
              <button onClick={confirmarDelete}
                className="flex-1 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold transition">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
