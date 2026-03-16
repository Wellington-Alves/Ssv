import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { perfil, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full py-32">
        <Loader2 size={24} className="text-gray-600 animate-spin" />
      </div>
    )
  }

  if (perfil === 'admin')        return <Navigate to="/dashboard-adm" replace />
  if (perfil === 'orcamentista') return <Navigate to="/dashboard-orcamentista" replace />
  if (perfil === 'pcp')          return <Navigate to="/carga" replace />
  if (perfil === 'gerente')      return <Navigate to="/dashboard" replace />
  if (perfil === 'diretoria')    return <Navigate to="/dashboard" replace />

  return (
    <div className="flex items-center justify-center min-h-full py-32">
      <p className="text-gray-500 text-sm">Perfil não configurado.</p>
    </div>
  )
}
