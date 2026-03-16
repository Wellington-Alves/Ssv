import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Profile, Perfil } from '../types/database'

interface AuthContextData {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  perfil: Perfil | null
  isAdmin: boolean
  isOrcamentista: boolean
  isPCP: boolean
  isGerente: boolean
  isDiretoria: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data ?? null)
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false) // libera imediatamente, sem esperar o profile
      if (s?.user) fetchProfile(s.user.id) // busca profile em paralelo
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return
      if (event === 'INITIAL_SESSION') return

      setSession(s)
      setUser(s?.user ?? null)

      if (s?.user) {
        fetchProfile(s.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: traduzirErro(error.message) }
      return { error: null }
    } catch {
      return { error: 'Erro ao fazer login. Tente novamente' }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setUser(null)
    setSession(null)
  }

  const perfil = profile?.perfil ?? null

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading, perfil,
      isAdmin: perfil === 'admin',
      isOrcamentista: perfil === 'orcamentista',
      isPCP: perfil === 'pcp',
      isGerente: perfil === 'gerente',
      isDiretoria: perfil === 'diretoria',
      signIn, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}

function traduzirErro(message: string): string {
  const erros: Record<string, string> = {
    'Invalid login credentials': 'Email ou senha incorretos',
    'Email not confirmed': 'Email ainda não confirmado',
    'User not found': 'Usuário não encontrado',
    'Too many requests': 'Muitas tentativas. Aguarde um momento',
  }
  return erros[message] ?? 'Erro ao fazer login. Tente novamente'
}