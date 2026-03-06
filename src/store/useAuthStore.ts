import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export interface Profile {
    id: string
    full_name: string
    username: string
    role: 'master' | 'admin' | 'mediator' | 'dealer'
    status: 'active' | 'suspended' | 'pending_approval' | 'blocked'
    avatar_url?: string
    store_name?: string
    [key: string]: any
}

interface AuthState {
    user: User | null
    profile: Profile | null
    isLoading: boolean
    setUser: (user: User | null) => void
    setProfile: (profile: Profile | null) => void
    signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    isLoading: true,
    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile, isLoading: false }),
    signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, isLoading: false })
    },
}))
