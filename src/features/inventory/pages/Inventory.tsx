import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { Link } from 'react-router-dom'
import { VehicleCard } from '../../marketplace/components/VehicleCard'
import { VehicleDetailSheet } from '../../marketplace/components/VehicleDetailSheet'
import { VehicleForm } from '../components/VehicleForm'
import { ReviewModal } from '../../social/components/ReviewModal'
import { Car, Plus, Loader2, LayoutGrid, ListFilter, Search, AlertCircle, ShoppingBag, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function InventoryPage() {
    const { user } = useAuthStore()
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [searchTerm, setSearchTerm] = useState('')
    const [editingVehicle, setEditingVehicle] = useState<any>(null)
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

    // Mock ID for development if user is null
    const sellerId = user?.id || '00000000-0000-0000-0000-000000000000'

    const { data: myVehicles, isLoading, refetch } = useQuery({
        queryKey: ['my-inventory', sellerId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vehicles')
                .select(`
                    id, 
                    make, 
                    model, 
                    year, 
                    price_repasse, 
                    price_fipe,
                    mileage, 
                    images, 
                    status,
                    description,
                    color,
                    transmission,
                    fuel_type,
                    locked_until,
                    reserved_by,
                    seller_id,
                    reserver:profiles!reserved_by(id, username, full_name, store_name)
                `)
                .eq('seller_id', sellerId)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching inventory:', error)
                return []
            }

            return data.map((v: any) => ({
                ...v,
                location: 'MEU ESTOQUE',
                images: v.images || [],
                price_repasse: v.price_repasse || 0,
                seller: {
                    id: v.seller_id,
                    name: 'MINHA LOJA',
                    isVip: true,
                    initial: 'M'
                },
                reserver: v.reserver ? {
                    id: v.reserver.id,
                    username: v.reserver.username,
                    name: v.reserver.store_name || v.reserver.full_name
                } : null
            }))
        }
    })

    const filteredVehicles = myVehicles?.filter(v =>
        v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const stats = {
        total: myVehicles?.length || 0,
        available: myVehicles?.filter(v => v.status === 'available').length || 0,
        reserved: myVehicles?.filter(v => v.status === 'reserved').length || 0,
        sold: myVehicles?.filter(v => v.status === 'sold').length || 0,
    }

    const handleStatusChange = async (id: string, status: 'available' | 'reserved' | 'sold') => {
        try {
            const updateData: any = { status }

            // Se estiver voltando para disponível ou vendido, limpar campos de reserva
            if (status !== 'reserved') {
                updateData.reserved_by = null
                updateData.locked_until = null
            }

            const { error } = await supabase
                .from('vehicles')
                .update(updateData)
                .eq('id', id)

            if (error) throw error
            refetch()
        } catch (error) {
            console.error('Error updating status:', error)
            toast.error('Erro ao atualizar status do veículo.')
        }
    }

    const handleDelete = async (vehicle: any) => {
        if (!confirm(`Deseja realmente excluir o anúncio do ${vehicle.make} ${vehicle.model}? Esta ação não pode ser desfeita.`)) {
            return
        }

        try {
            const { error } = await supabase
                .from('vehicles')
                .delete()
                .eq('id', vehicle.id)

            if (error) throw error
            refetch()
        } catch (error) {
            console.error('Error deleting vehicle:', error)
            toast.error('Erro ao excluir veículo.')
        }
    }

    return (
        <div className="min-h-full pb-24 px-4 lg:px-10 relative">
            {/* Header com Stats */}
            <header className="py-8 lg:py-12 space-y-8 lg:space-y-10">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-zinc-900 rounded-lg lg:rounded-xl flex items-center justify-center text-primary shadow-xl shadow-zinc-900/10">
                                <ShoppingBag className="w-4 h-4 lg:w-5 lg:h-5" />
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-[950] text-zinc-800 uppercase tracking-tighter leading-none">Meu Inventário</h1>
                        </div>
                        <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[9px] lg:text-[10px] max-w-sm lg:max-w-md leading-relaxed">
                            Gerencie seus veículos, acompanhe reservas e publique novas oportunidades na rede.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <div className="flex bg-white p-1 lg:p-1.5 rounded-xl lg:rounded-2xl border-2 border-zinc-50 shadow-sm self-start sm:self-auto">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-2 lg:p-2.5 rounded-lg lg:rounded-xl transition-all",
                                    viewMode === 'grid' ? "bg-zinc-900 text-white shadow-lg" : "text-zinc-400 hover:text-zinc-800"
                                )}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-2 lg:p-2.5 rounded-lg lg:rounded-xl transition-all",
                                    viewMode === 'list' ? "bg-zinc-900 text-white shadow-lg" : "text-zinc-400 hover:text-zinc-800"
                                )}
                            >
                                <ListFilter className="w-4 h-4" />
                            </button>
                        </div>

                        <Link
                            to={user?.user_metadata?.username ? `/@${user.user_metadata.username}` : '#'}
                            className="hidden sm:flex px-6 lg:px-8 py-3 lg:py-4 bg-white border-2 border-zinc-100 text-zinc-800 rounded-xl lg:rounded-2xl items-center justify-center gap-3 text-xs font-black uppercase tracking-widest hover:bg-zinc-50 transition-all shadow-sm active:scale-95 group"
                        >
                            <User className="w-4 h-4 text-zinc-400 group-hover:text-zinc-800 transition-colors" />
                            Ver Perfil
                        </Link>

                        <button
                            onClick={() => setIsAddOpen(true)}
                            className="px-6 lg:px-8 py-3 lg:py-4 bg-zinc-900 text-white rounded-xl lg:rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 active:scale-95 group"
                        >
                            <Plus className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform" />
                            Anunciar
                        </button>
                    </div>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                    {[
                        { label: 'Total Stock', value: stats.total, color: 'text-zinc-800' },
                        { label: 'Disponíveis', value: stats.available, color: 'text-primary' },
                        { label: 'Reservados', value: stats.reserved, color: 'text-orange-500' },
                        { label: 'Vendidos', value: stats.sold, color: 'text-zinc-400' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-4 lg:p-6 rounded-2xl lg:rounded-3xl border-2 border-zinc-50 shadow-premium group hover:border-primary/10 transition-all hover:scale-[1.02]">
                            <p className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-1 group-hover:text-primary transition-colors">{stat.label}</p>
                            <p className={`text-2xl lg:text-3xl font-[950] tracking-tighter tabular-nums ${stat.color}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>
            </header>

            {/* Barra de Busca e Filtros */}
            <div className="mb-8 lg:mb-12">
                <div className="relative group max-w-2xl">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Pesquisar no meu estoque (Ex: BMW, Corolla...)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-16 pr-8 py-5 bg-white border-2 border-zinc-50 rounded-[2rem] text-sm font-bold placeholder:text-zinc-300 focus:border-primary/20 transition-all outline-none shadow-sm"
                    />
                </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Carregando seu estoque...</p>
                </div>
            ) : filteredVehicles && filteredVehicles.length > 0 ? (
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={viewMode}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12' : 'space-y-6'}
                    >
                        {filteredVehicles.map((v) => (
                            <div key={v.id} className="relative group">
                                <VehicleCard
                                    vehicle={v}
                                    onOpenDetails={(v) => setSelectedVehicle(v)}
                                    isManagement={true}
                                    onEdit={(v) => setEditingVehicle(v)}
                                    onDelete={handleDelete}
                                    onStatusChange={handleStatusChange}
                                    onFinalize={async (vehicle) => {
                                        if (!confirm(`Confirmar que o repasse do ${vehicle.make} ${vehicle.model} foi concluído? \n\nIsso marcará o veículo como VENDIDO e liberará as avaliações.`)) {
                                            return;
                                        }

                                        try {
                                            const { data, error } = await supabase.rpc('finalize_vehicle_deal', {
                                                p_vehicle_id: vehicle.id,
                                                p_seller_id: user?.id
                                            });

                                            if (error) throw error;

                                            if ((data as any).success) {
                                                setReviewContext({
                                                    isOpen: true,
                                                    dealId: (data as any).deal_id,
                                                    reviewedId: vehicle.reserved_by,
                                                    reviewedName: vehicle.reserver?.name || 'Comprador'
                                                });
                                                refetch();
                                            } else {
                                                toast.error((data as any).message || 'Erro ao finalizar repasse.');
                                            }
                                        } catch (error) {
                                            console.error('Error finalizing deal:', error);
                                            toast.error('Ocorreu um erro ao finalizar o repasse.');
                                        }
                                    }}
                                />
                                {/* Badge de Status específico para o Inventário removed since it's now inside VehicleCard */}
                            </div>
                        ))}
                    </motion.div>
                </AnimatePresence>
            ) : (
                <div className="bg-white rounded-[4rem] border-3 border-zinc-50 p-32 text-center space-y-8 shadow-2xl shadow-zinc-200/40">
                    <div className="w-24 h-24 bg-zinc-50 rounded-[2.5rem] flex items-center justify-center mx-auto">
                        <Car className="w-10 h-10 text-zinc-200" />
                    </div>
                    <div className="space-y-2 max-w-sm mx-auto">
                        <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tighter">Estoque Vazio</h2>
                        <p className="text-zinc-400 font-medium">Você ainda não tem veículos anunciados. Comece agora e alcance lojistas de todo o país.</p>
                    </div>
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="inline-flex items-center justify-center px-12 py-5 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-zinc-900/20 active:scale-95 group"
                    >
                        <Plus className="w-4 h-4 text-primary mr-3 group-hover:rotate-90 transition-transform" />
                        Cadastrar Primeiro Veículo
                    </button>
                </div>
            )}

            {/* Modals e Sheets */}
            <VehicleDetailSheet
                vehicle={selectedVehicle}
                isOpen={!!selectedVehicle}
                onClose={() => setSelectedVehicle(null)}
                // No inventário, podemos desabilitar o envio de proposta para si mesmo
                onSendProposal={() => setSelectedVehicle(null)}
            />

            <VehicleForm
                isOpen={isAddOpen || !!editingVehicle}
                initialData={editingVehicle}
                onClose={() => {
                    setIsAddOpen(false)
                    setEditingVehicle(null)
                    refetch()
                }}
            />

            {/* Drop de Alerta caso não esteja logado (apenas visual) */}
            {!user && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-6">
                    <div className="bg-zinc-900 text-white p-6 rounded-3xl shadow-2xl border border-zinc-800 flex items-center gap-5">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-orange-400">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Modo Demonstração</p>
                            <p className="text-xs font-bold text-zinc-300">Você está vendo o estoque da conta mestre. Faça login para gerenciar sua própria loja.</p>
                        </div>
                    </div>
                </div>
            )}
            <ReviewModal
                isOpen={reviewContext.isOpen}
                onClose={() => setReviewContext(prev => ({ ...prev, isOpen: false }))}
                dealId={reviewContext.dealId}
                reviewedId={reviewContext.reviewedId}
                reviewedName={reviewContext.reviewedName}
                onSuccess={() => refetch()}
            />
        </div>
    )
}
