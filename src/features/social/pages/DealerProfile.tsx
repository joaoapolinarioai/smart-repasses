import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import {
    MapPin,
    Star,
    ShieldCheck,
    UserPlus,
    Users,
    Car,
    ArrowLeft,
    Verified,
    Info,
    LayoutGrid,
    Loader2,
    Settings
} from 'lucide-react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { VehicleCard } from '../../marketplace/components/VehicleCard'
import { VehicleDetailSheet } from '../../marketplace/components/VehicleDetailSheet'

export function DealerProfilePage() {
    let { username } = useParams()
    // Remover o @ se existir para buscar no banco
    const cleanUsername = username?.startsWith('@') ? username.substring(1) : username

    const { user } = useAuthStore()
    const [activeTab, setActiveTab] = useState<'inventory' | 'rating' | 'about'>('inventory')
    const [isFollowingPending, setIsFollowingPending] = useState(false)
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null)

    // 1. Buscar Perfil do Lojista (por username ou ID)
    const { data: profile, isLoading: isLoadingProfile, refetch: refetchProfile } = useQuery({
        queryKey: ['dealer-profile', cleanUsername],
        queryFn: async () => {
            if (!cleanUsername) throw new Error('Identificador não informado')

            // Tenta buscar por username primeiro
            let { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', cleanUsername)
                .maybeSingle()

            // Se não achou por username e o param se parece com um UUID, tenta por ID
            if (!data && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUsername)) {
                const { data: idData, error: idError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', cleanUsername)
                    .maybeSingle()

                if (idError) throw idError
                data = idData
            }

            if (!data) {
                throw new Error('Perfil não encontrado')
            }

            // Real counts from connections
            const { count: followersCount } = await supabase
                .from('connections')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', data.id)

            const { count: followingCount } = await supabase
                .from('connections')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', data.id)

            const { count: reviewsCount } = await supabase
                .from('reviews')
                .select('*', { count: 'exact', head: true })
                .eq('reviewed_id', data.id)

            return {
                ...data,
                store_name: data.store_name || `${(data.full_name || 'Lojista').split(' ')[0]} Veículos`,
                cover_url: data.cover_url || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=2000',
                location: data.city && data.state ? `${data.city} - ${data.state}` : 'SÃO PAULO - SP',
                rating: data.reputation_score || 5.0,
                reviews_count: reviewsCount || 0,
                followers_count: followersCount || 0,
                following_count: followingCount || 0,
                bio: data.bio || 'Especialista em veículos de repasse e negociações B2B.'
            }
        },
        placeholderData: (previousData) => previousData
    })

    // 1.1 Verificar se já sigo este lojista
    const { data: isFollowing, refetch: refetchFollowing } = useQuery({
        queryKey: ['is-following', profile?.id, user?.id],
        queryFn: async () => {
            if (!user || !profile?.id) return false
            const { data, error } = await supabase
                .from('connections')
                .select('id')
                .eq('follower_id', user.id)
                .eq('following_id', profile.id)
                .maybeSingle()

            if (error) return false
            return !!data
        },
        enabled: !!user && !!profile?.id
    })

    // 1.5 Impedir de seguir a si mesmo (Garantia extra além da UI)
    const handleToggleFollow = async () => {
        if (!user || !profile?.id || isFollowingPending || user.id === profile.id) return
        setIsFollowingPending(true)

        try {
            if (isFollowing) {
                const { error } = await supabase
                    .from('connections')
                    .delete()
                    .eq('follower_id', user.id)
                    .eq('following_id', profile.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('connections')
                    .insert({ follower_id: user.id, following_id: profile.id })
                if (error) throw error
            }
            await Promise.all([refetchFollowing(), refetchProfile()])
        } catch (err: any) {
            console.error('Follow error:', err)
            toast.error('Erro ao seguir lojista. Verifique sua conexão.')
        } finally {
            setIsFollowingPending(false)
        }
    }

    // 2. Buscar Inventário deste Lojista
    const { data: vehicles, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['dealer-inventory', profile?.id],
        queryFn: async () => {
            if (!profile?.id) return []
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('seller_id', profile.id)
                .neq('status', 'sold')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data.map(v => ({
                ...v,
                location: `${profile?.city || 'SÃO PAULO'} - ${profile?.state || 'SP'}`,
                seller: {
                    id: profile.id,
                    username: profile.username,
                    name: profile?.full_name || 'Lojista',
                    avatar: profile?.avatar_url,
                    initial: (profile?.full_name?.[0] || 'L').toUpperCase(),
                    isVip: true
                }
            }))
        },
        enabled: !!profile
    })

    // 3. Buscar Avaliações Reais
    const { data: reviews, isLoading: isLoadingReviews } = useQuery({
        queryKey: ['dealer-reviews', profile?.id],
        queryFn: async () => {
            if (!profile?.id) return []
            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    id,
                    rating,
                    comment,
                    created_at,
                    reviewer:profiles!reviewer_id (
                        full_name,
                        store_name,
                        avatar_url
                    ),
                    deal:deals!deal_id (
                        seller_id,
                        buyer_id,
                        vehicle:vehicles!vehicle_id (
                            make,
                            model,
                            year
                        )
                    )
                `)
                .eq('reviewed_id', profile.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data.map((r: any) => ({
                ...r,
                reviewer: Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer,
                vehicle: r.deal?.vehicle,
                role: r.deal?.seller_id === profile.id ? 'vendedor' : 'comprador'
            }))
        },
        enabled: !!profile
    })

    if (isLoadingProfile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Carregando perfil...</p>
            </div>
        )
    }

    return (
        <div className="min-h-full pb-24 px-4 lg:px-10">
            {/* Header / Cover Space */}
            <div className="h-56 md:h-80 bg-zinc-900 rounded-b-[2.5rem] lg:rounded-b-[4rem] -mx-4 lg:-mx-10 relative mb-20 lg:mb-24 shadow-2xl group/cover transition-all duration-500 isolate">
                <div className="absolute inset-0 bg-zinc-900 overflow-hidden rounded-b-[2.5rem] lg:rounded-b-[4rem]">
                    <img
                        src={profile?.cover_url || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=2000'}
                        className="w-full h-full object-cover opacity-60 transition-transform duration-[2s] group-hover/cover:scale-105"
                        style={{
                            objectPosition: `center ${profile?.cover_position_y || 50}%`,
                            transform: `scale(${(profile?.cover_zoom || 100) / 100})`
                        }}
                        alt="Cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>
                </div>

                <Link
                    to="/network"
                    className="absolute top-6 lg:top-8 left-6 lg:left-8 w-10 h-10 lg:w-12 lg:h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl lg:rounded-2xl flex items-center justify-center text-white hover:bg-white/20 transition-all z-[100] shadow-2xl active:scale-90"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>

                {/* Profile Pic Placement */}
                <div className="absolute -bottom-12 lg:-bottom-16 left-6 lg:left-24 flex flex-col md:flex-row md:items-end gap-6 lg:gap-8 z-[50]">
                    <div className="relative group/avatar">
                        <div className="w-28 h-28 lg:w-44 lg:h-44 bg-zinc-900 rounded-[2rem] lg:rounded-[3rem] border-[6px] lg:border-[12px] border-[#FAFAFA] overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all group-hover/avatar:scale-105 group-hover/avatar:shadow-2xl duration-500">
                            {profile?.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        if (target.parentElement) {
                                            target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-4xl lg:text-6xl font-black text-primary bg-zinc-900">${(profile?.full_name?.[0] || 'L').toUpperCase()}</div>`;
                                        }
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl lg:text-6xl font-black text-primary bg-zinc-900">
                                    {(profile?.full_name?.[0] || 'L').toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 lg:-bottom-2 lg:-right-2 w-10 h-10 lg:w-14 lg:h-14 bg-primary rounded-xl lg:rounded-[1.5rem] flex items-center justify-center border-4 lg:border-6 border-[#FAFAFA] text-white shadow-xl animate-bounce-subtle z-10">
                            <Verified className="w-6 h-6 lg:w-8 lg:h-8" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-12 mt-10">
                {/* Info Sidebar */}
                <div className="w-full lg:w-96 space-y-8">
                    <div className="space-y-4">
                        <div>
                            <h1 className="text-4xl font-[900] text-zinc-800 uppercase tracking-tighter mb-1">{profile?.store_name}</h1>
                            <div className="flex items-center gap-2 text-zinc-400">
                                <span className="text-[10px] font-bold uppercase tracking-widest italic opacity-70">Responsável: {profile?.full_name}</span>
                            </div>
                        </div>
                        <p className="text-zinc-500 text-sm leading-relaxed italic">"{profile?.bio}"</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-3xl border-2 border-zinc-50 shadow-sm text-center">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Seguidores</p>
                            <p className="text-2xl font-black text-zinc-800">{profile?.followers_count}</p>
                        </div>
                        <div className="bg-white p-5 rounded-3xl border-2 border-zinc-50 shadow-sm text-center">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Seguindo</p>
                            <p className="text-2xl font-black text-zinc-800">{profile?.following_count}</p>
                        </div>
                        <div className="bg-white p-5 rounded-3xl border-2 border-zinc-50 shadow-sm text-center">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Repasses</p>
                            <p className="text-2xl font-black text-zinc-800">{vehicles?.length || 0}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {user?.id === profile?.id ? (
                            <Link
                                to="/settings"
                                className="w-full py-5 bg-zinc-100 text-zinc-800 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-sm active:scale-95"
                            >
                                <Settings className="w-4 h-4" />
                                Editar Meu Perfil
                            </Link>
                        ) : (
                            <button
                                onClick={handleToggleFollow}
                                disabled={isFollowingPending}
                                className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-zinc-900/20 active:scale-95 group ${isFollowing ? 'bg-zinc-100 text-zinc-800' : 'bg-[#0C0C0C] text-primary hover:bg-black'} ${isFollowingPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isFollowingPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                ) : (
                                    <>
                                        {isFollowing ? <Users className="w-4 h-4" /> : <UserPlus className="w-4 h-4 transition-transform group-hover:scale-120" />}
                                        {isFollowing ? 'Seguindo' : 'Seguir Lojista'}
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="p-6 bg-zinc-50 rounded-[2.5rem] space-y-4">
                        <div className="flex items-center gap-3 text-zinc-400">
                            <MapPin className="w-4 h-4" />
                            <span className="text-xs font-black uppercase tracking-tighter text-zinc-600">{profile?.location}</span>
                        </div>
                        <div className="flex items-center gap-3 text-zinc-400">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            <span className="text-xs font-black uppercase tracking-tighter text-zinc-600">Lojista Verificado</span>
                        </div>
                    </div>
                </div>

                {/* Main Content (Tabs) */}
                <div className="flex-1 space-y-8 lg:space-y-10">
                    <div className="flex items-center gap-6 lg:gap-8 border-b border-zinc-100 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
                        {[
                            { id: 'inventory', label: 'Estoque', icon: LayoutGrid },
                            { id: 'rating', label: 'Avaliações', icon: Star },
                            { id: 'about', label: 'Sobre', icon: Info },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "flex items-center gap-2 lg:gap-3 pb-5 lg:pb-6 text-[9px] lg:text-[10px] font-[950] uppercase tracking-widest transition-all relative whitespace-nowrap",
                                    activeTab === tab.id ? "text-zinc-800" : "text-zinc-400 hover:text-zinc-600"
                                )}
                            >
                                <tab.icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                {tab.label}
                                {activeTab === tab.id && (
                                    <motion.div layoutId="activeTabProfile" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'inventory' && (
                        <div className="space-y-8">
                            {isLoadingVehicles ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[1, 2].map(i => (
                                        <div key={i} className="aspect-[16/10] bg-zinc-100 rounded-[3rem] animate-pulse" />
                                    ))}
                                </div>
                            ) : vehicles && vehicles.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {vehicles.map(v => (
                                        <VehicleCard
                                            key={v.id}
                                            vehicle={v}
                                            onOpenDetails={(v) => setSelectedVehicle(v)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-[3rem] border-3 border-zinc-50 p-20 text-center space-y-6">
                                    <Car className="w-12 h-12 text-zinc-200 mx-auto" />
                                    <p className="text-sm font-medium text-zinc-400">Este lojista não possui veículos ativos no momento.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'rating' && (
                        <div className="space-y-10">
                            {/* Summary Header */}
                            <div className="flex flex-col md:flex-row items-center gap-8 bg-white p-8 rounded-[3rem] border-2 border-zinc-50 shadow-sm">
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-5xl font-black text-zinc-800 tracking-tighter">
                                        {profile?.reputation_score?.toFixed(1) || '5.0'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star key={s} className={cn("w-4 h-4", (profile?.reputation_score || 5) >= s ? "text-primary fill-primary" : "text-zinc-200")} />
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                                        {reviews?.length || 0} Avaliações
                                    </span>
                                </div>
                                <div className="h-20 w-px bg-zinc-100 hidden md:block" />
                                <div className="flex-1 space-y-2 text-center md:text-left">
                                    <h3 className="text-xl font-black text-zinc-800 uppercase tracking-tighter">Transparência na Rede</h3>
                                    <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                                        Este lojista é avaliado por outros parceiros após cada negócio concluído.
                                        A média é baseada na qualidade do repasse e postura nas negociações.
                                    </p>
                                </div>
                            </div>

                            {isLoadingReviews ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Buscando avaliações...</p>
                                </div>
                            ) : reviews && reviews.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {reviews.map((r: any) => (
                                        <div key={r.id} className="group bg-white p-6 rounded-[2.5rem] border-2 border-zinc-50 shadow-sm hover:shadow-xl hover:border-primary/10 transition-all duration-500 relative flex flex-col">
                                            {/* Role Badge */}
                                            <div className="absolute top-6 right-6 flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                                                    r.role === 'vendedor'
                                                        ? "bg-zinc-100 text-zinc-500"
                                                        : "bg-emerald-50 text-emerald-600"
                                                )}>
                                                    {r.role === 'vendedor' ? 'Vendedor' : 'Comprador'}
                                                </span>
                                            </div>

                                            {/* Header */}
                                            <div className="flex items-start gap-4 mb-6">
                                                <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center text-primary text-xl font-black overflow-hidden border-4 border-zinc-50 shadow-lg group-hover:scale-110 transition-transform">
                                                    {r.reviewer?.avatar_url ? (
                                                        <img src={r.reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        (r.reviewer?.full_name?.[0] || 'L').toUpperCase()
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-black text-zinc-800 uppercase tracking-tight leading-none pt-1">
                                                        {r.reviewer?.store_name || r.reviewer?.full_name}
                                                    </p>
                                                    <div className="flex items-center gap-1">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star
                                                                key={star}
                                                                className={cn(
                                                                    "w-3.5 h-3.5",
                                                                    r.rating >= star ? "text-primary fill-primary" : "text-zinc-100 fill-zinc-100"
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest pt-1">
                                                        {format(new Date(r.created_at), "dd 'de' MMMM", { locale: ptBR })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Vehicle Info */}
                                            {r.vehicle && (
                                                <div className="mb-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100/50 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Car className="w-4 h-4 text-zinc-400" />
                                                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-tight">
                                                            {r.vehicle.make} {r.vehicle.model}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-zinc-400 italic">#{r.vehicle.year}</span>
                                                </div>
                                            )}

                                            {/* Comment */}
                                            {r.comment && (
                                                <div className="relative pl-6 flex-1">
                                                    <div className="absolute left-0 top-0 text-primary opacity-20 text-3xl font-serif">“</div>
                                                    <p className="text-zinc-500 text-sm leading-relaxed font-medium italic pt-1">
                                                        {r.comment}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-[4rem] border-3 border-zinc-50 p-24 text-center space-y-6">
                                    <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Star className="w-10 h-10 text-zinc-200" />
                                    </div>
                                    <h3 className="text-2xl font-black text-zinc-800 uppercase tracking-tighter">Sem avaliações ainda</h3>
                                    <p className="text-sm font-medium text-zinc-400 max-w-sm mx-auto leading-relaxed">
                                        Este lojista ainda está construindo sua reputação na rede. Seja um dos primeiros a negociar com ele!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="bg-white rounded-[3rem] border-3 border-zinc-50 p-16 space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tight">Sobre a {profile?.store_name}</h3>
                                <p className="text-zinc-500 leading-relaxed font-medium">
                                    {profile?.bio}
                                </p>
                            </div>
                            <div className="pt-8 border-t border-zinc-50 grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Localização</p>
                                    <p className="text-xs font-bold text-zinc-800">{profile?.city} - {profile?.state}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Membro desde</p>
                                    <p className="text-xs font-bold text-zinc-800">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-br', { month: 'long', year: 'numeric' }) : '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Other modals, etc. */}

            <VehicleDetailSheet
                vehicle={selectedVehicle}
                isOpen={!!selectedVehicle}
                onClose={() => setSelectedVehicle(null)}
            />
        </div>
    )
}
