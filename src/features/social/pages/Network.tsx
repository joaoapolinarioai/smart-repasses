import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
    Users,
    Search,
    UserPlus,
    ShieldCheck,
    MapPin,
    Star,
    MessageSquare,
    ArrowUpRight,
    Loader2,
    Verified
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/lib/utils'

interface Dealer {
    id: string
    username?: string
    full_name: string
    avatar_url: string
    store_name?: string
    location?: string
    rating: number
    deals_count: number
    verified: boolean
    is_following: boolean
}

export function NetworkPage() {
    const { user } = useAuthStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'all' | 'following' | 'nearby'>('all')

    const { data: dealers, isLoading, refetch } = useQuery({
        queryKey: ['network-dealers', activeTab, searchTerm, user?.id],
        queryFn: async () => {
            // 1. Buscar Perfis com estatísticas reais
            let query = supabase
                .from('profiles')
                .select(`
                    id, 
                    username, 
                    full_name, 
                    avatar_url, 
                    city, 
                    state, 
                    store_name,
                    reputation_score,
                    vehicles:vehicles!seller_id(count)
                `)
                .order('full_name')

            if (searchTerm) {
                query = query.or(`full_name.ilike.%${searchTerm}%,store_name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
            }

            if (user?.id) {
                query = query.neq('id', user.id)
            }

            const { data: profilesData, error } = await query.limit(40)
            if (error) throw error

            // 2. Buscar quem eu sigo
            let followingIds: string[] = []
            if (user) {
                const { data: connData } = await supabase
                    .from('connections')
                    .select('following_id')
                    .eq('follower_id', user.id)

                followingIds = connData?.map(c => c.following_id) || []
            }

            // 3. Mapear para o formato da UI
            let mappedData = profilesData.map(d => {
                const vehicleCount = (d.vehicles as any)?.[0]?.count || 0;

                return {
                    id: d.id,
                    username: d.username,
                    full_name: d.full_name || 'Lojista Parceiro',
                    avatar_url: d.avatar_url,
                    store_name: d.store_name || `${(d.full_name || 'Lojista').split(' ')[0]} Veículos`,
                    location: d.city && d.state ? `${d.city} - ${d.state}` : 'LOCALIZAÇÃO NÃO INFO.',
                    rating: d.reputation_score || 5.0,
                    deals_count: vehicleCount,
                    verified: true,
                    is_following: followingIds.includes(d.id)
                }
            }) as Dealer[]

            if (activeTab === 'following') {
                return mappedData.filter(d => d.is_following)
            }

            if (activeTab === 'nearby' && user) {
                // Filtro simples por estado se o usuário logado tiver estado
                const { data: myProfile } = await supabase.from('profiles').select('state').eq('id', user.id).single();
                if (myProfile?.state) {
                    return mappedData.filter(d => d.location && d.location.includes(myProfile.state))
                }
            }

            return mappedData
        }
    })

    const handleToggleFollow = async (dealerId: string, isFollowing: boolean) => {
        if (!user) return

        if (isFollowing) {
            await supabase.from('connections').delete().eq('follower_id', user.id).eq('following_id', dealerId)
        } else {
            await supabase.from('connections').insert({ follower_id: user.id, following_id: dealerId })
        }
        refetch()
    }

    return (
        <div className="min-h-full pb-24 px-4 lg:px-10 relative">
            {/* Header */}
            <header className="py-8 lg:py-12 space-y-8 lg:space-y-10">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-zinc-900 rounded-lg lg:rounded-xl flex items-center justify-center text-primary shadow-xl shadow-zinc-900/10">
                                <Users className="w-4 h-4 lg:w-5 lg:h-5" />
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-[950] text-zinc-800 uppercase tracking-tighter leading-none">Rede de Lojistas</h1>
                        </div>
                        <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[9px] lg:text-[10px] max-w-sm lg:max-w-md leading-relaxed">
                            Conecte-se com revendedores verificados e amplie suas oportunidades de negócio.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
                        <div className="flex bg-white p-1 lg:p-1.5 rounded-xl lg:rounded-2xl border-2 border-zinc-50 shadow-sm min-w-max">
                            {['all', 'following', 'nearby'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={cn(
                                        "px-4 lg:px-6 py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeTab === tab ? "bg-zinc-900 text-white shadow-lg" : "text-zinc-400 hover:text-zinc-800"
                                    )}
                                >
                                    {tab === 'all' ? 'Todos' : tab === 'following' ? 'Seguindo' : 'Próximos'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-zinc-300 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, loja ou cidade..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 lg:pl-16 pr-6 lg:pr-8 py-4 lg:py-5 bg-white border-2 border-zinc-50 rounded-2xl lg:rounded-[2rem] text-sm font-bold placeholder:text-zinc-300 focus:border-primary/20 transition-all outline-none shadow-sm"
                        />
                    </div>
                </div>
            </header>

            {/* Grid de Lojistas */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Localizando lojistas...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {dealers?.map((dealer) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={dealer.id}
                            className="bg-white rounded-[3rem] border-3 border-zinc-50 p-8 shadow-premium hover:shadow-2xl hover:shadow-zinc-200/50 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="relative">
                                    <Link to={`/@${dealer.username || dealer.id}`}>
                                        <div className="w-20 h-20 rounded-[2rem] overflow-hidden bg-zinc-200 border-4 border-white shadow-sm ring-1 ring-zinc-100 hover:scale-105 transition-transform flex items-center justify-center">
                                            {dealer.avatar_url ? (
                                                <img
                                                    src={dealer.avatar_url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                        (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-xl font-black text-zinc-400">${(dealer.full_name?.[0] || 'L').toUpperCase()}</span>`;
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-xl font-black text-zinc-400">{(dealer.full_name?.[0] || 'L').toUpperCase()}</span>
                                            )}
                                        </div>
                                    </Link>
                                    {dealer.verified && (
                                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-black rounded-xl flex items-center justify-center border-4 border-white text-primary">
                                            <Verified className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleToggleFollow(dealer.id, dealer.is_following)}
                                    className={`p-4 rounded-2xl transition-all active:scale-95 ${dealer.is_following ? 'bg-zinc-100 text-zinc-800' : 'bg-[#0C0C0C] text-primary shadow-xl shadow-zinc-900/20'}`}
                                >
                                    {dealer.is_following ? <Users className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Link to={`/@${dealer.username || dealer.id}`} className="group/name">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-xl font-black text-zinc-800 uppercase tracking-tighter truncate group-hover/name:text-primary transition-colors">{dealer.store_name}</h3>
                                            <ArrowUpRight className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-colors" />
                                        </div>
                                    </Link>
                                    {dealer.username && (
                                        <div className="flex items-center gap-2 text-primary mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest">@{dealer.username}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 italic">Responsável: {dealer.full_name}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 py-4 border-y border-zinc-50">
                                    <div className="flex items-center gap-1.5">
                                        <Star className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                                        <span className="text-xs font-black text-zinc-800">{dealer.rating.toFixed(1)}</span>
                                    </div>
                                    <div className="w-1 h-1 bg-zinc-200 rounded-full"></div>
                                    <div className="flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-xs font-black text-zinc-800">{dealer.deals_count} Repasses</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <MapPin className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-tight">{dealer.location}</span>
                                    </div>
                                    <Link
                                        to={`/chat?user=${dealer.id}`}
                                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-zinc-50 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all shadow-sm"
                                    >
                                        <MessageSquare className="w-5 h-5" />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && dealers?.length === 0 && (activeTab === 'following') ? (
                <div className="bg-white rounded-[4rem] border-3 border-zinc-50 p-32 text-center space-y-8 shadow-2xl shadow-zinc-200/40">
                    <div className="w-24 h-24 bg-zinc-50 rounded-[2.5rem] flex items-center justify-center mx-auto">
                        <Users className="w-10 h-10 text-zinc-200" />
                    </div>
                    <div className="space-y-2 max-w-sm mx-auto">
                        <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tighter">Você ainda não segue ninguém</h2>
                        <p className="text-zinc-400 font-medium">Os lojistas que você seguir aparecerão aqui para acesso rápido.</p>
                    </div>
                </div>
            ) : !isLoading && dealers?.length === 0 && (
                <div className="bg-white rounded-[4rem] border-3 border-zinc-50 p-32 text-center space-y-8 shadow-2xl shadow-zinc-200/40">
                    <div className="w-24 h-24 bg-zinc-50 rounded-[2.5rem] flex items-center justify-center mx-auto">
                        <Search className="w-10 h-10 text-zinc-200" />
                    </div>
                    <div className="space-y-2 max-w-sm mx-auto">
                        <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tighter">Nenhum Lojista Encontrado</h2>
                        <p className="text-zinc-400 font-medium">Tente ajustar seus filtros ou busca.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
