import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  Building2, Plus, Pencil, ToggleRight, ToggleLeft,
  X, Check, Search, Phone, Mail, User, Loader2,
  ChevronDown, ChevronRight, Briefcase,
} from 'lucide-react'

interface Empresa {
  id: number
  nome: string
  ativo: boolean
  created_at: string
}

interface Cliente {
  id: number
  empresa_id: number | null
  nome: string
  contato: string | null
  email: string | null
  telefone: string | null
  ativo: boolean
  created_at: string
}

interface EmpresaComClientes extends Empresa {
  clientes: Cliente[]
}

const emptyCliente = { nome: '', contato: '', email: '', telefone: '', ativo: true, empresa_id: null as number | null }
const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition"

export default function CadastroClientes() {
  const [empresas, setEmpresas] = useState<EmpresaComClientes[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [expandidas, setExpandidas] = useState<Record<number, boolean>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [form, setForm] = useState(emptyCliente)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [buscaEmpresa, setBuscaEmpresa] = useState('')
  const [empresaDropdown, setEmpresaDropdown] = useState(false)
  const [criandoEmpresa, setCriandoEmpresa] = useState(false)
  const [nomeNovaEmpresa, setNomeNovaEmpresa] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const carregar = async () => {
    setLoading(true)
    const { data: emps } = await supabase.from('empresas').select('*').order('nome')
    const { data: clts } = await supabase.from('coordenadores').select('*').order('nome')
    const lista: EmpresaComClientes[] = (emps ?? []).map(e => ({
      ...e,
      clientes: (clts ?? []).filter(c => c.empresa_id === e.id),
    }))
    setEmpresas(lista)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setEmpresaDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleEmpresa = (id: number) => setExpandidas(p => ({ ...p, [id]: !p[id] }))

  const abrirNovo = (empresa_id?: number) => {
    setEditando(null)
    setForm({ ...emptyCliente, empresa_id: empresa_id ?? null })
    setBuscaEmpresa(empresas.find(e => e.id === empresa_id)?.nome ?? '')
    setErro(null)
    setCriandoEmpresa(false)
    setModalOpen(true)
  }

  const abrirEditar = (c: Cliente) => {
    setEditando(c)
    setForm({ nome: c.nome, contato: c.contato ?? '', email: c.email ?? '', telefone: c.telefone ?? '', ativo: c.ativo, empresa_id: c.empresa_id })
    setBuscaEmpresa(empresas.find(e => e.id === c.empresa_id)?.nome ?? '')
    setErro(null)
    setCriandoEmpresa(false)
    setModalOpen(true)
  }

  const fechar = () => { setModalOpen(false); setEditando(null); setForm(emptyCliente); setCriandoEmpresa(false) }

  const criarEmpresaRapido = async () => {
    if (!nomeNovaEmpresa.trim()) return
    const { data, error } = await supabase.from('empresas').insert({ nome: nomeNovaEmpresa.trim(), ativo: true }).select().single()
    if (error || !data) return
    setBuscaEmpresa(data.nome)
    setForm(f => ({ ...f, empresa_id: data.id }))
    setCriandoEmpresa(false)
    setNomeNovaEmpresa('')
    setEmpresaDropdown(false)
    await carregar()
  }

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Nome do contato é obrigatório'); return }
    if (!form.empresa_id) { setErro('Selecione ou crie uma empresa'); return }
    setSalvando(true)
    setErro(null)
    const payload = {
      nome: form.nome.trim(),
      contato: form.contato?.trim() || null,
      email: form.email?.trim() || null,
      telefone: form.telefone?.trim() || null,
      ativo: form.ativo,
      empresa_id: form.empresa_id,
    }
    if (editando) {
      const { error } = await supabase.from('coordenadores').update(payload).eq('id', editando.id)
      if (error) { setErro('Erro ao salvar.'); setSalvando(false); return }
    } else {
      const { error } = await supabase.from('coordenadores').insert(payload)
      if (error) { setErro('Erro ao cadastrar.'); setSalvando(false); return }
    }
    setSalvando(false)
    fechar()
    carregar()
  }

  const toggleAtivo = async (c: Cliente) => {
    await supabase.from('coordenadores').update({ ativo: !c.ativo }).eq('id', c.id)
    carregar()
  }

  const empresasFiltradas = empresas.filter(e =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    e.clientes.some(c => c.nome.toLowerCase().includes(busca.toLowerCase()))
  )

  const todasEmpresasLista = empresas.filter(e =>
    e.nome.toLowerCase().includes(buscaEmpresa.toLowerCase())
  )

  const empresaSelecionada = empresas.find(e => e.id === form.empresa_id)

  return (
    <div className="min-h-full p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Building2 size={20} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Clientes</h1>
            <p className="text-xs text-gray-500">
              {empresas.length} empresas · {empresas.reduce((acc, e) => acc + e.clientes.length, 0)} contatos
            </p>
          </div>
        </div>
        <button onClick={() => abrirNovo()} className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-lg transition">
          <Plus size={16} /> Novo Contato
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" placeholder="Buscar empresa ou contato..." value={busca} onChange={e => setBusca(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-gray-600 animate-spin" />
        </div>
      ) : empresasFiltradas.length === 0 ? (
        <div className="text-center py-20">
          <Building2 size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{busca ? 'Nenhum resultado encontrado' : 'Nenhuma empresa cadastrada'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {empresasFiltradas.map(empresa => {
            const isOpen = expandidas[empresa.id] ?? true
            return (
              <div key={empresa.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition group" onClick={() => toggleEmpresa(empresa.id)}>
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                    <Building2 size={15} className="text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{empresa.nome}</p>
                    <p className="text-xs text-gray-600">{empresa.clientes.length} contato{empresa.clientes.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); abrirNovo(empresa.id) }}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs rounded-lg transition">
                    <Plus size={12} /> Contato
                  </button>
                  {isOpen ? <ChevronDown size={15} className="text-gray-600" /> : <ChevronRight size={15} className="text-gray-600" />}
                </div>
                {isOpen && (
                  <div className="border-t border-white/[0.04]">
                    {empresa.clientes.length === 0 ? (
                      <p className="text-xs text-gray-600 px-5 py-3">Nenhum contato cadastrado</p>
                    ) : empresa.clientes.map(c => (
                      <div key={c.id} className={`flex items-center gap-3 px-5 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition group ${!c.ativo ? 'opacity-50' : ''}`}>
                        <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0 uppercase">
                          {c.nome[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{c.nome}</p>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {c.contato && <span className="text-xs text-gray-600 flex items-center gap-1"><Briefcase size={10} />{c.contato}</span>}
                            {c.email && <span className="text-xs text-gray-600 flex items-center gap-1"><Mail size={10} />{c.email}</span>}
                            {c.telefone && <span className="text-xs text-gray-600 flex items-center gap-1"><Phone size={10} />{c.telefone}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => abrirEditar(c)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => toggleAtivo(c)} className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${c.ativo ? 'hover:bg-rose-500/10 text-gray-500 hover:text-rose-400' : 'hover:bg-sky-500/10 text-gray-500 hover:text-sky-400'}`}>
                            {c.ativo ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1d2b] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
              <h2 className="text-base font-bold text-white">{editando ? 'Editar Contato' : 'Novo Contato'}</h2>
              <button onClick={fechar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div ref={dropdownRef} className="relative">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
                  <Building2 size={14} /> Empresa *
                </label>
                <div onClick={() => setEmpresaDropdown(o => !o)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm flex items-center gap-2 cursor-pointer hover:border-sky-500/50 transition">
                  <span className={`flex-1 ${empresaSelecionada ? 'text-white' : 'text-gray-600'}`}>
                    {empresaSelecionada ? empresaSelecionada.nome : 'Selecionar empresa...'}
                  </span>
                  <ChevronDown size={14} className="text-gray-500" />
                </div>
                {empresaDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e2130] border border-white/[0.1] rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-white/[0.06]">
                      <input type="text" placeholder="Buscar empresa..." value={buscaEmpresa} onChange={e => setBuscaEmpresa(e.target.value)}
                        className="w-full bg-white/[0.04] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none" autoFocus />
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {todasEmpresasLista.length === 0
                        ? <p className="text-xs text-gray-600 px-3 py-2">Nenhuma empresa encontrada</p>
                        : todasEmpresasLista.map(e => (
                          <button key={e.id} onClick={() => { setForm(f => ({ ...f, empresa_id: e.id })); setBuscaEmpresa(e.nome); setEmpresaDropdown(false) }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition">
                            {e.nome}
                          </button>
                        ))}
                    </div>
                    {!criandoEmpresa ? (
                      <button onClick={() => { setCriandoEmpresa(true); setNomeNovaEmpresa(buscaEmpresa) }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sky-400 text-sm hover:bg-sky-500/10 transition border-t border-white/[0.06]">
                        <Plus size={14} /> Criar "{buscaEmpresa || 'nova empresa'}"
                      </button>
                    ) : (
                      <div className="p-2 border-t border-white/[0.06] flex gap-2">
                        <input type="text" value={nomeNovaEmpresa} onChange={e => setNomeNovaEmpresa(e.target.value)}
                          placeholder="Nome da empresa" autoFocus onKeyDown={e => e.key === 'Enter' && criarEmpresaRapido()}
                          className="flex-1 bg-white/[0.04] rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none" />
                        <button onClick={criarEmpresaRapido} className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs rounded-lg font-semibold transition">
                          Criar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Campo label="Nome do Contato *" icon={<User size={14} />}>
                <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" className={inputCls} />
              </Campo>
              <Campo label="Cargo / Setor" icon={<Briefcase size={14} />}>
                <input type="text" value={form.contato ?? ''} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} placeholder="ex: Engenharia, Compras..." className={inputCls} />
              </Campo>
              <Campo label="Email" icon={<Mail size={14} />}>
                <input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" className={inputCls} />
              </Campo>
              <Campo label="Telefone" icon={<Phone size={14} />}>
                <input type="text" value={form.telefone ?? ''} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" className={inputCls} />
              </Campo>

              {editando && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-gray-400">Contato ativo</span>
                  <button onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))} className={`flex items-center gap-2 text-sm font-medium transition ${form.ativo ? 'text-sky-400' : 'text-gray-600'}`}>
                    {form.ativo ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    {form.ativo ? 'Sim' : 'Não'}
                  </button>
                </div>
              )}
              {erro && <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{erro}</p>}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={fechar} className="flex-1 py-2.5 rounded-lg border border-white/[0.08] text-gray-400 hover:text-white text-sm transition">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando} className="flex-1 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
                {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Campo({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">{icon}{label}</label>
      {children}
    </div>
  )
}