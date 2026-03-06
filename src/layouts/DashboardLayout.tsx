import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import {
    LayoutDashboard,
    Car,
    MessageSquare,
    Users,
    LogOut,
    Search,
    Bell,
    Star,
    User as UserIcon,
    Settings,
    X,
    Maximize2,
    Minimize2,
    ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { AnimatePresence, motion } from 'framer-motion'

import { useFilterStore } from '@/store/useFilterStore'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ReviewModal } from '@/features/social/components/ReviewModal'
import { toast } from 'sonner'
import { BottomNav } from '@/components/BottomNav'



const navigation = [
    { name: 'Feed de Ofertas', href: '/', icon: LayoutDashboard },
    { name: 'Meu Inventário', href: '/inventory', icon: Car },
    { name: 'Conversas', href: '/chat', icon: MessageSquare },
    { name: 'Rede de Lojistas', href: '/network', icon: Users },
]

export function DashboardLayout() {
    const location = useLocation()
    const navigate = useNavigate()
    const { profile, signOut } = useAuthStore()
    const { searchTerm, setSearchTerm } = useFilterStore()
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [isSearchVisible, setIsSearchVisible] = useState(false)

    const [reviewContext, setReviewContext] = useState<{
        isOpen: boolean;
        dealId: string;
        reviewedId: string;
        reviewedName: string;
    }>({
        isOpen: false,
        dealId: '',
        reviewedId: '',
        reviewedName: ''
    })
    const dropdownRef = useRef<HTMLDivElement>(null)
    const notificationsRef = useRef<HTMLDivElement>(null)
    const queryClient = useQueryClient()
    const { user } = useAuthStore()
    const currentUserId = user?.id

    // Real-time unread count
    const { data: totalUnread = 0 } = useQuery({
        queryKey: ['unread-messages-count', currentUserId],
        queryFn: async () => {
            if (!currentUserId) return 0
            const { data: participations } = await supabase
                .from('chat_participants')
                .select('room_id, last_read_at')
                .eq('profile_id', currentUserId)

            if (!participations || participations.length === 0) return 0
            let count = 0
            for (const p of participations) {
                const { count: unreadInRoom } = await supabase
                    .from('chat_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('room_id', p.room_id)
                    .neq('sender_id', currentUserId)
                    .gt('created_at', p.last_read_at || '1970-01-01T00:00:00Z')
                count += unreadInRoom || 0
            }
            return count
        },
        enabled: !!currentUserId
    })

    // Realtime subscription for global unread count
    useEffect(() => {
        if (!currentUserId) return
        const channel = supabase.channel('global-unread-updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
                queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] })
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_participants', filter: `profile_id=eq.${currentUserId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] })
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [currentUserId, queryClient])

    // Real Notifications
    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications', currentUserId],
        queryFn: async () => {
            if (!currentUserId) return []
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('profile_id', currentUserId)
                .order('created_at', { ascending: false })
                .limit(10)
            if (error) throw error
            return data
        },
        enabled: !!currentUserId
    })

    const unreadNotificationsCount = notifications.filter(n => !n.is_read).length

    const markNotificationsAsReadMutation = useMutation({
        mutationFn: async () => {
            if (!currentUserId) return
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('profile_id', currentUserId)
                .eq('is_read', false)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
    })

    // Real-time notifications
    useEffect(() => {
        if (!currentUserId) return
        const channel = supabase.channel('notifications-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `profile_id=eq.${currentUserId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['notifications'] })
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [currentUserId, queryClient])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false)
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false)
            }
        }
        if (isProfileOpen || isNotificationsOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => { document.removeEventListener('mousedown', handleClickOutside) }
    }, [isProfileOpen, isNotificationsOpen])

    const handleSearchChange = (val: string) => {
        setSearchTerm(val)
        if (location.pathname !== '/') {
            navigate('/')
        }
    }

    return (
        <div className="flex bg-[#FAFAFA] font-sans selection:bg-orange-100 selection:text-orange-900 overflow-hidden h-screen">
            {/* Sidebar - Dynamically Collapsible for Desktop */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col bg-white border-r border-zinc-100 relative z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-500 ease-in-out",
                    isSidebarCollapsed ? "w-24" : "w-72"
                )}
            >
                <div className={cn("p-10 flex items-center transition-all", isSidebarCollapsed ? "justify-center px-4" : "justify-between")}>
                    {!isSidebarCollapsed && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <img src="/assets/Logo-SR.svg" alt="Smart Repasses" className="h-10 w-auto" />
                        </motion.div>
                    )}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="p-2 hover:bg-zinc-50 rounded-xl text-zinc-400 transition-colors"
                    >
                        {isSidebarCollapsed ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                    </button>
                </div>

                <div className="px-6 py-4 flex-1 overflow-y-auto custom-scrollbar">
                    {!isSidebarCollapsed && (
                        <p className="px-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em] mb-6 opacity-60">Plataforma</p>
                    )}
                    <nav className="space-y-2">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={cn(
                                        "flex items-center gap-4 py-4 rounded-[1.25rem] transition-all duration-300 relative group",
                                        isSidebarCollapsed ? "justify-center px-0" : "px-5",
                                        isActive
                                            ? "gradient-dark text-white shadow-xl shadow-zinc-200 translate-x-1"
                                            : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 hover:translate-x-1"
                                    )}
                                >
                                    <item.icon className={cn("w-5 h-5 transition-colors duration-300", isActive ? "text-primary" : "text-zinc-400 group-hover:text-zinc-800")} />
                                    {!isSidebarCollapsed && (
                                        <span className="text-[13px] font-[900] uppercase tracking-tight">{item.name}</span>
                                    )}

                                    {item.href === '/chat' && totalUnread > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className={cn(
                                                "bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-primary/20 animate-bounce-subtle",
                                                isSidebarCollapsed ? "absolute -top-1 -right-1 w-4 h-4" : "ml-auto w-5 h-5"
                                            )}
                                        >
                                            {totalUnread}
                                        </motion.span>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {!isSidebarCollapsed && (
                    <div className="p-6 space-y-6">
                        <div className="bg-zinc-50/50 rounded-[2rem] p-6 border-2 border-white shadow-sm relative overflow-hidden group tech-card">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 transition-all group-hover:bg-primary/10"></div>
                            <div className="flex items-center gap-2.5 mb-3 relative z-10">
                                <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(240,167,39,0.5)]" />
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Concierge Online</p>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed mb-5 relative z-10">Suporte especializado para fechamento de repasses.</p>
                            <button className="w-full py-3.5 bg-white border-2 border-zinc-100 rounded-2xl text-[10px] font-black text-zinc-500 hover:bg-zinc-50 hover:border-zinc-200 transition-all shadow-sm active:scale-95 relative z-10 uppercase tracking-widest">
                                ABRIR CHAMADO
                            </button>
                        </div>
                        <p className="text-center text-[9px] font-black text-zinc-300 uppercase tracking-[0.3em]">Smart Repasses v2.0</p>
                    </div>
                )}
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Topbar - Ultra-Responsive & Premium */}
                <header className="h-20 lg:h-24 bg-white/80 backdrop-blur-xl border-b border-zinc-100 flex items-center justify-between px-4 lg:px-12 sticky top-0 z-40 transition-all">
                    <div className="flex items-center gap-4 lg:hidden">
                        <img src="/assets/Logo-SR.svg" alt="Logo" className="h-8 w-auto" />
                    </div>

                    <div className={cn(
                        "flex-1 max-w-2xl hidden lg:block",
                        isSearchVisible ? "fixed inset-x-0 top-0 h-20 bg-white z-50 flex items-center px-4" : ""
                    )}>
                        <div className="relative group w-full">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 group-focus-within:text-primary transition-all duration-300" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Procurar marca, modelo ou lojista..."
                                className="w-full pl-14 pr-14 py-3.5 lg:py-4 bg-[#FAFAFA] border-2 border-transparent rounded-[1.5rem] text-sm font-bold placeholder:text-zinc-300 focus:bg-white focus:border-primary/20 shadow-inner transition-all outline-none"
                            />
                            {isSearchVisible && (
                                <button onClick={() => setIsSearchVisible(false)} className="absolute right-4 p-2">
                                    <X className="w-5 h-5 text-zinc-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-8">
                        <button
                            onClick={() => navigate('/')}
                            className="p-3 text-zinc-400 hover:text-primary lg:hidden"
                        >
                            <Search className="w-6 h-6" />
                        </button>

                        <div className="flex items-center gap-1 lg:gap-1.5">
                            <div className="relative" ref={notificationsRef}>
                                <button
                                    onClick={() => {
                                        const newState = !isNotificationsOpen
                                        setIsNotificationsOpen(newState)
                                        if (newState && unreadNotificationsCount > 0) {
                                            markNotificationsAsReadMutation.mutate()
                                        }
                                    }}
                                    className={cn(
                                        "p-2.5 lg:p-3 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50 rounded-[1.25rem] transition-all relative group",
                                        isNotificationsOpen && "bg-zinc-100 text-zinc-800"
                                    )}
                                >
                                    <Bell className="w-5.5 h-5.5 transition-transform group-hover:rotate-12" />
                                    {unreadNotificationsCount > 0 && (
                                        <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                                    )}
                                </button>

                                <AnimatePresence>
                                    {isNotificationsOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 lg:-right-4 mt-3 w-[290px] sm:w-[360px] bg-white rounded-[2rem] border border-zinc-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] p-5 z-50 overflow-hidden"
                                        >
                                            <div className="flex items-center justify-between mb-5">
                                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Notificações</h3>
                                                {unreadNotificationsCount > 0 && (
                                                    <span className="text-[8px] font-black text-primary px-2 py-0.5 bg-primary/5 rounded-full border border-primary/10">{unreadNotificationsCount} NOVAS</span>
                                                )}
                                            </div>

                                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                                                {notifications.length === 0 ? (
                                                    <div className="text-center py-8">
                                                        <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">Nenhuma atualização no momento</p>
                                                    </div>
                                                ) : notifications.map((notif) => (
                                                    <div
                                                        key={notif.id}
                                                        onClick={async () => {
                                                            setIsNotificationsOpen(false);
                                                            if (notif.type === 'review_pending' && notif.link) {
                                                                const dealId = notif.link.split('/').pop();
                                                                if (dealId) {
                                                                    const { data: existingReview } = await supabase.from('reviews').select('id').eq('deal_id', dealId).eq('reviewer_id', currentUserId).single();
                                                                    if (existingReview) { toast.info('Você já enviou sua avaliação. Obrigado!'); return; }
                                                                    const { data: deal } = await supabase.from('deals').select('id, seller_id, buyer_id, seller:profiles!seller_id(full_name, store_name), buyer:profiles!buyer_id(full_name, store_name)').eq('id', dealId).single();
                                                                    if (deal) {
                                                                        const isBuyer = deal.buyer_id === currentUserId;
                                                                        const seller = Array.isArray(deal.seller) ? deal.seller[0] : deal.seller;
                                                                        const buyer = Array.isArray(deal.buyer) ? deal.buyer[0] : deal.buyer;
                                                                        setReviewContext({ isOpen: true, dealId: deal.id, reviewedId: isBuyer ? deal.seller_id : deal.buyer_id, reviewedName: isBuyer ? (seller?.store_name || seller?.full_name) : (buyer?.store_name || buyer?.full_name) });
                                                                    }
                                                                }
                                                            } else if (notif.type === 'reservation' && notif.link) { navigate(notif.link); }
                                                        }}
                                                        className={cn(
                                                            "p-4 rounded-2xl transition-all cursor-pointer group/notif relative border border-transparent",
                                                            notif.is_read ? "opacity-60 grayscale-[30%] hover:bg-zinc-50" : "bg-primary/5 ring-1 ring-primary/10"
                                                        )}
                                                    >
                                                        <div className="flex justify-between items-start mb-0.5">
                                                            <p className="text-[10px] font-black text-zinc-800 uppercase tracking-tight">{notif.title}</p>
                                                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter shrink-0 ml-2">{format(new Date(notif.created_at), 'HH:mm')}</span>
                                                        </div>
                                                        <p className="text-[10px] text-zinc-500 font-medium leading-[1.4]">{notif.message}</p>
                                                        {!notif.is_read && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-full" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <Link to="/favorites" className="p-2.5 lg:p-3 lg:px-4 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50 rounded-[1.25rem] transition-all flex items-center gap-3">
                                <Star className="w-5.5 h-5.5 lg:w-5 lg:h-5" />
                                <span className="text-[10px] font-[900] uppercase tracking-widest hidden xl:block">Favoritos</span>
                            </Link>
                        </div>

                        <div className="h-8 lg:h-10 w-px bg-zinc-100 mx-1 lg:mx-2"></div>

                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className={cn("flex items-center gap-3 lg:gap-4 p-1 lg:p-2 lg:pl-4 rounded-[1.5rem] transition-all duration-300 group", isProfileOpen ? "bg-zinc-100" : "hover:bg-zinc-50")}
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] lg:text-xs font-black text-zinc-800 uppercase tracking-tighter leading-none mb-1 max-w-[120px] truncate">{profile?.store_name || 'LOJA'}</p>
                                    <div className="flex items-center justify-end gap-1.5">
                                        <span className="text-[8px] lg:text-[9px] font-black text-primary px-1 lg:px-1.5 py-0.5 bg-primary/10 rounded-md uppercase">PRO</span>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="w-9 h-9 lg:w-12 lg:h-12 bg-zinc-900 rounded-xl lg:rounded-2xl flex items-center justify-center border-2 border-white shadow-xl overflow-hidden ring-4 ring-primary/5 transition-transform duration-300 group-hover:scale-105">
                                        {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />}
                                    </div>
                                </div>
                            </button>

                            <AnimatePresence>
                                {isProfileOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-3 w-64 bg-white rounded-[2rem] border-2 border-zinc-50 shadow-2xl p-4 z-50 overflow-hidden"
                                    >
                                        <div className="space-y-1">
                                            <Link to={profile?.username ? `/@${profile.username}` : (profile?.id ? `/@${profile.id}` : '#')} className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800 rounded-2xl transition-all" onClick={() => setIsProfileOpen(false)}>
                                                <UserIcon className="w-5 h-5 text-zinc-400" /> Ver meu Perfil
                                            </Link>
                                            <Link to="/settings" className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800 rounded-2xl transition-all" onClick={() => setIsProfileOpen(false)}>
                                                <Settings className="w-5 h-5 text-zinc-400" /> Configurações
                                            </Link>

                                            {profile && ['master', 'admin', 'mediator'].includes(profile.role) && (
                                                <Link to="/admin" className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-bold text-primary hover:bg-orange-50 rounded-2xl transition-all" onClick={() => setIsProfileOpen(false)}>
                                                    <ShieldCheck className="w-5 h-5" /> Painel Admin
                                                </Link>
                                            )}

                                            <div className="h-px bg-zinc-50 my-1 mx-2" />
                                            <button onClick={signOut} className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                                                <LogOut className="w-5 h-5" /> Sair da Rede
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                {/* Content Area - Adjusted for Bottom Nav on Mobile */}
                <main className="flex-1 overflow-y-auto bg-[#FAFAFA] pb-24 lg:pb-0 scroll-smooth">
                    <div className="max-w-[1600px] mx-auto min-h-full">
                        <Outlet />
                    </div>
                </main>

                {/* Mobile Navigation */}
                <BottomNav />
            </div>

            <ReviewModal
                isOpen={reviewContext.isOpen}
                onClose={() => setReviewContext(prev => ({ ...prev, isOpen: false }))}
                dealId={reviewContext.dealId}
                reviewedId={reviewContext.reviewedId}
                reviewedName={reviewContext.reviewedName}
                onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['profiles'] }); }}
            />
        </div>
    )
}
