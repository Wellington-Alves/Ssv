// ============================================================
// types/database.ts — Tipos espelho do banco SSV (Supabase)
// ============================================================

export type Perfil = 'admin' | 'orcamentista' | 'pcp' | 'gerente' | 'diretoria'

export type StatusOS =
  | 'liberado_orcamento'
  | 'processo_concluido'
  | 'orcado'
  | 'enviado'
  | 'aprovado'
  | 'reprovado'
  | 'em_producao'
  | 'concluido'

export type StatusOperacao = 'pendente' | 'em_andamento' | 'concluida'

export interface Profile {
  id: string
  nome: string
  perfil: Perfil
  ativo: boolean
  created_at: string
}

export interface Empresa {
  id: number
  nome: string
  ativo: boolean
  created_at: string
}

export interface Coordenador {
  id: number
  nome: string
  contato: string | null
  email: string | null
  telefone: string | null
  empresa_id: number
  ativo: boolean
  created_at: string
}

export interface Maquina {
  id: number
  maquina: string
  jornada: number
  vl_hora: number
  ativo: boolean
  created_at: string
}

export interface Material {
  id: number
  nome_material: string
  densidade: number | null
  valor_kg: number | null
  ativo: boolean
  created_at: string
}

export interface OrdemServico {
  id: number
  numero_os_cliente: string | null
  empresa_id: number
  coordenador_id: number | null
  desenho: string | null
  data_entrega: string | null
  data_cadastro: string
  status: StatusOS
  email_enviado: boolean
  email_enviado_em: string | null
  criado_por: string | null
  observacao: string | null
  created_at: string
  updated_at: string
}

export interface HistoricoStatusOS {
  id: number
  os_id: number
  status_de: StatusOS | null
  status_para: StatusOS
  alterado_por: string | null
  observacao: string | null
  created_at: string
}

export interface Posicao {
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
  created_at: string
  updated_at: string
}

export interface OperacaoPosicao {
  id: number
  posicao_id: number
  ordem: number
  maquina_id: number | null
  horas: number | null
  status: StatusOperacao
  data_limite: string | null
  data_planejada: string | null
  numero_dias: number | null
  observacao: string | null
  created_at: string
  updated_at: string
}

export interface OrcamentoMaterial {
  id: number
  os_id: number
  posicao_id: number
  material_id: number | null
  formato: string | null
  diametro: number | null
  diametro_interno: number | null
  largura: number | null
  espessura: number | null
  comprimento: number | null
  peso_calculado: number | null
  valor_total: number | null
  created_at: string
}

export interface Orcamento {
  id: number
  os_id: number
  custo_maquinas: number
  custo_materiais: number
  subtotal: number
  margem: number
  comissao: number
  impostos: number
  plus: number
  total: number
  criado_por: string | null
  created_at: string
}

export interface Carga {
  id: number
  os_id: number
  posicao_id: number
  operacao_id: number | null
  maquina_id: number | null
  horas_programadas: number | null
  data: string | null
  created_at: string
}

export interface DataUtil {
  id: number
  data: string
  dia_util: boolean
}

// --- Joins ---
export interface OrdemServicoCompleta extends OrdemServico {
  empresas: Pick<Empresa, 'id' | 'nome'> | null
  coordenadores: Pick<Coordenador, 'id' | 'nome'> | null
}

export interface PosicaoComOperacoes extends Posicao {
  operacoes_posicao: OperacaoComMaquina[]
  material: Pick<Material, 'id' | 'nome_material'> | null
}

export interface OperacaoComMaquina extends OperacaoPosicao {
  maquinas: Pick<Maquina, 'id' | 'maquina' | 'vl_hora'> | null
}

// --- Payloads ---
export type EmpresaPayload         = Omit<Empresa,         'id' | 'created_at'>
export type CoordenadorPayload     = Omit<Coordenador,     'id' | 'created_at'>
export type MaquinaPayload         = Omit<Maquina,         'id' | 'created_at'>
export type MaterialPayload        = Omit<Material,        'id' | 'created_at'>
export type OrdemServicoPayload    = Omit<OrdemServico,    'id' | 'created_at' | 'updated_at'>
export type PosicaoPayload         = Omit<Posicao,         'id' | 'created_at' | 'updated_at'>
export type OperacaoPosicaoPayload = Omit<OperacaoPosicao, 'id' | 'created_at' | 'updated_at'>

export interface Database {
  "PostgrestVersion": "12"
  public: {
    Tables: {
      profiles:            { Row: Profile;           Insert: Omit<Profile, 'created_at'>;                                Update: Partial<Omit<Profile, 'id'>> }
      empresas:            { Row: Empresa;           Insert: Omit<Empresa, 'id' | 'created_at'>;                         Update: Partial<Omit<Empresa, 'id' | 'created_at'>> }
      coordenadores:       { Row: Coordenador;       Insert: Omit<Coordenador, 'id' | 'created_at'>;                     Update: Partial<Omit<Coordenador, 'id' | 'created_at'>> }
      maquinas:            { Row: Maquina;           Insert: Omit<Maquina, 'id' | 'created_at'>;                         Update: Partial<Omit<Maquina, 'id' | 'created_at'>> }
      material:            { Row: Material;          Insert: Omit<Material, 'id' | 'created_at'>;                        Update: Partial<Omit<Material, 'id' | 'created_at'>> }
      ordens_servico:      { Row: OrdemServico;      Insert: Omit<OrdemServico, 'id' | 'created_at' | 'updated_at'>;     Update: Partial<Omit<OrdemServico, 'id' | 'created_at'>> }
      historico_status_os: { Row: HistoricoStatusOS; Insert: Omit<HistoricoStatusOS, 'id' | 'created_at'>;               Update: never }
      posicoes:            { Row: Posicao;           Insert: Omit<Posicao, 'id' | 'created_at' | 'updated_at'>;          Update: Partial<Omit<Posicao, 'id' | 'created_at'>> }
      operacoes_posicao:   { Row: OperacaoPosicao;   Insert: Omit<OperacaoPosicao, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<OperacaoPosicao, 'id' | 'created_at'>> }
      orcamento_materiais: { Row: OrcamentoMaterial; Insert: Omit<OrcamentoMaterial, 'id' | 'created_at'>;               Update: Partial<Omit<OrcamentoMaterial, 'id' | 'created_at'>> }
      orcamentos:          { Row: Orcamento;         Insert: Omit<Orcamento, 'id' | 'created_at'>;                       Update: Partial<Omit<Orcamento, 'id' | 'created_at'>> }
      carga:               { Row: Carga;             Insert: Omit<Carga, 'id' | 'created_at'>;                           Update: Partial<Omit<Carga, 'id' | 'created_at'>> }
      datas_uteis:         { Row: DataUtil;          Insert: Omit<DataUtil, 'id'>;                                       Update: Partial<Omit<DataUtil, 'id'>> }
      anexos_os:           { Row: { id: number; os_id: number; nome_arquivo: string; storage_path: string; tamanho: number | null; created_at: string }; Insert: { os_id: number; nome_arquivo: string; storage_path: string; tamanho: number | null }; Update: never }
    }
  }
}


