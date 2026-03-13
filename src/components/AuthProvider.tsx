import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setUser, setProfile } = useAuthStore()

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setUser(session.user)
                fetchProfile(session.user.id)
            } else {
                setUser(null)
                setProfile(null)
            }
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                setUser(session.user)
                fetchProfile(session.user.id)
            } else {
                setUser(null)
                setProfile(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (error) {
            console.error('Profile not found or error fetching profile:', error.message)
            // Se o perfil não existe mais no banco (foi deletado), desloga o auth
            const { signOut } = useAuthStore.getState()
            signOut()
            return
        }

        if (data) {
            setProfile(data)
        }
    }

    return <>{children}</>
}
