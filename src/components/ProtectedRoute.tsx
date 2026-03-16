import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { Perfil } from '../types/database'

interface Props {
  children: React.ReactNode
  perfisPermitidos?: Perfil[]
}

export default function ProtectedRoute({ children, perfisPermitidos }: Props) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Carregando...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (perfisPermitidos && profile && !perfisPermitidos.includes(profile.perfil)) {
    return <Navigate to="/sem-permissao" replace />
  }

  return <>{children}</>
}
