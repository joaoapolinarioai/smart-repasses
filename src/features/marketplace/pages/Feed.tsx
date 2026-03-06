import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { VehicleCard } from '../components/VehicleCard'
import { VehicleDetailSheet } from '../components/VehicleDetailSheet'
import { ProposalModal } from '../components/ProposalModal'
import { VehicleForm } from '../../inventory/components/VehicleForm'
import { Star, Search, Filter, Loader2, LayoutDashboard, Users2, ArrowRight } from 'lucide-react'
import { useFilterStore } from '@/store/useFilterStore'
import { FilterDrawer } from '../components/FilterDrawer'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useDebounce } from '@/hooks/useDebounce'
import { SHOWCASE_ITEMS, ONLINE_DEALERS_PLACEHOLDERS } from '@/data/marketplace'

export function MarketplaceFeed() {
    const { user } = useAuthStore();
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
    const [isProposalOpen, setIsProposalOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isAnunciarOpen, setIsAnunciarOpen] = useState(false);
    const [showFollowingOnly, setShowFollowingOnly] = useState(false);

    const { searchTerm, setSearchTerm, filters } = useFilterStore();
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const { data: followingIds = [] } = useQuery({
        queryKey: ['following', user?.id],
        queryFn: async () => {
            if (!user?.id) return []
            const { data } = await supabase
                .from('connections')
                .select('following_id')
                .eq('follower_id', user.id)
            return data?.map(c => c.following_id) || []
        },
        enabled: !!user?.id
    })

    const { data: onlineFollowedDealers = [] } = useQuery({
        queryKey: ['online-followed-dealers', followingIds],
        queryFn: async () => {
            if (followingIds.length === 0) return []
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, store_name, avatar_url, username')
                .in('id', followingIds)
                .limit(5)
            return data || []
        },
        enabled: followingIds.length > 0
    })

    const { data: vehiclesData, isLoading, isFetching } = useQuery({
        queryKey: ['vehicles', debouncedSearchTerm, filters, showFollowingOnly, followingIds],
        queryFn: async () => {
            const columns = `
                id, 
                make, 
                model, 
                year, 
                price_repasse, 
                mileage, 
                images, 
                status,
                transmission,
                seller_id,
                locked_until,
                reserved_by,
                seller:profiles!seller_id(id, username, full_name, avatar_url, store_name),
                reserver:profiles!reserved_by(id, username, full_name, store_name)
            `

            let query = supabase
                .from('vehicles')
                .select(columns)
                .neq('status', 'sold')
                .order('created_at', { ascending: false })

            if (showFollowingOnly) {
                if (followingIds.length > 0) {
                    query = query.in('seller_id', followingIds);
                } else {
                    // Se não segue ninguém, retorna vazio imediatamente
                    return [];
                }
            }

            // Global search
            if (searchTerm) {
                query = query.or(`make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`);
            }

            // Advanced Filters
            if (filters.make) query = query.eq('make', filters.make);
            if (filters.model) query = query.ilike('model', `%${filters.model}%`);
            if (filters.transmission) query = query.eq('transmission', filters.transmission);

            if (filters.minPrice) query = query.gte('price_repasse', parseInt(filters.minPrice));
            if (filters.maxPrice) query = query.lte('price_repasse', parseInt(filters.maxPrice));

            if (filters.minYear) query = query.gte('year', parseInt(filters.minYear));
            if (filters.maxYear) query = query.lte('year', parseInt(filters.maxYear));

            if (filters.maxMileage) query = query.lte('mileage', parseInt(filters.maxMileage));

            const { data, error } = await query;
            if (error) {
                console.error('Query error:', error);
                throw error;
            }

            return data.map((v: any) => ({
                ...v,
                location: 'SÃO PAULO - SP',
                isPartner: followingIds.includes(v.seller_id),
                seller: {
                    id: v.seller_id,
                    username: v.seller?.username,
                    name: v.seller?.store_name || v.seller?.full_name || 'LOJA PARCEIRA',
                    avatar: v.seller?.avatar_url,
                    initial: (v.seller?.full_name?.[0] || 'L').toUpperCase(),
                    isVip: true
                },
                reserver: v.reserver ? {
                    id: v.reserver.id,
                    username: v.reserver.username,
                    name: v.reserver.store_name || v.reserver.full_name
                } : null
            }))
        },
        staleTime: 1000 * 60 * 2,
    })

    const allVehicles = showFollowingOnly
        ? (vehiclesData || [])
        : (vehiclesData && vehiclesData.length > 0 ? vehiclesData : SHOWCASE_ITEMS);

    return (
        <div className="min-h-full pb-24 px-4 lg:px-10 relative">
            {/* Lojistas Strip */}
            <div className="py-6 lg:py-8 flex items-center justify-between overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-5 min-w-max">
                    <div className="flex items-center -space-x-3.5">
                        {onlineFollowedDealers.length > 0 ? (
                            onlineFollowedDealers.map((d) => (
                                <Link
                                    key={d.id}
                                    to={`/@${d.username}`}
                                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-full border-[3px] lg:border-4 border-white flex items-center justify-center text-[10px] font-black text-white shadow-lg relative group cursor-pointer hover:z-20 transition-all hover:scale-110 active:scale-95 bg-zinc-900 overflow-hidden"
                                >
                                    {d.avatar_url ? (
                                        <img src={d.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{d.full_name?.[0] || 'L'}</span>
                                    )}
                                    <div className="absolute bottom-0.5 right-0.5 lg:bottom-1 lg:right-1 w-2.5 h-2.5 lg:w-3 lg:h-3 bg-primary border-2 border-white rounded-full"></div>
                                </Link>
                            ))
                        ) : (
                            ONLINE_DEALERS_PLACEHOLDERS.map((d) => (
                                <div key={d.id} className={`${d.color} w-10 h-10 lg:w-12 lg:h-12 rounded-full border-[3px] lg:border-4 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm relative group cursor-pointer hover:z-20 transition-all hover:scale-110 active:scale-95`}>
                                    {d.initial}
                                    <div className="absolute bottom-0.5 right-0.5 lg:bottom-1 lg:right-1 w-2.5 h-2.5 lg:w-3 lg:h-3 bg-primary border-2 border-white rounded-full"></div>
                                </div>
                            ))
                        )}
                        <div className={cn(
                            "h-10 lg:h-12 rounded-full border-[3px] lg:border-4 border-white bg-zinc-50 flex items-center justify-center text-[9px] font-black text-zinc-400 shadow-sm transition-all whitespace-nowrap",
                            onlineFollowedDealers.length > 0 ? "px-4 lg:px-6 w-auto" : "w-10 lg:w-12"
                        )}>
                            {onlineFollowedDealers.length > 0 ? 'CONFIANÇA' : '+14'}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 bg-white rounded-full border border-zinc-100 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(240,167,39,0.5)]"></div>
                        <span className="text-[9px] lg:text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                            {onlineFollowedDealers.length > 0 ? 'Novidades dos seus Parceiros' : '14 Lojistas Ativos Agora'}
                        </span>
                    </div>
                </div>
                <div className="hidden lg:block shrink-0 ml-4">
                    {(isFetching || isLoading) && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                </div>
            </div>

            {/* Compact Header Section */}
            <div className="flex flex-col gap-6 lg:gap-10 mb-8 lg:mb-12">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8">
                    <div className="space-y-4 lg:border-l-4 lg:border-primary/20 lg:pl-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 rounded-lg lg:rounded-xl flex items-center justify-center shadow-xl shadow-zinc-900/10">
                                <Star className="w-4 h-4 lg:w-5 lg:h-5 text-primary fill-current" />
                            </div>
                            <h1 className="text-3xl lg:text-5xl font-[950] text-zinc-800 uppercase tracking-tighter leading-none">
                                Repasses <span className="text-primary italic">Ativos</span>
                            </h1>
                        </div>
                        <div className="flex p-1 lg:p-1.5 bg-zinc-100 rounded-2xl lg:rounded-[1.5rem] w-full lg:w-fit shadow-inner border border-zinc-200/50">
                            <button
                                onClick={() => setShowFollowingOnly(false)}
                                className={cn(
                                    "flex-1 lg:flex-none px-4 lg:px-8 py-2 lg:py-2.5 text-[10px] lg:text-[11px] font-black uppercase tracking-widest transition-all rounded-xl lg:rounded-[1rem] flex items-center justify-center gap-2",
                                    !showFollowingOnly
                                        ? "bg-white text-zinc-900 shadow-md ring-1 ring-zinc-200"
                                        : "text-zinc-400 hover:text-zinc-600"
                                )}
                            >
                                <LayoutDashboard className="w-3.5 h-3.5" />
                                Todos
                            </button>
                            <button
                                onClick={() => setShowFollowingOnly(true)}
                                className={cn(
                                    "flex-1 lg:flex-none px-4 lg:px-8 py-2 lg:py-2.5 text-[10px] lg:text-[11px] font-black uppercase tracking-widest transition-all rounded-xl lg:rounded-[1rem] flex items-center justify-center gap-2",
                                    showFollowingOnly
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "text-zinc-400 hover:text-zinc-600"
                                )}
                            >
                                <Users2 className="w-3.5 h-3.5" />
                                Seguindo
                                {followingIds.length > 0 && (
                                    <span className={cn(
                                        "w-4 h-4 rounded-full text-[8px] flex items-center justify-center",
                                        showFollowingOnly ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-500"
                                    )}>
                                        {followingIds.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 flex-1 max-w-2xl">
                        <div className="relative group flex-1 w-full">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por marca ou modelo..."
                                className="w-full pl-14 pr-6 py-4 bg-white border-2 border-zinc-100 rounded-2xl text-sm font-bold placeholder:text-zinc-300 focus:border-primary/20 transition-all outline-none shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className="w-full md:w-auto px-8 py-4 bg-white border-2 border-zinc-100 rounded-2xl flex items-center justify-center gap-3 text-xs font-black text-zinc-800 uppercase tracking-widest hover:bg-zinc-50 transition-all shadow-sm group active:scale-95"
                        >
                            <Filter className="w-4 h-4 text-primary" />
                            Filtros
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Marketplace Section */}
            <div className="space-y-16">
                {showFollowingOnly && vehiclesData?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-8 bg-white rounded-[4rem] border-3 border-zinc-50 shadow-sm mx-auto max-w-4xl text-center px-12">
                        <div className="w-24 h-24 bg-zinc-50 rounded-[2.5rem] flex items-center justify-center relative">
                            <Users2 className="w-10 h-10 text-zinc-200" />
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                <Star className="w-4 h-4 text-white fill-current" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-3xl font-black text-zinc-800 uppercase tracking-tighter">Sua rede está em silêncio</h3>
                            <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px] leading-relaxed max-w-md mx-auto">
                                Você ainda não segue outros lojistas ou seus parceiros ainda não publicaram ofertas hoje. Experimente conectar-se com novos lojistas na rede.
                            </p>
                        </div>
                        <Link
                            to="/network"
                            className="flex items-center gap-3 px-8 py-4 bg-zinc-900 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl active:scale-95 group"
                        >
                            Conhecer outros Lojistas
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Featured Section */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-zinc-100 pb-6">
                                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                <h2 className="text-[13px] font-black text-zinc-800 uppercase tracking-[0.2em]">Destaques da Rede</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                                {isLoading ? (
                                    [1, 2, 3].map((i) => (
                                        <div key={i} className="bg-white p-6 rounded-[3rem] border-3 border-zinc-50 space-y-6 animate-pulse">
                                            <div className="aspect-[16/10] bg-zinc-100 rounded-[2.5rem]" />
                                            <div className="h-6 bg-zinc-50 rounded-full w-2/3" />
                                        </div>
                                    ))
                                ) : (
                                    allVehicles.slice(0, 3).map((v: any) => (
                                        <VehicleCard
                                            key={v.id}
                                            vehicle={v}
                                            isPartner={v.isPartner}
                                            onOpenDetails={(v) => setSelectedVehicle(v)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        {/* All Opportunities Section */}
                        <div className="space-y-10">
                            <div className="flex items-center justify-between border-b border-zinc-100 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-6 bg-zinc-200 rounded-full"></div>
                                    <h2 className="text-[13px] font-black text-zinc-800 uppercase tracking-[0.2em]">Mercado em Tempo Real</h2>
                                </div>
                                <div className="px-4 py-1.5 bg-zinc-50 rounded-full border border-zinc-100">
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{allVehicles.length} Oportunidades</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                                {isLoading ? (
                                    [1, 2, 3, 4, 5, 6].map((i) => (
                                        <div key={i} className="bg-white p-6 rounded-[3rem] border-3 border-zinc-50 space-y-6 animate-pulse">
                                            <div className="aspect-[16/10] bg-zinc-100 rounded-[2.5rem]" />
                                            <div className="h-6 bg-zinc-50 rounded-full w-2/3" />
                                        </div>
                                    ))
                                ) : (
                                    allVehicles.map((v: any) => (
                                        <VehicleCard
                                            key={v.id}
                                            vehicle={v}
                                            isPartner={v.isPartner}
                                            onOpenDetails={(v) => setSelectedVehicle(v)}
                                        />
                                    ))
                                )}
                            </div>

                            {!isLoading && allVehicles.length > 0 && (
                                <div className="pt-12 flex flex-col items-center gap-6">
                                    <div className="h-px w-24 bg-zinc-100"></div>
                                    <button className="px-12 py-5 bg-white border-2 border-zinc-100 rounded-[2rem] text-[10px] font-black text-zinc-800 uppercase tracking-widest hover:bg-zinc-50 hover:border-zinc-200 transition-all shadow-sm active:scale-95">
                                        Carregar Mais Oportunidades
                                    </button>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Você chegou ao fim das novidades de hoje.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
            />

            <VehicleDetailSheet
                vehicle={selectedVehicle}
                isOpen={!!selectedVehicle && !isProposalOpen}
                onClose={() => setSelectedVehicle(null)}
                onSendProposal={() => setIsProposalOpen(true)}
            />

            <ProposalModal
                vehicle={selectedVehicle}
                isOpen={isProposalOpen}
                onClose={(success) => {
                    setIsProposalOpen(false);
                    if (success) setSelectedVehicle(null);
                }}
            />

            <VehicleForm
                isOpen={isAnunciarOpen}
                onClose={() => setIsAnunciarOpen(false)}
            />
        </div>
    )
}
