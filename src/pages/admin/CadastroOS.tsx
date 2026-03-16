import { useEffect, useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import type { OrdemServico } from '../../types/database'
import {
  ClipboardList, Plus, Pencil, Trash2, Printer, Search,
  ChevronUp, ChevronDown, X, Check, Loader2, AlertTriangle,
  Paperclip, Upload, FileText, Download, Trash,
} from 'lucide-react'

interface Anexo { id: number; nome_arquivo: string; storage_path: string; tamanho: number | null }
interface Empresa { id: number; nome: string }
interface Coordenador { id: number; nome: string; empresa_id: number }
interface OSComNomes extends OrdemServico {
  empresa_nome?: string
  coordenador_nome?: string
}

// Status controlados pelo sistema — ADM não altera
const STATUS_LABELS: Record<string, string> = {
  'liberado_orcamento': 'Aguard. Processo',
  'processo_concluido': 'Aguard. Orçamento',
  'orcado':             'Orçado',
  'enviado':            'Enviado',
  'aprovado':           'Aprovado',
  'reprovado':          'Reprovado',
  'em_producao':        'Em Produção',
  'concluido':          'Concluído',
}

const STATUS_COLORS: Record<string, string> = {
  'liberado_orcamento': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  'processo_concluido': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'orcado':             'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'enviado':            'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'aprovado':           'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'reprovado':          'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'em_producao':        'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'concluido':          'bg-sky-500/10 text-sky-400 border-sky-500/20',
}

const emptyForm = {
  numero_os_cliente: '',
  empresa_id: 0,
  coordenador_id: 0,
  desenho: '',
  data_entrega: '',
}

const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition"
const selectCls = "w-full bg-[#0f1117] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition"

const formatDate = (d: string | null) => {
  if (!d) return '—'
  const dt = new Date(d)
  return `${String(dt.getUTCDate()).padStart(2,'0')}/${String(dt.getUTCMonth()+1).padStart(2,'0')}/${dt.getUTCFullYear()}`
}

type SortKey = 'id' | 'numero_os_cliente' | 'empresa_nome' | 'coordenador_nome' | 'status' | 'data_cadastro' | 'data_entrega'

export default function CadastroOS() {
  const { user } = useAuth()
  const [osList, setOsList] = useState<OSComNomes[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([])
  const [coordsFiltrados, setCoordsFiltrados] = useState<Coordenador[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'id', dir: 'desc' })
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<OSComNomes | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; os: OSComNomes | null }>({ open: false, os: null })
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'erro' } | null>(null)
  const [osIdSalva, setOsIdSalva] = useState<number | null>(null)
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [uploadando, setUploadando] = useState(false)

  const carregarAnexos = async (osId: number) => {
    const { data } = await supabase.from('anexos_os').select('id, nome_arquivo, storage_path, tamanho').eq('os_id', osId).order('id')
    setAnexos(data ?? [])
  }

  const location = useLocation()

  useEffect(() => {
    const state = location.state as { novo?: boolean } | null
    if (state?.novo) abrirNovo()
  }, [location.state])

  const showToast = (msg: string, tipo: 'ok' | 'erro' = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  const carregar = async () => {
    setLoading(true)
    try {
      const [{ data: os }, { data: emps }, { data: coords }] = await Promise.all([
        supabase.from('ordens_servico').select('*').order('id', { ascending: false }),
        supabase.from('empresas').select('id, nome').order('nome'),
        supabase.from('coordenadores').select('id, nome, empresa_id').order('nome'),
      ])
      const empresasData: Empresa[] = emps ?? []
      const coordsData: Coordenador[] = coords ?? []
      const empresaMap = Object.fromEntries(empresasData.map(e => [e.id, e.nome]))
      const coordMap = Object.fromEntries(coordsData.map(c => [c.id, c.nome]))
      setEmpresas(empresasData)
      setCoordenadores(coordsData)
      setOsList((os ?? []).map(o => ({
        ...o,
        empresa_nome: empresaMap[o.empresa_id] ?? '—',
        coordenador_nome: o.coordenador_id ? (coordMap[o.coordenador_id] ?? '—') : '—',
      })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const abrirNovo = () => {
    setEditando(null)
    setForm(emptyForm)
    setCoordsFiltrados([])
    setErro(null)
    setModalOpen(true)
  }

  const abrirEditar = (os: OSComNomes) => {
    setEditando(os)
    setCoordsFiltrados(coordenadores.filter(c => c.empresa_id === os.empresa_id))
    setForm({
      numero_os_cliente: os.numero_os_cliente ?? '',
      empresa_id: os.empresa_id,
      coordenador_id: os.coordenador_id ?? 0,
      desenho: os.desenho ?? '',
      data_entrega: os.data_entrega ?? '',
    })
    setErro(null)
    setOsIdSalva(os.id)
    setAnexos([])
    carregarAnexos(os.id)
    setModalOpen(true)
  }

  const fechar = () => { setModalOpen(false); setEditando(null); setCoordsFiltrados([]); setOsIdSalva(null); setAnexos([]) }

  const salvar = async () => {
    if (!form.empresa_id) { setErro('Selecione uma empresa'); return }
    setSalvando(true)
    setErro(null)

    if (editando) {
      // Edição: não altera status nem criado_por
      const payload = {
        numero_os_cliente: form.numero_os_cliente.trim() || null,
        empresa_id: form.empresa_id,
        coordenador_id: form.coordenador_id || null,
        desenho: form.desenho.trim() || null,
        data_entrega: form.data_entrega || null,
      }
      const { error } = await supabase.from('ordens_servico').update(payload).eq('id', editando.id)
      if (error) { setErro('Erro ao salvar.'); setSalvando(false); return }
      showToast('OS atualizada com sucesso!')
    } else {
      // Novo cadastro: status fixo + data_cadastro + criado_por
      const payload = {
        numero_os_cliente: form.numero_os_cliente.trim() || null,
        empresa_id: form.empresa_id,
        coordenador_id: form.coordenador_id || null,
        desenho: form.desenho.trim() || null,
        data_entrega: form.data_entrega || null,
        status: 'liberado_orcamento',
        data_cadastro: new Date().toISOString().split('T')[0],
        criado_por: user?.id ?? null,
      }
      const { data: novaOS, error } = await supabase.from('ordens_servico').insert(payload).select('id').single()
      if (error) { setErro('Erro ao cadastrar.'); setSalvando(false); return }
      showToast('OS criada com sucesso!')
      setSalvando(false)
      setEditando({ ...form, id: novaOS.id, status: 'liberado_orcamento' } as any)
      setOsIdSalva(novaOS.id)
      carregar()
      return
    }

    setSalvando(false)
    fechar()
    carregar()
  }

  const salvarSeNecessario = async (): Promise<number | null> => {
    if (osIdSalva) return osIdSalva
    if (!form.empresa_id) { showToast('Selecione uma empresa antes de anexar', 'erro'); return null }
    const payload = {
      numero_os_cliente: form.numero_os_cliente.trim() || null,
      empresa_id: form.empresa_id,
      coordenador_id: form.coordenador_id || null,
      desenho: form.desenho.trim() || null,
      data_entrega: form.data_entrega || null,
      status: 'liberado_orcamento',
      data_cadastro: new Date().toISOString().split('T')[0],
      criado_por: user?.id ?? null,
    }
    const { data, error } = await supabase.from('ordens_servico').insert(payload).select('id').single()
    if (error || !data) { showToast('Erro ao salvar OS', 'erro'); return null }
    setOsIdSalva(data.id)
    setEditando({ ...form, id: data.id, status: 'liberado_orcamento' } as any)
    showToast('OS salva! Agora anexando arquivo...')
    carregar()
    return data.id
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const id = await salvarSeNecessario()
    if (!id) return
    setUploadando(true)
    for (const file of files) {
      const path = `os-${id}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('desenhos').upload(path, file)
      if (upErr) { showToast(`Erro ao enviar ${file.name}`, 'erro'); continue }
      await supabase.from('anexos_os').insert({ os_id: id, nome_arquivo: file.name, storage_path: path, tamanho: file.size })
    }
    await carregarAnexos(id)
    e.target.value = ''
    setUploadando(false)
    showToast('Arquivo(s) anexado(s)!')
  }

  const handleDownload = async (anexo: Anexo) => {
    const { data } = await supabase.storage.from('desenhos').createSignedUrl(anexo.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleDeleteAnexo = async (anexo: Anexo) => {
    await supabase.storage.from('desenhos').remove([anexo.storage_path])
    await supabase.from('anexos_os').delete().eq('id', anexo.id)
    setAnexos(prev => prev.filter(a => a.id !== anexo.id))
    showToast('Arquivo removido!')
  }

  const fmtSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const confirmarDelete = async () => {
    if (!deleteModal.os) return
    const { error } = await supabase.from('ordens_servico').delete().eq('id', deleteModal.os.id)
    if (error) showToast('Erro ao excluir OS!', 'erro')
    else showToast('OS excluída com sucesso!')
    setDeleteModal({ open: false, os: null })
    carregar()
  }

  const handleSort = (key: SortKey) =>
    setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sort.key !== k) return <span className="opacity-20 ml-1">↕</span>
    return sort.dir === 'asc' ? <ChevronUp size={13} className="ml-1 inline" /> : <ChevronDown size={13} className="ml-1 inline" />
  }

  const osFiltradas = useMemo(() => {
    let lista = [...osList]
    if (filtroTexto) {
      const t = filtroTexto.toLowerCase()
      lista = lista.filter(o =>
        o.id.toString().includes(t) ||
        (o.numero_os_cliente ?? '').toLowerCase().includes(t) ||
        (o.empresa_nome ?? '').toLowerCase().includes(t) ||
        (o.coordenador_nome ?? '').toLowerCase().includes(t)
      )
    }
    if (filtroStatus) lista = lista.filter(o => o.status === filtroStatus)
    lista.sort((a, b) => {
      const av = sort.key === 'empresa_nome' ? a.empresa_nome
        : sort.key === 'coordenador_nome' ? a.coordenador_nome
        : a[sort.key as keyof OSComNomes]
      const bv = sort.key === 'empresa_nome' ? b.empresa_nome
        : sort.key === 'coordenador_nome' ? b.coordenador_nome
        : b[sort.key as keyof OSComNomes]
      if ((av ?? '') < (bv ?? '')) return sort.dir === 'asc' ? -1 : 1
      if ((av ?? '') > (bv ?? '')) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
    return lista
  }, [osList, filtroTexto, filtroStatus, sort])

  const cols: { label: string; key?: SortKey }[] = [
    { label: 'OS', key: 'id' },
    { label: 'OS Cliente', key: 'numero_os_cliente' },
    { label: 'Empresa', key: 'empresa_nome' },
    { label: 'Coordenador', key: 'coordenador_nome' },
    { label: 'Status', key: 'status' },
    { label: 'Cadastro', key: 'data_cadastro' },
    { label: 'Entrega', key: 'data_entrega' },
    { label: 'Ações' },
  ]

  return (
    <div className="min-h-full p-6 md:p-8">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium
          ${toast.tipo === 'ok' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <ClipboardList size={20} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Ordens de Serviço</h1>
            <p className="text-xs text-gray-500">{osList.length} OS cadastradas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {}} className="flex items-center gap-2 px-3 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-gray-300 text-sm rounded-lg transition">
            <Printer size={15} /> Imprimir
          </button>
          <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-lg transition">
            <Plus size={16} /> Nova OS
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Buscar OS, empresa ou coordenador..." value={filtroTexto}
            onChange={e => setFiltroTexto(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition" />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-gray-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {cols.map(col => (
                    <th key={col.label} onClick={() => col.key && handleSort(col.key)}
                      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider select-none ${col.key ? 'cursor-pointer hover:text-white' : ''}`}>
                      {col.label}{col.key && <SortIcon k={col.key} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {osFiltradas.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-600">Nenhuma OS encontrada</td></tr>
                ) : osFiltradas.map(os => (
                  <tr key={os.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition group">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{os.id}</td>
                    <td className="px-4 py-3 text-white">{os.numero_os_cliente ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{os.empresa_nome}</td>
                    <td className="px-4 py-3 text-gray-300">{os.coordenador_nome}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[os.status] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                        {STATUS_LABELS[os.status] ?? os.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(os.data_cadastro)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(os.data_entrega)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => abrirEditar(os)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteModal({ open: true, os })} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal cadastro/edição */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1d2b] border border-white/[0.08] rounded-2xl w-full max-w-xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base font-bold text-white">{editando ? 'Editar OS' : 'Nova OS'}</h2>
                {!editando && (
                  <p className="text-xs text-amber-400 mt-0.5">Status: Liberado para orçamento</p>
                )}
                {editando && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Status atual:&nbsp;
                    <span className={`font-medium ${STATUS_COLORS[editando.status]?.split(' ')[1] ?? 'text-gray-400'}`}>
                      {STATUS_LABELS[editando.status] ?? editando.status}
                    </span>
                  </p>
                )}
              </div>
              <button onClick={fechar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Número OS Cliente">
                  <input type="text" value={form.numero_os_cliente}
                    onChange={e => setForm(f => ({ ...f, numero_os_cliente: e.target.value }))}
                    placeholder="Ex: OS-2024-001" className={inputCls} />
                </Campo>
                <Campo label="Data de Entrega">
                  <input type="date" value={form.data_entrega}
                    onChange={e => setForm(f => ({ ...f, data_entrega: e.target.value }))}
                    className={inputCls} />
                </Campo>
              </div>
              <Campo label="Empresa *">
                <select value={form.empresa_id}
                  onChange={e => {
                    const id = Number(e.target.value)
                    setCoordsFiltrados(coordenadores.filter(c => c.empresa_id === id))
                    setForm(f => ({ ...f, empresa_id: id, coordenador_id: 0 }))
                  }}
                  className={selectCls}>
                  <option value={0}>Selecionar empresa...</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </Campo>
              <Campo label="Coordenador">
                <select value={form.coordenador_id}
                  onChange={e => setForm(f => ({ ...f, coordenador_id: Number(e.target.value) }))}
                  disabled={!form.empresa_id}
                  className={`${selectCls} disabled:opacity-40 disabled:cursor-not-allowed`}>
                  <option value={0}>{form.empresa_id ? 'Selecionar coordenador...' : 'Selecione a empresa primeiro'}</option>
                  {coordsFiltrados.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Campo>
              <Campo label="Desenho / Referência">
                <input type="text" value={form.desenho}
                  onChange={e => setForm(f => ({ ...f, desenho: e.target.value }))}
                  placeholder="Código ou referência do desenho" className={inputCls} />
              </Campo>
              {erro && <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{erro}</p>}

              {/* Anexos */}
              {(
                <div className="border-t border-white/[0.06] pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                      <Paperclip size={12} /> Anexos
                      {anexos.length > 0 && <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] text-gray-400">{anexos.length}</span>}
                    </span>
                    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition
                      ${uploadando ? 'opacity-50 pointer-events-none' : 'bg-white/[0.05] hover:bg-white/[0.08] text-gray-300'}`}>
                      {uploadando ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      {uploadando ? 'Enviando...' : 'Anexar arquivo'}
                      <input type="file" className="hidden" multiple
                        accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png"
                        onChange={handleUpload} />
                    </label>
                  </div>
                  {anexos.length === 0 ? (
                    <p className="text-xs text-gray-600 py-2 text-center">Nenhum arquivo anexado</p>
                  ) : (
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {anexos.map(a => (
                        <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] group">
                          <FileText size={13} className="text-gray-500 flex-shrink-0" />
                          <span className="text-xs text-gray-300 flex-1 truncate">{a.nome_arquivo}</span>
                          {a.tamanho && <span className="text-xs text-gray-600">{fmtSize(a.tamanho)}</span>}
                          <button onClick={() => handleDownload(a)} className="opacity-0 group-hover:opacity-100 transition p-1 hover:text-sky-400 text-gray-600">
                            <Download size={12} />
                          </button>
                          <button onClick={() => handleDeleteAnexo(a)} className="opacity-0 group-hover:opacity-100 transition p-1 hover:text-rose-400 text-gray-600">
                            <Trash size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={fechar} className="flex-1 py-2.5 rounded-lg border border-white/[0.08] text-gray-400 hover:text-white text-sm transition">Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                className="flex-1 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
                {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmação delete */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1d2b] border border-white/[0.08] rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle size={18} className="text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirmar exclusão</h3>
                <p className="text-xs text-gray-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 mb-5 space-y-1 text-sm">
              <p className="text-gray-400">OS <span className="text-white font-semibold">#{deleteModal.os?.id}</span></p>
              <p className="text-gray-400">Empresa: <span className="text-white">{deleteModal.os?.empresa_nome}</span></p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal({ open: false, os: null })}
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

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
