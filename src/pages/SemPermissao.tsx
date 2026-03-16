import { useNavigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'

export default function SemPermissao() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <ShieldOff size={48} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Acesso negado</h1>
        <p className="text-gray-500 mb-6">Voce nao tem permissao para acessar esta pagina.</p>
        <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Voltar ao inicio
        </button>
      </div>
    </div>
  )
}
