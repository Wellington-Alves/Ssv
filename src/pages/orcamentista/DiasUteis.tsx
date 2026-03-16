import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Calendar, ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react'

interface DiaUtil {
  id: number
  data: string
  dia_util: boolean
}

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
]
const SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export default function DiasUteis() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [datasUteis, setDatasUteis] = useState<DiaUtil[]>([])
  const [alteracoes, setAlteracoes] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'erro' } | null>(null)

  const showToast = (msg: string, tipo: 'ok' | 'erro' = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  const carregar = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('datas_uteis')
      .select('id, data, dia_util')
    if (error) { showToast('Erro ao carregar calendário!', 'erro'); setLoading(false); return }
    setDatasUteis(data ?? [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const ano = currentDate.getFullYear()
  const mes = currentDate.getMonth()

  const semanas = useMemo(() => {
    const inicio = new Date(ano, mes, 1)
    const fim = new Date(ano, mes + 1, 0)
    const dias: Date[][] = []
    const cur = new Date(inicio)
    cur.setDate(cur.getDate() - cur.getDay())
    while (cur <= fim) {
      const semana: Date[] = []
      for (let i = 0; i < 7; i++) {
        semana.push(new Date(cur))
        cur.setDate(cur.getDate() + 1)
      }
      dias.push(semana)
    }
    return dias
  }, [ano, mes])

  const getDayState = (day: Date): 'util' | 'nutil' | 'fora' => {
    if (day.getMonth() !== mes) return 'fora'
    const key = day.toISOString().split('T')[0]
    if (alteracoes[key] !== undefined) return alteracoes[key] ? 'util' : 'nutil'
    const no_banco = datasUteis.find(d => d.data === key)
    if (no_banco) return no_banco.dia_util ? 'util' : 'nutil'
    return 'nutil'
  }

  const toggleDay = (day: Date) => {
    if (day.getMonth() !== mes) return
    const key = day.toISOString().split('T')[0]
    const atual = getDayState(day)
    setAlteracoes(prev => ({ ...prev, [key]: atual !== 'util' }))
  }

  const salvar = async () => {
    if (Object.keys(alteracoes).length === 0) return
    setSalvando(true)
    try {
      for (const [data, dia_util] of Object.entries(alteracoes)) {
        const existente = datasUteis.find(d => d.data === data)
        if (existente) {
          await supabase.from('datas_uteis').update({ dia_util }).eq('id', existente.id)
        } else {
          await supabase.from('datas_uteis').insert({ data, dia_util })
        }
      }
      await carregar()
      setAlteracoes({})
      showToast('Alterações salvas com sucesso!')
    } catch {
      showToast('Erro ao salvar alterações!', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const totalAlteracoes = Object.keys(alteracoes).length
  const diasUteisMes = useMemo(() => {
    return datasUteis.filter(d => {
      const dt = new Date(d.data + 'T00:00:00')
      return dt.getMonth() === mes && dt.getFullYear() === ano && d.dia_util
    }).length
  }, [datasUteis, mes, ano])

  return (
    <div className="min-h-full p-6 md:p-8">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium
          ${toast.tipo === 'ok' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Calendar size={20} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Dias Úteis</h1>
            <p className="text-xs text-gray-500">
              {diasUteisMes} dias úteis em {MESES[mes]} · {ano}
            </p>
          </div>
        </div>
        <button
          onClick={salvar}
          disabled={totalAlteracoes === 0 || salvando}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
        >
          {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {salvando ? 'Salvando...' : `Salvar${totalAlteracoes > 0 ? ` (${totalAlteracoes})` : ''}`}
        </button>
      </div>

      {/* Navegação mês */}
      <div className="flex items-center justify-between mb-6 max-w-xl mx-auto">
        <button
          onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-lg font-bold text-white capitalize">
          {MESES[mes]} {ano}
        </h2>
        <button
          onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Calendário */}
      <div className="max-w-xl mx-auto">
        {/* Cabeçalho dias da semana */}
        <div className="grid grid-cols-7 mb-2">
          {SEMANA.map(d => (
            <div key={d} className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider py-2">
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-gray-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {semanas.map((semana, si) => (
              <div key={si} className="grid grid-cols-7 gap-1">
                {semana.map((dia, di) => {
                  const state = getDayState(dia)
                  const alterado = alteracoes[dia.toISOString().split('T')[0]] !== undefined

                  return (
                    <button
                      key={di}
                      onClick={() => toggleDay(dia)}
                      disabled={state === 'fora'}
                      className={`
                        relative aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all
                        ${state === 'fora' ? 'opacity-20 cursor-default' : 'cursor-pointer'}
                        ${state === 'util' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30' : ''}
                        ${state === 'nutil' && state !== 'fora' ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20' : ''}
                        ${state === 'fora' ? 'text-gray-600 border border-transparent' : ''}
                      `}
                    >
                      {dia.getDate()}
                      {alterado && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* Legenda */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />
            <span className="text-xs text-gray-500">Dia útil</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-rose-500/10 border border-rose-500/20" />
            <span className="text-xs text-gray-500">Não útil</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-transparent border border-transparent relative">
              <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-amber-400" />
            </div>
            <span className="text-xs text-gray-500">Alterado</span>
          </div>
        </div>
      </div>
    </div>
  )
}
