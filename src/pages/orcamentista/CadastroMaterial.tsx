import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Package, Plus, Pencil, Trash2, Search, ChevronUp, ChevronDown, X, Check, Loader2, AlertTriangle } from 'lucide-react'

interface Material { id: number; nome_material: string; densidade: number | null; valor_kg: number | null; ativo: boolean; created_at: string }

const emptyForm = { nome_material: '', densidade: '', valor_kg: '', ativo: true }
const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition"
const moeda = (v: number | null) => v ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
type SortKey = 'nome_material' | 'densidade' | 'valor_kg'

export default function CadastroMaterial() {
  const [lista, setLista] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'nome_material', dir: 'asc' })
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Material | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item: Material | null }>({ open: false, item: null })
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'erro' } | null>(null)

  const showToast = (msg: string, tipo: 'ok' | 'erro' = 'ok') => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000) }

  const carregar = async () => {
    setLoading(true)
    const { data } = await supabase.from('material').select('*').order('nome_material')
    setLista(data ?? [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const abrirNovo = () => { setEditando(null); setForm(emptyForm); setErro(null); setModalOpen(true) }
  const abrirEditar = (m: Material) => {
    setEditando(m)
    setForm({ nome_material: m.nome_material, densidade: m.densidade?.toString() ?? '', valor_kg: m.valor_kg?.toString() ?? '', ativo: m.ativo })
    setErro(null); setModalOpen(true)
  }
  const fechar = () => { setModalOpen(false); setEditando(null) }

  const salvar = async () => {
    if (!form.nome_material.trim()) { setErro('Nome do material e obrigatorio'); return }
    setSalvando(true); setErro(null)
    const payload = {
      nome_material: form.nome_material.trim(),
      densidade: form.densidade ? Number(form.densidade) : null,
      valor_kg: form.valor_kg ? Number(form.valor_kg) : null,
      ativo: form.ativo,
    }
    if (editando) {
      const { error } = await supabase.from('material').update(payload).eq('id', editando.id)
      if (error) { setErro('Erro ao salvar.'); setSalvando(false); return }
      showToast('Material atualizado!')
    } else {
      const { error } = await supabase.from('material').insert(payload)
      if (error) { setErro('Erro ao cadastrar.'); setSalvando(false); return }
      showToast('Material criado!')
    }
    setSalvando(false); fechar(); carregar()
  }

  const confirmarDelete = async () => {
    if (!deleteModal.item) return
    const { error } = await supabase.from('material').delete().eq('id', deleteModal.item.id)
    if (error) showToast('Erro ao excluir!', 'erro')
    else showToast('Material excluido!')
    setDeleteModal({ open: false, item: null }); carregar()
  }

  const handleSort = (key: SortKey) => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
  const SortIcon = ({ k }: { k: SortKey }) => sort.key !== k ? <span className="opacity-20 ml-1">↕</span> : sort.dir === 'asc' ? <ChevronUp size={13} className="ml-1 inline" /> : <ChevronDown size={13} className="ml-1 inline" />

  const listaFiltrada = useMemo(() => {
    let data = [...lista]
    if (busca) { const t = busca.toLowerCase(); data = data.filter(m => m.nome_material.toLowerCase().includes(t)) }
    data.sort((a, b) => {
      const av = a[sort.key] ?? 0, bv = b[sort.key] ?? 0
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
    return data
  }, [lista, busca, sort])

  return (
    <div className="min-h-full p-6 md:p-8">
      {toast && <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium ${toast.tipo === 'ok' ? 'bg-green-500' : 'bg-rose-500'} text-white`}>{toast.msg}</div>}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Package size={20} className="text-emerald-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-white">Materiais</h1>
            <p className="text-xs text-gray-500">{lista.length} materiais cadastrados</p>
          </div>
        </div>
        <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-lg transition">
          <Plus size={16} /> Novo Material
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" placeholder="Buscar material..." value={busca} onChange={e => setBusca(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gray-600 animate-spin" /></div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {([['nome_material','Material'],['densidade','Densidade (g/cm³)'],['valor_kg','Valor/kg']] as [SortKey,string][]).map(([k,l]) => (
                  <th key={k} onClick={() => handleSort(k)} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white select-none">
                    {l}<SortIcon k={k} />
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-600">Nenhum material encontrado</td></tr>
              ) : listaFiltrada.map(m => (
                <tr key={m.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition group">
                  <td className="px-4 py-3 text-white font-medium">{m.nome_material}</td>
                  <td className="px-4 py-3 text-gray-300">{m.densidade ? `${m.densidade} g/cm³` : '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{moeda(m.valor_kg)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${m.ativo ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
                      {m.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => abrirEditar(m)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteModal({ open: true, item: m })} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1d2b] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
              <h2 className="text-base font-bold text-white">{editando ? 'Editar Material' : 'Novo Material'}</h2>
              <button onClick={fechar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome do Material *</label>
                <input type="text" value={form.nome_material} onChange={e => setForm(f => ({ ...f, nome_material: e.target.value }))} placeholder="Ex: Aco 1020, Aluminio 6061..." className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Densidade (g/cm³)</label>
                  <input type="number" min={0} step={0.001} value={form.densidade} onChange={e => setForm(f => ({ ...f, densidade: e.target.value }))} placeholder="Ex: 7.85" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Valor por kg (R$)</label>
                  <input type="number" min={0} step={0.01} value={form.valor_kg} onChange={e => setForm(f => ({ ...f, valor_kg: e.target.value }))} placeholder="Ex: 8.50" className={inputCls} />
                </div>
              </div>
              {editando && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-gray-400">Material ativo</span>
                  <button onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                    className={`text-sm font-medium transition ${form.ativo ? 'text-sky-400' : 'text-gray-600'}`}>
                    {form.ativo ? '✓ Sim' : '✗ Nao'}
                  </button>
                </div>
              )}
              {erro && <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{erro}</p>}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={fechar} className="flex-1 py-2.5 rounded-lg border border-white/[0.08] text-gray-400 hover:text-white text-sm transition">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="flex-1 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
                {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1d2b] border border-white/[0.08] rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center"><AlertTriangle size={18} className="text-rose-400" /></div>
              <div><h3 className="text-base font-bold text-white">Excluir Material?</h3><p className="text-xs text-gray-500">Esta acao nao pode ser desfeita</p></div>
            </div>
            <p className="text-sm text-gray-400 mb-5">Material: <span className="text-white font-semibold">{deleteModal.item?.nome_material}</span></p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal({ open: false, item: null })} className="flex-1 py-2.5 rounded-lg border border-white/[0.08] text-gray-400 hover:text-white text-sm transition">Cancelar</button>
              <button onClick={confirmarDelete} className="flex-1 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold transition">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
