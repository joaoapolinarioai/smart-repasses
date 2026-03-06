import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
    Search, Loader2, Ban,
    Filter, Download, ArrowUpDown, Store, User,
    Shield, BadgeCheck, AlertTriangle, Trash2,
    X, Edit3, Phone, MapPin, Info, Save, Mail
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Profile } from '@/store/useAuthStore'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"

export function UserManagement() {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [editingUser, setEditingUser] = useState<Profile | null>(null)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const queryClient = useQueryClient()

    // 1. Fetch Users
    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users', searchTerm, statusFilter],
        queryFn: async () => {
            let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })

            if (searchTerm) {
                query = query.or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,store_name.ilike.%${searchTerm}%`)
            }

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            }

            const { data, error } = await query
            if (error) throw error
            return data as Profile[]
        }
    })

    // 2. Mutations
    const updateProfileMutation = useMutation({
        mutationFn: async (updatedData: Partial<Profile> & { id: string }) => {
            const { id, ...rest } = updatedData
            const { error } = await supabase.from('profiles').update(rest).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] })
            toast.success('Perfil atualizado com sucesso!')
            setEditingUser(null)
        },
        onError: (err: any) => {
            toast.error('Erro ao atualizar: ' + err.message)
        }
    })

    const deleteUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase.from('profiles').delete().eq('id', userId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] })
            toast.success('Usuário removido da rede.')
            setIsDeleting(null)
        },
        onError: (err: any) => {
            toast.error('Erro ao excluir: ' + err.message)
        }
    })

    const exportToCSV = () => {
        if (!users || users.length === 0) return toast.error('Nenhum dado para exportar')

        const headers = ['ID', 'Nome', 'Username', 'Loja', 'Email', 'Role', 'Status', 'Criado Em']
        const rows = users.map(u => [
            u.id, u.full_name, u.username, u.store_name, u.email, u.role, u.status, u.created_at
        ])

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `usuarios_smart_repasses_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Relatório CSV gerado!')
    }

    return (
        <div className="min-h-screen bg-[#F8F9FA] p-8 lg:p-12 space-y-12 max-w-[1600px] mx-auto overflow-y-auto">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-[#F0A727]">
                            <User className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Gestão de Ecossistema</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black text-[#0C0C0C] uppercase tracking-tighter leading-none">
                        Diretório de Lojistas
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={exportToCSV}
                        className="px-6 py-3 h-12 bg-white border border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <Download className="w-3.5 h-3.5" /> Exportar CSV
                    </button>
                    <div className="flex bg-white border border-zinc-200 rounded-2xl p-1 shadow-sm overflow-x-auto max-w-full">
                        {['all', 'active', 'pending_approval', 'suspended'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setStatusFilter(filter)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                    statusFilter === filter
                                        ? "bg-[#0C0C0C] text-white shadow-lg"
                                        : "text-zinc-400 hover:text-zinc-600"
                                )}
                            >
                                {filter === 'all' ? 'Todos' :
                                    filter === 'active' ? 'Ativos' :
                                        filter === 'pending_approval' ? 'Pendentes' : 'Suspensos'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filter Hub */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row gap-6">
                <div className="flex-1 relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-[#F0A727] transition-colors" />
                    <input
                        type="text"
                        placeholder="BUSCAR POR NOME, USERNAME, EMAIL OU LOJA..."
                        className="w-full pl-14 pr-6 py-5 bg-zinc-50 border border-transparent rounded-[1.5rem] text-[11px] font-bold tracking-widest text-[#0C0C0C] focus:bg-white focus:border-[#F0A727]/30 outline-none transition-all shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="px-8 py-5 h-full bg-zinc-50 border-2 border-transparent rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-100 transition-all flex items-center gap-3">
                    <Filter className="w-4 h-4" /> Filtros Avançados
                </button>
            </div>

            {/* Directory Table */}
            <div className="bg-white rounded-[3.5rem] border border-zinc-100 shadow-premium overflow-hidden">
                <div className="overflow-x-auto px-1">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-zinc-50/50">
                                <th className="px-10 py-10 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100">Lojista & Unidade</th>
                                <th className="px-10 py-10 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100">Nível / Cargo</th>
                                <th className="px-10 py-10 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100">Status Operacional</th>
                                <th className="px-10 py-10 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100">Ingresso</th>
                                <th className="px-10 py-10 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-200" />
                                    </td>
                                </tr>
                            ) : users?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-32 text-center space-y-4">
                                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
                                            <AlertTriangle className="w-8 h-8 text-zinc-200" />
                                        </div>
                                        <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Nenhum lojista correspondente foi encontrado.</p>
                                    </td>
                                </tr>
                            ) : (
                                users?.map((user) => (
                                    <tr key={user.id} className="hover:bg-zinc-50/30 transition-all group cursor-default">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 bg-zinc-100 rounded-[1.5rem] overflow-hidden border-2 border-white shadow-sm flex-shrink-0 relative group-hover:scale-105 transition-transform duration-500">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-[#F8F9FA] text-zinc-300 font-black text-xs uppercase">
                                                            {user.full_name?.substring(0, 2)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-[#0C0C0C] uppercase tracking-tighter leading-none group-hover:text-[#F0A727] transition-colors line-clamp-1">
                                                            {user.full_name}
                                                        </span>
                                                        {user.role === 'master' && <Shield className="w-3.5 h-3.5 text-[#F0A727]" />}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                                            <Store className="w-3 h-3" /> {user.store_name || '@' + user.username}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-zinc-300 tracking-wider lowercase">
                                                            {user.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="relative inline-block">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => updateProfileMutation.mutate({ id: user.id, role: e.target.value as any })}
                                                    className="appearance-none bg-zinc-50 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#0C0C0C] border border-zinc-100 outline-none focus:border-[#F0A727]/30 transition-all cursor-pointer pr-10"
                                                >
                                                    <option value="dealer">DEALER</option>
                                                    <option value="mediator">MEDIADOR</option>
                                                    <option value="admin">ADMIN</option>
                                                    <option value="master">MASTER</option>
                                                </select>
                                                <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className={cn(
                                                "px-4 py-2 rounded-xl text-[9px] font-black tracking-[0.15em] uppercase inline-flex items-center gap-2 border-2",
                                                user.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                    user.status === 'suspended' ? "bg-red-50 text-red-600 border-red-100" :
                                                        "bg-amber-50 text-amber-600 border-amber-100"
                                            )}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full",
                                                    user.status === 'active' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                                        user.status === 'suspended' ? "bg-red-500" : "bg-amber-500 animate-pulse"
                                                )} />
                                                {user.status === 'pending_approval' ? 'PENDENTE' :
                                                    user.status === 'active' ? 'ATIVO' :
                                                        user.status === 'suspended' ? 'SUSPENSO' : user.status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                                {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="w-10 h-10 bg-white border border-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 hover:text-blue-500 hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                                                    title="Editar Detalhes"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>

                                                {user.status === 'active' ? (
                                                    <button
                                                        onClick={() => updateProfileMutation.mutate({ id: user.id, status: 'suspended' })}
                                                        className="w-10 h-10 bg-white border border-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 hover:text-amber-500 hover:bg-amber-50 transition-all shadow-sm active:scale-95"
                                                        title="Suspender acesso"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => updateProfileMutation.mutate({ id: user.id, status: 'active' })}
                                                        className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-[#F0A727] shadow-xl active:scale-95"
                                                        title="Ativar acesso"
                                                    >
                                                        <BadgeCheck className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => setIsDeleting(user.id)}
                                                    className="w-10 h-10 bg-white border border-zinc-100 rounded-xl flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm active:scale-95"
                                                    title="Excluir Usuário"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Editing Sheet (Drawer) */}
            <Sheet open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                <SheetContent side="right" className="w-full sm:max-w-xl p-0 bg-white border-l border-zinc-100 overflow-y-auto">
                    {editingUser && (
                        <div className="h-full flex flex-col">
                            <div className="p-8 border-b border-zinc-50 bg-zinc-50/30">
                                <SheetHeader className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="w-14 h-14 bg-[#F0A727] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                                            <Edit3 className="text-black w-7 h-7" />
                                        </div>
                                        <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-zinc-100 rounded-xl transition-all">
                                            <X className="w-5 h-5 text-zinc-400" />
                                        </button>
                                    </div>
                                    <div>
                                        <SheetTitle className="text-3xl font-black uppercase tracking-tighter text-zinc-900 leading-none">
                                            Editar Lojista
                                        </SheetTitle>
                                        <SheetDescription className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">
                                            Controle total sobre o perfil de {editingUser.full_name}
                                        </SheetDescription>
                                    </div>
                                </SheetHeader>
                            </div>

                            <div className="p-8 space-y-10 flex-1">
                                {/* Form Sections */}
                                <div className="space-y-6">
                                    <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Info className="w-3 h-3 text-[#F0A727]" /> Dados Básicos
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome Completo</label>
                                            <input
                                                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-5 py-4 text-xs font-bold outline-none focus:border-[#F0A727]/30 transition-all"
                                                defaultValue={editingUser.full_name}
                                                onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome da Loja</label>
                                            <input
                                                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-5 py-4 text-xs font-bold outline-none focus:border-[#F0A727]/30 transition-all"
                                                defaultValue={editingUser.store_name}
                                                onChange={(e) => setEditingUser({ ...editingUser, store_name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">E-mail Corporativo</label>
                                        <div className="relative">
                                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                            <input
                                                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl pl-14 pr-5 py-4 text-xs font-bold text-zinc-400 cursor-not-allowed outline-none"
                                                value={editingUser.email}
                                                disabled
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Phone className="w-3 h-3 text-[#F0A727]" /> Contato & Localização
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">WhatsApp</label>
                                            <input
                                                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-5 py-4 text-xs font-bold outline-none focus:border-[#F0A727]/30 transition-all"
                                                defaultValue={editingUser.phone}
                                                onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cidade/UF</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                                <input
                                                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl pl-14 pr-5 py-4 text-xs font-bold outline-none focus:border-[#F0A727]/30 transition-all"
                                                    defaultValue={`${editingUser.city || ''} - ${editingUser.state || ''}`}
                                                    onChange={(e) => {
                                                        const [city, state] = e.target.value.split(' - ')
                                                        setEditingUser({ ...editingUser, city, state })
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Shield className="w-3 h-3 text-[#F0A727]" /> Nível de Segurança
                                    </h3>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cargo Administrativo</label>
                                        <select
                                            className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-5 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#F0A727]/30 transition-all cursor-pointer"
                                            value={editingUser.role}
                                            onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                                        >
                                            <option value="dealer">Lojista (Dealer)</option>
                                            <option value="mediator">Mediador</option>
                                            <option value="admin">Administrador</option>
                                            <option value="master">Proprietário Master</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-zinc-50 bg-zinc-50/30 flex items-center gap-4">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 px-8 py-5 border border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-white hover:text-zinc-600 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => updateProfileMutation.mutate(editingUser)}
                                    disabled={updateProfileMutation.isPending}
                                    className="flex-[2] px-8 py-5 bg-[#0C0C0C] text-[#F0A727] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-900 transition-all flex items-center justify-center gap-3 shadow-xl shadow-black/10"
                                >
                                    {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {isDeleting && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
                        <div
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsDeleting(null)}
                        />
                        <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 relative z-10 shadow-3xl text-center space-y-8 animate-in zoom-in-95 duration-200">
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto text-red-500">
                                <Trash2 className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-900 leading-tight">Remover Usuário?</h2>
                                <p className="text-sm font-bold text-zinc-400">Esta ação é irreversível e removerá permanentemente o acesso deste lojista à rede Smart Repasses.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setIsDeleting(null)}
                                    className="px-6 py-5 border border-zinc-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 transition-all"
                                >
                                    Manter
                                </button>
                                <button
                                    onClick={() => deleteUserMutation.mutate(isDeleting)}
                                    className="px-6 py-5 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
                                >
                                    Sim, Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

function AnimatePresence({ children }: { children: React.ReactNode }) {
    // Basic wrapper to avoid framer-motion import issues if it's acting up
    return <>{children}</>
}
