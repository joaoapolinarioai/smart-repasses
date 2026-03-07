import { Navigate, Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { Loader2, Clock, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminGuardProps {
    allowedRoles?: ('master' | 'admin' | 'mediator')[]
}

export function AdminGuard({ allowedRoles = ['master', 'admin', 'mediator'] }: AdminGuardProps) {
    const { profile, isLoading } = useAuthStore()

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        )
    }

    const hasAccess = profile && allowedRoles.includes(profile.role as any)

    if (!hasAccess) {
        return <Navigate to="/feed" replace />
    }

    return <Outlet />
}

export function ProfileCompletenessGuard() {
    const { profile, isLoading } = useAuthStore()

    if (isLoading) return null

    if (profile) {
        const isProfileIncomplete = !profile.username || !profile.phone || !profile.city || !profile.state

        if (isProfileIncomplete) {
            return (
                <div className="min-h-[80vh] flex items-center justify-center p-6 text-center">
                    <div className="max-w-md space-y-8">
                        <div className="w-24 h-24 rounded-[2.5rem] bg-amber-500/10 border-2 border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-2xl">
                            <ShieldAlert className="w-10 h-10 animate-pulse" />
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                                Perfil Incompleto
                            </h1>
                            <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px] leading-relaxed max-w-[280px] mx-auto">
                                Para acessar todas as funcionalidades do ecossistema, você precisa configurar sua identidade digital, telefone e localização.
                            </p>
                        </div>

                        <div className="pt-4">
                            <Link
                                to="/settings"
                                className="inline-block w-full py-5 bg-primary text-black rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-opacity-90 transition-all shadow-xl active:scale-95 text-center"
                            >
                                Configurar Perfil Agora
                            </Link>
                        </div>
                    </div>
                </div>
            )
        }
    }

    return <Outlet />
}

export function StatusGuard() {
    const { profile, isLoading } = useAuthStore()

    if (isLoading) return null

    if (profile && profile.status !== 'active') {
        const isPending = profile.status === 'pending_approval'

        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-mesh opacity-20 blur-[100px]" />

                <div className="max-w-md space-y-8 relative z-10">
                    <div className={cn(
                        "w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto border-2 shadow-2xl transition-all duration-700",
                        isPending ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                    )}>
                        {isPending ? <Clock className="w-10 h-10 animate-pulse" /> : <ShieldAlert className="w-10 h-10" />}
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                            {isPending ? 'Cadastro em Análise' : 'Acesso Restrito'}
                        </h1>
                        <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px] leading-relaxed max-w-[280px] mx-auto">
                            {isPending
                                ? 'Sua solicitação foi recebida com sucesso. Nossa equipe administrativa validará seus dados em breve.'
                                : 'Sua conta foi suspensa por descumprimento dos termos de uso da nossa rede exclusiva.'}
                        </p>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                        <button
                            onClick={() => useAuthStore.getState().signOut()}
                            className="w-full py-5 bg-white text-black rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
                        >
                            Sair da Conta
                        </button>
                        {!isPending && (
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                DÚVIDAS? CONTATE O SUPORTE MASTER
                            </p>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return <Outlet />
}
