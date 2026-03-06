import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useVehicleStore } from '@/store/useVehicleStore'
import { VehicleCard } from '../components/VehicleCard'
import { VehicleDetailSheet } from '../components/VehicleDetailSheet'
import { ProposalModal } from '../components/ProposalModal'
import { Heart, ArrowLeft, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export function FavoritesPage() {
    const { favorites } = useVehicleStore()
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
    const [isProposalOpen, setIsProposalOpen] = useState(false)

    const { data: vehicles, isLoading } = useQuery({
        queryKey: ['favorites', favorites],
        queryFn: async () => {
            if (favorites.length === 0) return []

            const { data, error } = await supabase
                .from('vehicles')
                .select(`
                    id, 
                    make, 
                    model, 
                    year, 
                    price_repasse, 
                    mileage, 
                    images, 
                    status,
                    seller_id,
                    locked_until,
                    reserved_by,
                    seller:profiles!seller_id(id, username, full_name, avatar_url, store_name),
                    reserver:profiles!reserved_by(id, username, full_name, store_name)
                `)
                .in('id', favorites)

            if (error) throw error

            return data.map((v: any) => ({
                ...v,
                location: 'SÃO PAULO - SP',
                images: v.images || [],
                price_repasse: v.price_repasse || 0,
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
        enabled: favorites.length > 0
    })

    return (
        <div className="min-h-full pb-24 px-4 lg:px-10 relative">
            <header className="py-8 lg:py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4 lg:gap-6">
                    <Link to="/" className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl lg:rounded-2xl border-2 border-zinc-50 flex items-center justify-center text-zinc-400 hover:text-zinc-800 shadow-sm transition-all active:scale-90">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="space-y-0.5 lg:space-y-1">
                        <div className="flex items-center gap-2 lg:gap-3">
                            <Heart className="w-4 h-4 lg:w-5 lg:h-5 text-red-500 fill-red-500" />
                            <h1 className="text-2xl lg:text-3xl font-[950] text-zinc-800 uppercase tracking-tighter leading-none">Meus Favoritos</h1>
                        </div>
                        <p className="text-zinc-400 font-bold uppercase tracking-widest text-[8px] lg:text-[10px]">Gerencie as ofertas que você salvou</p>
                    </div>
                </div>
                {isLoading && <Loader2 className="w-6 h-6 text-primary animate-spin self-end sm:self-auto" />}
            </header>

            {favorites.length === 0 ? (
                <div className="bg-white rounded-[4rem] border-3 border-zinc-50 p-32 text-center space-y-6 shadow-2xl shadow-zinc-200/40">
                    <div className="w-24 h-24 bg-zinc-50 rounded-[2.5rem] flex items-center justify-center mx-auto">
                        <Heart className="w-10 h-10 text-zinc-200" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tighter">Nenhum favorito ainda</h2>
                        <p className="text-zinc-400 font-medium">Explore o feed e salve as melhores oportunidades para vê-las aqui.</p>
                    </div>
                    <Link to="/" className="inline-flex items-center justify-center px-12 py-5 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-zinc-900/20 active:scale-95">
                        Explorar Ofertas
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    {vehicles?.map((v: any) => (
                        <div key={v.id} className="relative">
                            <VehicleCard
                                vehicle={v}
                                onOpenDetails={(v) => setSelectedVehicle(v)}
                            />
                        </div>
                    ))}
                </div>
            )}

            <VehicleDetailSheet
                vehicle={selectedVehicle}
                isOpen={!!selectedVehicle}
                onClose={() => setSelectedVehicle(null)}
                onSendProposal={() => setIsProposalOpen(true)}
            />

            <ProposalModal
                vehicle={selectedVehicle}
                isOpen={isProposalOpen}
                onClose={() => setIsProposalOpen(false)}
            />
        </div>
    )
}
