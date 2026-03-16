import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import {
  Send, ChevronDown, Loader2, Mail, Building2,
  Calendar, FileText, CheckCircle, Download, User,
} from 'lucide-react'

// ─── Interfaces ───────────────────────────────────────────────
interface OS {
  id: number
  numero_os_cliente: string | null
  data_entrega: string | null
  data_cadastro: string
  empresa_nome: string
  coordenador_nome: string
  coordenador_email: string | null
  status: string
}

interface Orcamento {
  custo_maquinas: number
  custo_materiais: number
  subtotal: number
  margem: number
  comissao: number
  impostos: number
  plus: number
  total: number
}

interface Posicao {
  posicao: number
  quantidade_pecas: number | null
  material_nome: string | null
  formato: string | null
  bitola: string | null
  comprimento: number | null
}

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtN = (v: number, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })

const formatDate = (d: string | null) => {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`
}

const labelCls = "block text-xs font-medium text-gray-500 mb-1"
const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition"

// ─── Componente ───────────────────────────────────────────────
export default function EnviarOrcamento() {
  const location = useLocation()
  const [osList, setOsList] = useState<OS[]>([])
  const [osSelecionada, setOsSelecionada] = useState<OS | null>(null)
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null)
  const [posicoes, setPosicoes] = useState<Posicao[]>([])
  const [loading, setLoading] = useState(true)
  const [carregando, setCarregando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'erro' } | null>(null)
  const [osDropdown, setOsDropdown] = useState(false)
  const [buscaOs, setBuscaOs] = useState('')

  // Campos editáveis do email
  const [emailPara, setEmailPara] = useState('')
  const [emailAssunto, setEmailAssunto] = useState('')
  const [emailCorpo, setEmailCorpo] = useState('')

  const showToast = (msg: string, tipo: 'ok' | 'erro' = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  // Carregar OS orçadas
  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      const { data: os } = await supabase
        .from('ordens_servico')
        .select('id, numero_os_cliente, data_entrega, data_cadastro, empresa_id, coordenador_id, status')
        .eq('status', 'orcado')
        .order('id', { ascending: true })

      if (!os || os.length === 0) { setOsList([]); setLoading(false); return }

      const empresaIds = [...new Set(os.map((o: any) => o.empresa_id))]
      const coordIds = [...new Set(os.filter((o: any) => o.coordenador_id).map((o: any) => o.coordenador_id))]

      const [{ data: empresas }, { data: coords }] = await Promise.all([
        supabase.from('empresas').select('id, nome').in('id', empresaIds),
        supabase.from('coordenadores').select('id, nome, email').in('id', coordIds),
      ])

      const empMap = Object.fromEntries((empresas ?? []).map((e: any) => [e.id, e.nome]))
      const coordMap = Object.fromEntries((coords ?? []).map((c: any) => [c.id, c]))

      setOsList(os.map((o: any) => ({
        id: o.id,
        numero_os_cliente: o.numero_os_cliente,
        data_entrega: o.data_entrega,
        data_cadastro: o.data_cadastro,
        empresa_nome: empMap[o.empresa_id] ?? '—',
        coordenador_nome: coordMap[o.coordenador_id]?.nome ?? '—',
        coordenador_email: coordMap[o.coordenador_id]?.email ?? null,
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

  const selecionarOS = async (os: OS) => {
    setOsSelecionada(os)
    setOsDropdown(false)
    setBuscaOs('')
    setOrcamento(null)
    setPosicoes([])
    setEnviado(false)
    setCarregando(true)

    const [{ data: orc }, { data: pos }] = await Promise.all([
      supabase.from('orcamentos').select('*').eq('os_id', os.id).limit(1),
      supabase.from('posicoes')
        .select('posicao, quantidade_pecas, formato, bitola, comprimento, material(nome_material)')
        .eq('os_id', os.id)
        .order('posicao'),
    ])

    const orcData = orc?.[0] ?? null
    setOrcamento(orcData)

    const posData = (pos ?? []).map((p: any) => ({
      posicao: p.posicao,
      quantidade_pecas: p.quantidade_pecas,
      material_nome: p.material?.nome_material ?? null,
      formato: p.formato,
      bitola: p.bitola,
      comprimento: p.comprimento,
    }))
    setPosicoes(posData)

    // Preencher campos do email
    setEmailPara(os.coordenador_email ?? '')
    setEmailAssunto(`Orçamento OS ${os.numero_os_cliente ?? `#${os.id}`} — ${os.empresa_nome}`)

    const linhasPosicoes = posData.map(p =>
      `  Pos. ${p.posicao}: ${p.quantidade_pecas ?? '—'} peças | ${p.material_nome ?? '—'} | ${p.formato ?? ''} ${p.bitola ?? ''} ${p.comprimento ? p.comprimento + 'mm' : ''}`
    ).join('\n')

    setEmailCorpo(
`Olá, ${os.coordenador_nome},

Segue o orçamento referente à OS ${os.numero_os_cliente ?? `#${os.id}`} — ${os.empresa_nome}.

POSIÇÕES:
${linhasPosicoes}

VALOR TOTAL: ${orcData ? fmt(orcData.total) : '—'}
PRAZO DE ENTREGA: ${formatDate(os.data_entrega)}

O PDF com o detalhamento completo está em anexo.

Atenciosamente,
SSV`
    )

    setCarregando(false)
  }

  // Gerar e baixar PDF
  const gerarPDF = async () => {
    if (!osSelecionada || !orcamento) return
    setGerandoPDF(true)
    try {
      const { default: jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm' as any)
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210, margin = 15
      let y = 20

      doc.setFillColor(15, 17, 23)
      doc.rect(0, 0, W, 40, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('ORÇAMENTO', margin, y)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150, 150, 150)
      doc.text('SSV — Sistema de Gestão', margin, y + 7)
      doc.setTextColor(200, 200, 200)
      doc.setFontSize(9)
      doc.text(`OS #${osSelecionada.id}${osSelecionada.numero_os_cliente ? ' · ' + osSelecionada.numero_os_cliente : ''}`, W - margin, y, { align: 'right' })
      doc.text(`Empresa: ${osSelecionada.empresa_nome}`, W - margin, y + 6, { align: 'right' })
      doc.text(`Entrega: ${formatDate(osSelecionada.data_entrega)}`, W - margin, y + 12, { align: 'right' })
      y = 50

      // Posições
      doc.setTextColor(30, 30, 30)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('POSIÇÕES', margin, y)
      y += 7

      doc.setFillColor(240, 240, 240)
      doc.rect(margin, y, W - margin * 2, 7, 'F')
      doc.setFontSize(8)
      doc.setTextColor(80, 80, 80)
      doc.text('Pos.', margin + 2, y + 5)
      doc.text('Qtd. Peças', margin + 15, y + 5)
      doc.text('Material', margin + 45, y + 5)
      doc.text('Formato', margin + 110, y + 5)
      doc.text('Compr. (mm)', margin + 145, y + 5)
      y += 9

      posicoes.forEach((p, i) => {
        if (i % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(margin, y - 1, W - margin * 2, 7, 'F') }
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(30, 30, 30)
        doc.text(String(p.posicao), margin + 2, y + 4)
        doc.text(String(p.quantidade_pecas ?? '—'), margin + 15, y + 4)
        doc.text((p.material_nome ?? '—').substring(0, 25), margin + 45, y + 4)
        doc.text(`${p.formato ?? ''} ${p.bitola ?? ''}`.trim() || '—', margin + 110, y + 4)
        doc.text(p.comprimento ? String(p.comprimento) : '—', margin + 145, y + 4)
        y += 8
      })

      y += 8

      // Resumo financeiro
      doc.setFillColor(15, 17, 23)
      doc.rect(margin, y, W - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('RESUMO FINANCEIRO', margin + 3, y + 5.5)
      y += 12

      const addLinha = (label: string, valor: string, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.setFontSize(9)
        doc.setTextColor(50, 50, 50)
        doc.text(label, margin + 3, y)
        doc.text(valor, W - margin, y, { align: 'right' })
        y += 7
      }

      doc.setDrawColor(220, 220, 220)
      addLinha('Custo de Máquinas', fmt(orcamento.custo_maquinas))
      doc.line(margin, y - 3, W - margin, y - 3)
      addLinha('Custo de Materiais', fmt(orcamento.custo_materiais))
      doc.line(margin, y - 3, W - margin, y - 3)
      addLinha('Subtotal', fmt(orcamento.subtotal), true)
      if (orcamento.margem > 0) addLinha(`Margem (${fmtN(orcamento.margem)}%)`, fmt(orcamento.total * orcamento.margem / 100))
      if (orcamento.comissao > 0) addLinha(`Comissão (${fmtN(orcamento.comissao)}%)`, fmt(orcamento.total * orcamento.comissao / 100))
      if (orcamento.impostos > 0) addLinha(`Impostos (${fmtN(orcamento.impostos)}%)`, fmt(orcamento.total * orcamento.impostos / 100))
      if (orcamento.plus > 0) addLinha(`Plus (${fmtN(orcamento.plus)}%)`, fmt(orcamento.total * orcamento.plus / 100))

      y += 2
      doc.setFillColor(240, 248, 255)
      doc.rect(margin, y - 4, W - margin * 2, 10, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(14, 116, 144)
      doc.text('TOTAL', margin + 3, y + 3)
      doc.text(fmt(orcamento.total), W - margin, y + 3, { align: 'right' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin, 290)

      doc.save(`orcamento-os-${osSelecionada.id}.pdf`)
      showToast('PDF gerado!')
    } catch (e) {
      console.error(e)
      showToast('Erro ao gerar PDF', 'erro')
    } finally {
      setGerandoPDF(false)
    }
  }

  // Abrir cliente de email e marcar como enviado
  const abrirEmail = async () => {
    if (!osSelecionada || !emailPara) return
    setEnviando(true)

    const mailto = `mailto:${encodeURIComponent(emailPara)}?subject=${encodeURIComponent(emailAssunto)}&body=${encodeURIComponent(emailCorpo)}`
    window.open(mailto, '_blank')

    // Marcar como enviado
    await supabase.from('ordens_servico').update({ status: 'enviado' }).eq('id', osSelecionada.id)
    setEnviado(true)
    setOsSelecionada(prev => prev ? { ...prev, status: 'enviado' } : null)
    setOsList(prev => prev.filter(o => o.id !== osSelecionada.id))
    showToast('OS marcada como enviada!')
    setEnviando(false)
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
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Send size={20} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Enviar Orçamento</h1>
          <p className="text-xs text-gray-500">Envie o orçamento ao coordenador do cliente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Coluna esquerda ── */}
        <div className="space-y-4">

          {/* Seleção OS */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <label className={labelCls}>Ordem de Serviço</label>
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
                      <p className="text-xs text-gray-600 px-3 py-3">Nenhuma OS orçada disponível</p>
                    ) : osFiltradas.map(os => (
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
              <div className="mt-3 bg-white/[0.02] rounded-lg px-3 py-2 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-gray-500">
                  <Building2 size={11} />
                  <span className="text-gray-300">{osSelecionada.empresa_nome}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <User size={11} />
                  <span className="text-gray-300">{osSelecionada.coordenador_nome}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar size={11} />
                  <span className="text-gray-300">Entrega: {formatDate(osSelecionada.data_entrega)}</span>
                </div>
                {osSelecionada.coordenador_email && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Mail size={11} />
                    <span className="text-gray-300">{osSelecionada.coordenador_email}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resumo orçamento */}
          {orcamento && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Resumo do Orçamento</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Custo Máquinas</span>
                  <span className="text-gray-300">{fmt(orcamento.custo_maquinas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Custo Materiais</span>
                  <span className="text-gray-300">{fmt(orcamento.custo_materiais)}</span>
                </div>
                <div className="flex justify-between border-t border-white/[0.06] pt-1.5">
                  <span className="text-gray-400 font-medium">Subtotal</span>
                  <span className="text-white font-medium">{fmt(orcamento.subtotal)}</span>
                </div>
                {orcamento.margem > 0 && <div className="flex justify-between"><span className="text-gray-500">Margem ({fmtN(orcamento.margem)}%)</span><span className="text-gray-300">{fmt(orcamento.total * orcamento.margem / 100)}</span></div>}
                {orcamento.comissao > 0 && <div className="flex justify-between"><span className="text-gray-500">Comissão ({fmtN(orcamento.comissao)}%)</span><span className="text-gray-300">{fmt(orcamento.total * orcamento.comissao / 100)}</span></div>}
                {orcamento.impostos > 0 && <div className="flex justify-between"><span className="text-gray-500">Impostos ({fmtN(orcamento.impostos)}%)</span><span className="text-gray-300">{fmt(orcamento.total * orcamento.impostos / 100)}</span></div>}
                {orcamento.plus > 0 && <div className="flex justify-between"><span className="text-gray-500">Plus ({fmtN(orcamento.plus)}%)</span><span className="text-gray-300">{fmt(orcamento.total * orcamento.plus / 100)}</span></div>}
                <div className="flex justify-between items-center border-t border-white/[0.06] pt-2 mt-1">
                  <span className="text-sm font-bold text-white">TOTAL</span>
                  <span className="text-lg font-bold text-sky-400">{fmt(orcamento.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Coluna direita: email ── */}
        <div className="lg:col-span-2">
          {carregando ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 size={24} className="text-gray-600 animate-spin" />
            </div>
          ) : !osSelecionada ? (
            <div className="flex items-center justify-center py-32">
              <div className="text-center">
                <Send size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Selecione uma OS orçada para enviar</p>
              </div>
            </div>
          ) : enviado ? (
            <div className="flex items-center justify-center py-32">
              <div className="text-center">
                <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
                <p className="text-white font-semibold text-lg">Orçamento Enviado!</p>
                <p className="text-gray-500 text-sm mt-1">OS marcada como enviada ao cliente</p>
              </div>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.05]">
                <Mail size={14} className="text-blue-400" />
                <h2 className="text-sm font-bold text-white">Compor Email</h2>
                <p className="text-xs text-gray-600 ml-auto">Edite o conteúdo antes de enviar</p>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className={labelCls}>Para</label>
                  <input type="email" value={emailPara} onChange={e => setEmailPara(e.target.value)}
                    placeholder="email@cliente.com" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Assunto</label>
                  <input type="text" value={emailAssunto} onChange={e => setEmailAssunto(e.target.value)}
                    className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Mensagem</label>
                  <textarea value={emailCorpo} onChange={e => setEmailCorpo(e.target.value)}
                    rows={14}
                    className={`${inputCls} resize-none font-mono text-xs leading-relaxed`} />
                </div>

                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <FileText size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-400">Lembre-se de anexar o PDF do orçamento antes de enviar o email.</p>
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-1">
                  <button onClick={gerarPDF} disabled={gerandoPDF || !orcamento}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 text-sm font-semibold rounded-lg transition disabled:opacity-50">
                    {gerandoPDF ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {gerandoPDF ? 'Gerando...' : 'Baixar PDF'}
                  </button>

                  <button onClick={abrirEmail} disabled={enviando || !emailPara}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 shadow-lg shadow-blue-500/20">
                    {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {enviando ? 'Abrindo email...' : 'Abrir no Email e Marcar como Enviado'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
