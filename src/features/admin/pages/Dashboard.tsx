import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
    Users, Car, ShieldCheck,
    ArrowUpRight, Clock, CheckCircle2, XCircle,
    Download, Loader2,
    UserPlus, Store, Mail, Calendar
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function AdminDashboard() {
    const queryClient = useQueryClient()

    // 1. Fetch Stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const [
                { count: dealers },
                { count: pending },
                { count: vehicles },
                { count: suspended }
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'dealer'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
                supabase.from('vehicles').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'suspended')
            ])
            return {
                dealers: dealers || 0,
                pending: pending || 0,
                vehicles: vehicles || 0,
                suspended: suspended || 0
            }
        },
        refetchInterval: 30000 // Refresh every 30s
    })

    // 2. Fetch Pending Approvals
    const { data: pendingUsers, isLoading: pendingLoading } = useQuery({
        queryKey: ['admin-pending-users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('status', 'pending_approval')
                .order('created_at', { ascending: false })
                .limit(5)
            if (error) throw error
            return data
        }
    })

    // 3. Mutation for Approval
    const approveMutation = useMutation({
        mutationFn: async ({ userId, action }: { userId: string, action: 'active' | 'suspended' }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ status: action })
                .eq('id', userId)
            if (error) throw error
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
            queryClient.invalidateQueries({ queryKey: ['admin-pending-users'] })
            toast.success(variables.action === 'active' ? 'Lojista aprovado com sucesso!' : 'Cadastro recusado.')
        }
    })

    const cards = [
        {
            title: 'Lojistas Ativos',
            value: stats?.dealers,
            change: '+12%',
            icon: Users,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/5',
            link: '/admin/users'
        },
        {
            title: 'Aguardando Aprovação',
            value: stats?.pending,
            change: null,
            icon: Clock,
            color: 'text-amber-500',
            bg: 'bg-amber-500/5',
            link: '/admin/users?status=pending_approval'
        },
        {
            title: 'Anúncios na Rede',
            value: stats?.vehicles,
            change: '+8%',
            icon: Car,
            color: 'text-blue-500',
            bg: 'bg-blue-500/5',
            link: '/inventory'
        },
        {
            title: 'Contas Restritas',
            value: stats?.suspended,
            change: '-2%',
            icon: ShieldCheck,
            color: 'text-red-500',
            bg: 'bg-red-500/5',
            link: '/admin/users?status=suspended'
        },
    ]

    return (
        <div className="min-h-screen bg-[#F8F9FA] p-8 lg:p-12 space-y-12 max-w-[1600px] mx-auto overflow-y-auto">

            {/* 1. Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Sistema Operacional On-line</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black text-[#0C0C0C] uppercase tracking-tighter leading-none">
                        Central Administrativa
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <button className="px-5 py-3 h-12 bg-white border border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 transition-all flex items-center gap-2 shadow-sm">
                        <Download className="w-3 h-3" /> Exportar Dados
                    </button>
                    <button className="px-5 py-3 h-12 bg-[#0C0C0C] border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#F0A727] hover:bg-zinc-900 transition-all flex items-center gap-2 shadow-xl shadow-black/5">
                        <UserPlus className="w-3 h-3" /> Novo Admin
                    </button>
                </div>
            </div>

            {/* 2. Primary Metrics Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <Link
                        key={card.title}
                        to={card.link}
                        className="block group"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] group-hover:border-[#F0A727]/50 group-hover:shadow-xl group-hover:shadow-orange-500/5 transition-all relative overflow-hidden h-full"
                        >
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6", card.bg, card.color)}>
                                <card.icon className="w-6 h-6" />
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                                    {card.title}
                                </span>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-3xl font-black text-[#0C0C0C] tracking-tighter">
                                        {statsLoading ? '...' : card.value}
                                    </span>
                                    {card.change && !statsLoading && (
                                        <span className={cn(
                                            "text-[10px] font-black px-2 py-0.5 rounded-full",
                                            card.change.startsWith('+') ? "text-emerald-500 bg-emerald-500/5" : "text-red-500 bg-red-500/5"
                                        )}>
                                            {card.change}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.03] scale-150 rotate-[-15deg] group-hover:scale-[1.7] group-hover:opacity-[0.06] transition-all duration-500 pointer-events-none">
                                <card.icon className="w-24 h-24" />
                            </div>
                        </motion.div>
                    </Link>
                ))}
            </div>

            {/* 3. Operational Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:items-start">

                {/* Left: Pending Approvals Queue */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#F0A727] rounded-xl flex items-center justify-center text-black">
                                <Clock className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-tighter text-[#0C0C0C]">Aprovações Urgentes</h2>
                        </div>
                        <Link to="/admin/users?status=pending_approval" className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-[10px] font-black text-zinc-500 uppercase transition-colors tracking-widest flex items-center gap-2">
                            Ver Todos <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-premium overflow-hidden">
                        <div className="divide-y divide-zinc-50">
                            {pendingLoading ? (
                                <div className="p-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-200" /></div>
                            ) : pendingUsers?.length === 0 ? (
                                <div className="p-20 text-center space-y-3">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-20" />
                                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Sem pendências críticas hoje.</p>
                                </div>
                            ) : (
                                pendingUsers?.map((user) => (
                                    <div key={user.id} className="p-8 hover:bg-zinc-50/50 transition-all flex items-center justify-between group">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 bg-zinc-100 rounded-2xl overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Store className="w-6 h-6 text-zinc-300" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-[#0C0C0C] uppercase tracking-tighter leading-none mb-2 group-hover:text-[#F0A727] transition-colors flex items-center gap-2">
                                                    {user.full_name || 'Sem Nome'}
                                                    <span className="text-[8px] px-2 py-0.5 bg-zinc-100 text-zinc-400 rounded-full">{user.store_name}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400">
                                                    <span className="flex items-center gap-1.5 uppercase tracking-widest">
                                                        <Mail className="w-3 h-3" /> {user.email}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 uppercase tracking-widest">
                                                        <Calendar className="w-3 h-3" /> {format(new Date(user.created_at), "dd MMM yyyy", { locale: ptBR })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => approveMutation.mutate({ userId: user.id, action: 'active' })}
                                                disabled={approveMutation.isPending}
                                                className="h-10 px-4 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                                            </button>
                                            <button
                                                onClick={() => approveMutation.mutate({ userId: user.id, action: 'suspended' })}
                                                disabled={approveMutation.isPending}
                                                className="h-10 px-4 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <XCircle className="w-3.5 h-3.5" /> Rejeitar
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Quick Actions & Intelligence */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Activity Feed / System Log */}
                    <div className="bg-[#0C0C0C] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#F0A727]">Status Global</h2>
                                <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-2 py-1 rounded-md">99.8% Uptime</span>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-start gap-3">
                                    <div className="w-1 h-10 bg-[#F0A727] rounded-full mt-1" />
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Base de Dados</p>
                                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Escalabilidade Nível 1</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-1 h-10 bg-zinc-800 rounded-full mt-1" />
                                    <div>
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Relatório Mensal</p>
                                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Próximo envio em 2 dias</p>
                                    </div>
                                </div>
                            </div>

                            <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                                Configurações do Sistema
                            </button>
                        </div>

                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 p-8 opacity-20">
                            <ShieldCheck className="w-20 h-20 text-[#F0A727]" />
                        </div>
                    </div>

                    {/* Quick Link Card */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-zinc-100 shadow-sm space-y-6">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Suporte Master</h2>
                        <div className="space-y-3">
                            <div className="p-4 bg-zinc-50 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-zinc-100 transition-all">
                                <div>
                                    <span className="text-[10px] font-black text-[#0C0C0C] uppercase tracking-widest block">Wiki do Sistema</span>
                                    <span className="text-[8px] text-zinc-400 uppercase tracking-widest">Documentação Técnica</span>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-zinc-300 group-hover:text-black transition-colors" />
                            </div>
                            <div className="p-4 bg-zinc-50 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-zinc-100 transition-all">
                                <div>
                                    <span className="text-[10px] font-black text-[#0C0C0C] uppercase tracking-widest block">Abuso e Denúncias</span>
                                    <span className="text-[8px] text-zinc-400 uppercase tracking-widest">Revisão de logs</span>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-zinc-300 group-hover:text-black transition-colors" />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
