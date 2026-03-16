import { useEffect, useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import {
  FileText, ChevronDown, Loader2, Calculator, Download,
  Package, Cpu, Check, ArrowRight,
} from 'lucide-react'

// ─── Interfaces ───────────────────────────────────────────────
interface OS {
  id: number
  numero_os_cliente: string | null
  data_entrega: string | null
  empresa_nome: string
  coordenador_nome: string
  status: string
}

interface PosicaoCalc {
  id: number
  posicao: number
  quantidade_pecas: number | null
  quantidade_material: number | null
  material_nome: string | null
  material_valor_kg: number | null
  material_densidade: number | null
  formato: string | null
  bitola: string | null
  largura: number | null
  comprimento: number | null
  parede: string | null
  custo_maquinas: number
  custo_material: number
  peso_calculado: number | null
  operacoes: { maquina: string; horas: number; vl_hora: number }[]
}

interface Percentuais {
  margem: string
  comissao: string
  impostos: string
  plus: string
}

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtN = (v: number, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })

const formatDate = (d: string | null) => {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`
}

// Calcula peso em kg baseado no formato e dimensões
const calcularPeso = (pos: PosicaoCalc): number => {
  const { formato, bitola, largura, comprimento, parede, material_densidade, quantidade_material } = pos
  if (!comprimento || !material_densidade) return 0
  const qtd = quantidade_material ?? 1
  const dens = material_densidade

  // Extrai diâmetro em mm da bitola (ex: '1" (25,4mm)' → 25.4)
  const extrairDiam = (b: string | null): number => {
    if (!b) return 0
    // Tenta extrair valor entre parênteses: (25,4mm) ou (25.4mm)
    const m = b.match(/\(([0-9]+[.,][0-9]+)\s*mm\)/)
    if (m) return parseFloat(m[1].replace(',', '.'))
    // Tenta número inteiro: (25mm)
    const m2 = b.match(/\(([0-9]+)\s*mm\)/)
    return m2 ? parseFloat(m2[1]) : 0
  }

  const diam = extrairDiam(bitola)
  const larg = largura ?? diam
  const comp = comprimento

  if (!diam && !larg) return 0

  switch (formato) {
    case 'Ø':
    case 'Trefilado':
    case 'Sextavado': {
      // Barra redonda: (π/4) × d² × L × ρ × 0.001 (mm + g/cm³ → kg)
      return (Math.PI / 4) * diam * diam * comp * dens * 0.001 / 1000 * qtd
    }
    case '#': {
      // Barra chata: larg × esp × L × ρ × 0.001
      const esp = diam
      return (larg * esp * comp * dens * 0.001 / 1000) * qtd
    }
    case 'Tubo Ø':
    case 'Tubo #': {
      // Tubo: (π/4) × (D² - d²) × L × ρ × 0.001
      const paredeNum = parede ? parseFloat(parede.replace(',', '.')) : 0
      const dInt = diam - 2 * paredeNum
      return (Math.PI / 4) * (diam * diam - dInt * dInt) * comp * dens * 0.001 / 1000 * qtd
    }
    default:
      return 0
  }
}

const labelCls = "block text-xs font-medium text-gray-500 mb-1"
const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition"

// ─── Componente ───────────────────────────────────────────────
export default function Orcamento() {
  const { user } = useAuth()
  const [osList, setOsList] = useState<OS[]>([])
  const [osSelecionada, setOsSelecionada] = useState<OS | null>(null)
  const [posicoes, setPosicoes] = useState<PosicaoCalc[]>([])
  const [loading, setLoading] = useState(true)
  const [calculando, setCalculando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'erro' } | null>(null)
  const [osDropdown, setOsDropdown] = useState(false)
  const [buscaOs, setBuscaOs] = useState('')
  const [percentuais, setPercentuais] = useState<Percentuais>({ margem: '', comissao: '', impostos: '', plus: '' })
  const [salvo, setSalvo] = useState(false)
  const [liberando, setLiberando] = useState(false)

  const bloqueado = osSelecionada?.status === 'enviado' || osSelecionada?.status === 'aprovado' || osSelecionada?.status === 'reprovado'

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

  // Carregar lista de OS
  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      const { data: os } = await supabase
        .from('ordens_servico')
        .select('id, numero_os_cliente, data_entrega, empresa_id, coordenador_id, status')
        .in('status', ['processo_concluido', 'orcado'])
        .order('id', { ascending: true })

      const empresaIds = [...new Set((os ?? []).map((o: any) => o.empresa_id))]
      const coordIds = [...new Set((os ?? []).filter((o: any) => o.coordenador_id).map((o: any) => o.coordenador_id))]

      const [{ data: empresas }, { data: coords }] = await Promise.all([
        supabase.from('empresas').select('id, nome').in('id', empresaIds),
        supabase.from('coordenadores').select('id, nome').in('id', coordIds),
      ])

      const empMap = Object.fromEntries((empresas ?? []).map((e: any) => [e.id, e.nome]))
      const coordMap = Object.fromEntries((coords ?? []).map((c: any) => [c.id, c.nome]))

      setOsList((os ?? []).map((o: any) => ({
        id: o.id,
        numero_os_cliente: o.numero_os_cliente,
        data_entrega: o.data_entrega,
        empresa_nome: empMap[o.empresa_id] ?? '—',
        coordenador_nome: coordMap[o.coordenador_id] ?? '—',
        status: o.status,
      })))
      setLoading(false)
    }
    carregar()
  }, [])

  // Carregar posições e calcular custos
  const selecionarOS = async (os: OS) => {
    setOsSelecionada(os)
    setOsDropdown(false)
    setBuscaOs('')
    setPosicoes([])
    setSalvo(false)
    setPercentuais({ margem: '', comissao: '', impostos: '', plus: '' })
    setCalculando(true)

    const { data: posData } = await supabase
      .from('posicoes')
      .select('*, material(id, nome_material, valor_kg, densidade)')
      .eq('os_id', os.id)
      .order('posicao')

    // Carregar percentuais salvos
    const { data: orcData } = await supabase
      .from('orcamentos')
      .select('margem, comissao, impostos, plus')
      .eq('os_id', os.id)
      .limit(1)

    if (orcData && orcData.length > 0) {
      const o = orcData[0]
      setPercentuais({
        margem:   o.margem   ? String(o.margem)   : '',
        comissao: o.comissao ? String(o.comissao) : '',
        impostos: o.impostos ? String(o.impostos) : '',
        plus:     o.plus     ? String(o.plus)     : '',
      })
    }

    const { data: opsData } = await supabase
      .from('operacoes_posicao')
      .select('posicao_id, horas, maquinas(id, maquina, vl_hora)')
      .in('posicao_id', (posData ?? []).map((p: any) => p.id))

    const posCalc: PosicaoCalc[] = (posData ?? []).map((p: any) => {
      const ops = (opsData ?? [])
        .filter((o: any) => o.posicao_id === p.id)
        .map((o: any) => ({
          maquina: o.maquinas?.maquina ?? '—',
          horas: Number(o.horas) || 0,
          vl_hora: Number(o.maquinas?.vl_hora) || 0,
        }))

      const custo_maquinas = ops.reduce((acc, o) => acc + o.horas * o.vl_hora, 0)

      const base: PosicaoCalc = {
        id: p.id,
        posicao: p.posicao,
        quantidade_pecas: p.quantidade_pecas,
        quantidade_material: p.quantidade_material,
        material_nome: p.material?.nome_material ?? null,
        material_valor_kg: p.material?.valor_kg ?? null,
        material_densidade: p.material?.densidade ?? null,
        formato: p.formato,
        bitola: p.bitola,
        largura: p.largura,
        comprimento: p.comprimento,
        parede: p.parede,
        custo_maquinas,
        custo_material: 0,
        peso_calculado: null,
        operacoes: ops,
      }

      const peso = calcularPeso(base)
      base.peso_calculado = peso
      base.custo_material = peso * (p.material?.valor_kg ?? 0)

      return base
    })

    setPosicoes(posCalc)
    setCalculando(false)
  }

  // Totais calculados
  const totais = useMemo(() => {
    const custo_maquinas = posicoes.reduce((a, p) => a + p.custo_maquinas, 0)
    const custo_materiais = posicoes.reduce((a, p) => a + p.custo_material, 0)
    const subtotal = custo_maquinas + custo_materiais

    const margem = parseFloat(percentuais.margem) || 0
    const comissao = parseFloat(percentuais.comissao) || 0
    const impostos = parseFloat(percentuais.impostos) || 0
    const plus = parseFloat(percentuais.plus) || 0

    const totalPct = margem + comissao + impostos + plus
    const total = totalPct > 0 ? subtotal / (1 - totalPct / 100) : subtotal

    const vMargem = total * margem / 100
    const vComissao = total * comissao / 100
    const vImpostos = total * impostos / 100
    const vPlus = total * plus / 100

    return { custo_maquinas, custo_materiais, subtotal, margem, comissao, impostos, plus, total, vMargem, vComissao, vImpostos, vPlus }
  }, [posicoes, percentuais])

  // Salvar orçamento
  const executarSalvar = async (): Promise<boolean> => {
    if (!osSelecionada) return false
    const payload = {
      os_id: osSelecionada.id,
      custo_maquinas: totais.custo_maquinas,
      custo_materiais: totais.custo_materiais,
      subtotal: totais.subtotal,
      margem: parseFloat(percentuais.margem) || 0,
      comissao: parseFloat(percentuais.comissao) || 0,
      impostos: parseFloat(percentuais.impostos) || 0,
      plus: parseFloat(percentuais.plus) || 0,
      total: totais.total,
      criado_por: user?.id ?? null,
    }
    const { data: existingList } = await supabase.from('orcamentos').select('id').eq('os_id', osSelecionada.id)
    const existing = existingList?.[0] ?? null
    const { error } = existing
      ? await supabase.from('orcamentos').update(payload).eq('id', existing.id)
      : await supabase.from('orcamentos').insert(payload)
    return !error
  }

  const salvarOrcamento = async () => {
    if (!osSelecionada) return
    setSalvando(true)
    try {
      const ok = await executarSalvar()
      if (ok) { showToast('Orçamento salvo com sucesso!'); setSalvo(true) }
      else showToast('Erro ao salvar orçamento', 'erro')
    } catch {
      showToast('Erro ao salvar orçamento', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  // Liberar para ADM
  const liberarParaADM = async () => {
    if (!osSelecionada) return
    setLiberando(true)
    try {
      const ok = await executarSalvar()
      if (!ok) { showToast('Erro ao salvar orçamento', 'erro'); return }
      await supabase.from('ordens_servico').update({ status: 'orcado' }).eq('id', osSelecionada.id)
      showToast('OS liberada para o ADM!')
      setSalvo(true)
    } catch {
      showToast('Erro ao liberar OS', 'erro')
    } finally {
      setLiberando(false)
    }
  }

  // Gerar PDF
  const gerarPDF = async () => {
    if (!osSelecionada) return
    setGerandoPDF(true)

    try {
      const { default: jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm' as any)
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const W = 210
      const margin = 15
      let y = 20

      // ── Cabeçalho ──
      doc.setFillColor(15, 17, 23)
      doc.rect(0, 0, W, 40, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('ORÇAMENTO', margin, y)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150, 150, 150)
      doc.text(`SSV — Sistema de Gestão`, margin, y + 7)

      // Info OS
      doc.setTextColor(200, 200, 200)
      doc.setFontSize(9)
      doc.text(`OS #${osSelecionada.id}${osSelecionada.numero_os_cliente ? ' · ' + osSelecionada.numero_os_cliente : ''}`, W - margin, y, { align: 'right' })
      doc.text(`Empresa: ${osSelecionada.empresa_nome}`, W - margin, y + 6, { align: 'right' })
      doc.text(`Entrega: ${formatDate(osSelecionada.data_entrega)}`, W - margin, y + 12, { align: 'right' })

      y = 50

      // ── Posições ──
      doc.setTextColor(30, 30, 30)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('DETALHES POR POSIÇÃO', margin, y)
      y += 7

      // Cabeçalho tabela
      doc.setFillColor(240, 240, 240)
      doc.rect(margin, y, W - margin * 2, 7, 'F')
      doc.setFontSize(8)
      doc.setTextColor(80, 80, 80)
      doc.text('Pos.', margin + 2, y + 5)
      doc.text('Qtd. Peças', margin + 15, y + 5)
      doc.text('Material', margin + 40, y + 5)
      doc.text('Peso (kg)', margin + 95, y + 5)
      doc.text('Custo Máq.', margin + 120, y + 5)
      doc.text('Custo Mat.', margin + 148, y + 5)
      doc.text('Total Pos.', margin + 165, y + 5, { align: 'right' })
      y += 9

      // Linhas
      posicoes.forEach((pos, i) => {
        if (y > 270) { doc.addPage(); y = 20 }
        if (i % 2 === 0) {
          doc.setFillColor(250, 250, 250)
          doc.rect(margin, y - 1, W - margin * 2, 7, 'F')
        }
        doc.setTextColor(30, 30, 30)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.text(String(pos.posicao), margin + 2, y + 4)
        doc.text(String(pos.quantidade_pecas ?? '—'), margin + 15, y + 4)
        doc.text((pos.material_nome ?? '—').substring(0, 20), margin + 40, y + 4)
        doc.text(pos.peso_calculado ? fmtN(pos.peso_calculado, 3) : '—', margin + 95, y + 4)
        doc.text(fmt(pos.custo_maquinas), margin + 120, y + 4)
        doc.text(fmt(pos.custo_material), margin + 148, y + 4)
        doc.setFont('helvetica', 'bold')
        doc.text(fmt(pos.custo_maquinas + pos.custo_material), W - margin, y + 4, { align: 'right' })
        y += 8
      })

      y += 5

      // ── Operações por posição ──
      posicoes.forEach(pos => {
        if (pos.operacoes.length === 0) return
        if (y > 250) { doc.addPage(); y = 20 }

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(50, 50, 50)
        doc.text(`Posição ${pos.posicao} — Operações`, margin, y)
        y += 5

        doc.setFillColor(245, 245, 245)
        doc.rect(margin, y, W - margin * 2, 6, 'F')
        doc.setFontSize(7.5)
        doc.setTextColor(100, 100, 100)
        doc.text('Máquina', margin + 2, y + 4)
        doc.text('Horas', margin + 70, y + 4)
        doc.text('R$/h', margin + 100, y + 4)
        doc.text('Custo', W - margin, y + 4, { align: 'right' })
        y += 7

        pos.operacoes.forEach(op => {
          if (y > 275) { doc.addPage(); y = 20 }
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(30, 30, 30)
          doc.text(op.maquina, margin + 2, y + 3)
          doc.text(fmtN(op.horas), margin + 70, y + 3)
          doc.text(fmt(op.vl_hora), margin + 100, y + 3)
          doc.text(fmt(op.horas * op.vl_hora), W - margin, y + 3, { align: 'right' })
          y += 6
        })
        y += 4
      })

      // ── Resumo financeiro ──
      if (y > 200) { doc.addPage(); y = 20 }
      y += 5

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
      addLinha('Custo de Máquinas', fmt(totais.custo_maquinas))
      doc.line(margin, y - 3, W - margin, y - 3)
      addLinha('Custo de Materiais', fmt(totais.custo_materiais))
      doc.line(margin, y - 3, W - margin, y - 3)
      addLinha('Subtotal', fmt(totais.subtotal), true)

      if (totais.margem > 0) addLinha(`Margem de Lucro (${fmtN(totais.margem)}%)`, fmt(totais.vMargem))
      if (totais.comissao > 0) addLinha(`Comissão (${fmtN(totais.comissao)}%)`, fmt(totais.vComissao))
      if (totais.impostos > 0) addLinha(`Impostos (${fmtN(totais.impostos)}%)`, fmt(totais.vImpostos))
      if (totais.plus > 0) addLinha(`Plus (${fmtN(totais.plus)}%)`, fmt(totais.vPlus))

      y += 2
      doc.setFillColor(240, 248, 255)
      doc.rect(margin, y - 4, W - margin * 2, 10, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(14, 116, 144)
      doc.text('TOTAL', margin + 3, y + 3)
      doc.text(fmt(totais.total), W - margin, y + 3, { align: 'right' })

      // Rodapé
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin, 290)

      doc.save(`orcamento-os-${osSelecionada.id}.pdf`)
      showToast('PDF gerado com sucesso!')
    } catch (e) {
      console.error(e)
      showToast('Erro ao gerar PDF', 'erro')
    } finally {
      setGerandoPDF(false)
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
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <Calculator size={20} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Orçamento</h1>
          <p className="text-xs text-gray-500">Calcule e gere o orçamento da OS</p>
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
                <p>Coordenador: <span className="text-gray-300">{osSelecionada.coordenador_nome}</span></p>
                <p>Entrega: <span className="text-gray-300">{formatDate(osSelecionada.data_entrega)}</span></p>
              </div>
            )}
          </div>

          {/* Percentuais */}
          {osSelecionada && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Percentuais</h3>
              <div className="space-y-3">
                {[
                  { key: 'margem', label: 'Margem de Lucro (%)' },
                  { key: 'comissao', label: 'Comissão (%)' },
                  { key: 'impostos', label: 'Impostos (%)' },
                  { key: 'plus', label: 'Plus (%)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input type="number" min="0" max="100" step="0.01"
                      value={percentuais[key as keyof Percentuais]}
                      onChange={e => !bloqueado && setPercentuais(p => ({ ...p, [key]: e.target.value }))}
                      placeholder="0,00" disabled={bloqueado}
                      className={`${inputCls} ${bloqueado ? 'opacity-50 cursor-not-allowed' : ''}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumo */}
          {osSelecionada && posicoes.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Resumo</h3>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Custo Máquinas</span>
                <span className="text-gray-300">{fmt(totais.custo_maquinas)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Custo Materiais</span>
                <span className="text-gray-300">{fmt(totais.custo_materiais)}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-white/[0.06] pt-2">
                <span className="text-gray-400 font-medium">Subtotal</span>
                <span className="text-white font-medium">{fmt(totais.subtotal)}</span>
              </div>
              {totais.margem > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Margem ({fmtN(totais.margem)}%)</span>
                  <span className="text-gray-300">{fmt(totais.vMargem)}</span>
                </div>
              )}
              {totais.comissao > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Comissão ({fmtN(totais.comissao)}%)</span>
                  <span className="text-gray-300">{fmt(totais.vComissao)}</span>
                </div>
              )}
              {totais.impostos > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Impostos ({fmtN(totais.impostos)}%)</span>
                  <span className="text-gray-300">{fmt(totais.vImpostos)}</span>
                </div>
              )}
              {totais.plus > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Plus ({fmtN(totais.plus)}%)</span>
                  <span className="text-gray-300">{fmt(totais.vPlus)}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-white/[0.06] pt-3 mt-1">
                <span className="text-sm font-bold text-white">TOTAL</span>
                <span className="text-lg font-bold text-sky-400">{fmt(totais.total)}</span>
              </div>

              {/* Botões */}
              {bloqueado ? (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <FileText size={13} className="text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-400">Orçamento bloqueado para edição</p>
                  </div>
                  <button onClick={gerarPDF} disabled={gerandoPDF}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50">
                    {gerandoPDF ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    {gerandoPDF ? 'Gerando...' : 'Gerar PDF'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 pt-2">
                  <button onClick={salvarOrcamento} disabled={salvando}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 text-xs font-semibold rounded-lg transition disabled:opacity-50">
                    {salvando ? <Loader2 size={13} className="animate-spin" /> : salvo ? <Check size={13} className="text-emerald-400" /> : <FileText size={13} />}
                    {salvando ? 'Salvando...' : salvo ? 'Salvo!' : 'Salvar'}
                  </button>
                  <button onClick={liberarParaADM} disabled={liberando}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50">
                    {liberando ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                    {liberando ? 'Liberando...' : 'Liberar p/ ADM'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Coluna direita: posições ── */}
        <div className="lg:col-span-2">
          {calculando ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 size={24} className="text-gray-600 animate-spin" />
            </div>
          ) : !osSelecionada ? (
            <div className="flex items-center justify-center py-32">
              <div className="text-center">
                <Calculator size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Selecione uma OS para calcular o orçamento</p>
              </div>
            </div>
          ) : posicoes.length === 0 ? (
            <div className="flex items-center justify-center py-32">
              <div className="text-center">
                <FileText size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nenhuma posição cadastrada para esta OS</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {posicoes.map(pos => (
                <div key={pos.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                  {/* Header posição */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05] bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 text-xs font-bold flex items-center justify-center">
                        {pos.posicao}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">Posição {pos.posicao}</p>
                        <p className="text-xs text-gray-500">{pos.quantidade_pecas ?? '—'} peças</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total posição</p>
                      <p className="text-sm font-bold text-white">{fmt(pos.custo_maquinas + pos.custo_material)}</p>
                    </div>
                  </div>

                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Máquinas */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Cpu size={13} className="text-violet-400" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Máquinas</p>
                        <span className="ml-auto text-xs font-bold text-violet-400">{fmt(pos.custo_maquinas)}</span>
                      </div>
                      {pos.operacoes.length === 0 ? (
                        <p className="text-xs text-gray-600">Sem operações</p>
                      ) : (
                        <div className="space-y-1.5">
                          {pos.operacoes.map((op, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">{op.maquina}</span>
                              <span className="text-gray-500">{fmtN(op.horas)}h × {fmt(op.vl_hora)}</span>
                              <span className="text-gray-300 font-medium">{fmt(op.horas * op.vl_hora)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Material */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Package size={13} className="text-amber-400" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Material</p>
                        <span className="ml-auto text-xs font-bold text-amber-400">{fmt(pos.custo_material)}</span>
                      </div>
                      {!pos.material_nome ? (
                        <p className="text-xs text-gray-600">Sem material definido</p>
                      ) : (
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Material</span>
                            <span className="text-gray-300">{pos.material_nome}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Qtd. Material</span>
                            <span className="text-gray-300">{pos.quantidade_material ?? 1} un.</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Peso calculado</span>
                            <span className="text-gray-300">{pos.peso_calculado ? fmtN(pos.peso_calculado, 3) + ' kg' : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Valor/kg</span>
                            <span className="text-gray-300">{pos.material_valor_kg ? fmt(pos.material_valor_kg) : '—'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}