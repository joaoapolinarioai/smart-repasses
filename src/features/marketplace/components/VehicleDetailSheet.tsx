import { X, Calendar, Gauge, ArrowUpRight, MessageSquare, BadgeCheck, CarFront, ChevronLeft, ChevronRight, MapPin, ShieldCheck, Share2, Info, CheckCircle2, Zap, Heart, Timer, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { isAfter } from 'date-fns'
import { cn } from '@/lib/utils'
import { useVehicleStore } from '@/store/useVehicleStore'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from 'sonner'

interface VehicleDetailSheetProps {
    vehicle: any
    isOpen: boolean
    onClose: () => void
    onSendProposal?: (vehicle: any) => void
}

export function VehicleDetailSheet({ vehicle, isOpen, onClose, onSendProposal }: VehicleDetailSheetProps) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [currentImage, setCurrentImage] = useState(0)
    const [isReserving, setIsReserving] = useState(false)
    const [timeLeft, setTimeLeft] = useState<string>('')

    const { toggleFavorite, isFavorite } = useVehicleStore()
    const { user } = useAuthStore()

    const reservedUntil = vehicle?.locked_until ? new Date(vehicle.locked_until) : null
    const isExpired = reservedUntil ? !isAfter(reservedUntil, new Date()) : true
    const isMyReservation = user?.id === vehicle?.reserved_by
    const isOwner = user?.id === vehicle?.seller_id || user?.id === vehicle?.seller?.id
    const isReserved = vehicle?.status === 'reserved'
    const vehicleId = vehicle?.id?.toString() || ''

    useEffect(() => {
        if (!reservedUntil || isExpired) {
            setTimeLeft('')
            return
        }

        const updateTimer = () => {
            const now = new Date().getTime()
            const target = reservedUntil.getTime()
            const diff = target - now

            if (diff <= 0) {
                setTimeLeft('Expirado')
                return
            }

            const h = Math.floor(diff / (1000 * 60 * 60))
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const s = Math.floor((diff % (1000 * 60)) / 1000)

            setTimeLeft(`${h}h ${m}m ${s}s`)
        }

        const timer = setInterval(updateTimer, 1000)
        updateTimer()
        return () => clearInterval(timer)
    }, [reservedUntil, isExpired])

    if (!vehicle) return null

    const isFav = isFavorite(vehicle.id)
    const placeholderImage = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=1200';
    const images = (vehicle.images && vehicle.images.length > 0) ? vehicle.images : [placeholderImage]
    const location = vehicle.location || 'SÃO PAULO - SP'

    const handleShare = () => {
        const priceFormatted = (vehicle.price_repasse || 0).toLocaleString('pt-br')
        const text = `Confira este repasse: ${vehicle.make} ${vehicle.model} ${vehicle.year}\nPreço: R$ ${priceFormatted}\nLink: ${window.location.origin}/v/${vehicle.id}`
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
        window.open(whatsappUrl, '_blank')
    }

    const handleReserve = async () => {
        if (!user) {
            toast.error('Você precisa estar logado para reservar um veículo.');
            return;
        }

        if (isOwner) {
            toast.error('Você não pode reservar seu próprio veículo.');
            return;
        }

        if (isReserved) {
            toast.error('Este veículo já está reservado.');
            return;
        }

        setIsReserving(true);

        try {
            // Check if it's a mock item (id starting with 'v' like 'v1')
            const isMock = typeof vehicle.id === 'string' && vehicle.id.startsWith('v');

            if (isMock) {
                setTimeout(() => {
                    setIsReserving(false);
                    toast.info('Este é um anúncio de demonstração. Em um veículo real, ele seria reservado no banco de dados e você seria levado ao chat com o vendedor.');
                    onClose();
                }, 1000);
                return;
            }

            // Chamada atômica via RPC (Supa-Function)
            const { data: roomId, error } = await supabase.rpc('reserve_vehicle', {
                p_vehicle_id: vehicle.id,
                p_reserver_id: user.id
            });

            if (error) throw error;

            // 5. Sucesso e Redirecionamento
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            if (roomId) {
                navigate(`/chat/${roomId}`);
            }
            onClose();

        } catch (error: any) {
            console.error('Erro na reserva:', error);
            const message = error.message || 'Não foi possível completar a reserva.';
            toast.error(message.includes('already reserved') ? 'Este veículo já foi reservado por outro lojista.' : 'Não foi possível completar a reserva. Tente novamente mais tarde.');
        } finally {
            setIsReserving(false);
        }
    };

    const handleStartChat = async () => {
        if (!user || !vehicle) return;

        const sellerId = vehicle.seller_id || vehicle.seller?.id;

        if (user.id === sellerId) {
            toast.error('Você não pode abrir um chat no seu próprio anúncio.');
            return;
        }

        try {
            const { data: roomId, error: chatError } = await supabase.rpc('get_or_create_chat_room', {
                p_my_id: user.id,
                p_other_user_id: sellerId,
                p_vehicle_id: vehicle.id
            });

            if (chatError) throw chatError;

            if (roomId) {
                navigate(`/chat/${roomId}`);
                onClose();
            }
        } catch (error) {
            console.error('Erro ao abrir chat:', error);
            toast.error('Não foi possível abrir o chat agora.');
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                side="right"
                className="p-0 border-l border-zinc-100 w-full sm:max-w-[650px] lg:max-w-[750px] flex flex-col h-full bg-white font-sans overflow-hidden tech-card rounded-none lg:rounded-l-[3rem]"
            >
                <ScrollArea className="flex-1">
                    <div className="flex flex-col gap-0 pb-32">
                        {/* Header / Top Bar */}
                        <div className="px-4 lg:px-8 py-4 lg:py-6 flex items-center justify-between sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-zinc-100/50">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-black text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-lg shimmer">
                                        <BadgeCheck className="w-3 h-3 mr-1" />
                                        Procedência VIP
                                    </Badge>
                                    <span className="text-[9px] text-zinc-300 font-bold tracking-widest uppercase">SR-{vehicleId.slice(0, 8)}</span>
                                </div>
                                <SheetTitle className="text-xl lg:text-3xl font-[950] text-zinc-900 tracking-tighter uppercase leading-tight mt-1">
                                    {vehicle.make} <span className="text-primary italic">{vehicle.model}</span>
                                </SheetTitle>
                                <div className="flex items-center gap-1.5 text-zinc-400 mt-0.5">
                                    <MapPin className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                                    <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest leading-none">{location}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 lg:gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="rounded-xl w-9 h-9 lg:w-11 lg:h-11 border-zinc-100 hover:bg-zinc-50 shadow-sm active:scale-90 transition-transform"
                                    onClick={handleShare}
                                >
                                    <Share2 className="w-4 h-4 text-zinc-500" />
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="rounded-xl w-9 h-9 lg:w-11 lg:h-11 border-zinc-100 hover:bg-zinc-50 shadow-sm active:scale-90 transition-transform"
                                    onClick={() => toggleFavorite(vehicle.id)}
                                >
                                    <Heart className={cn("w-4 h-4 transition-all text-zinc-400", isFav && "fill-red-500 text-red-500")} />
                                </Button>

                                <Button
                                    variant="secondary"
                                    onClick={onClose}
                                    size="icon"
                                    className="rounded-xl w-9 h-9 lg:w-11 lg:h-11 bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl active:scale-90 transition-transform"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="px-4 lg:px-10 py-6 lg:py-10 space-y-8 lg:space-y-12">
                            {/* Media Section */}
                            <div className="space-y-4 lg:space-y-6">
                                <div className="relative aspect-[16/10] lg:aspect-[16/9] rounded-[2rem] lg:rounded-[3rem] overflow-hidden bg-zinc-50 border border-zinc-100 group shadow-2xl">
                                    <AnimatePresence mode="wait">
                                        <motion.img
                                            key={currentImage}
                                            initial={{ opacity: 0, scale: 1.05 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.4 }}
                                            src={images[currentImage]}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement
                                                target.src = placeholderImage
                                            }}
                                            className={cn(
                                                "w-full h-full object-cover",
                                                (!vehicle.images || vehicle.images.length === 0) && "opacity-30 grayscale blur-[1px]"
                                            )}
                                            alt="Vehicle"
                                        />
                                    </AnimatePresence>

                                    {images.length > 1 && (
                                        <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                onClick={(e) => { e.stopPropagation(); setCurrentImage((p) => (p - 1 + images.length) % images.length); }}
                                                className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-md border-0 pointer-events-auto shadow-xl"
                                            >
                                                <ChevronLeft className="w-5 h-5 text-zinc-800" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                onClick={(e) => { e.stopPropagation(); setCurrentImage((p) => (p + 1) % images.length); }}
                                                className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-md border-0 pointer-events-auto shadow-xl"
                                            >
                                                <ChevronRight className="w-5 h-5 text-zinc-800" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Badges on image */}
                                    <div className="absolute bottom-6 left-6 flex gap-2">
                                        <div className="bg-zinc-900/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm shadow-2xl tabular-nums">
                                            {currentImage + 1} / {images.length}
                                        </div>
                                    </div>

                                    {/* Placeholder Overlay when no real images */}
                                    {(!vehicle.images || vehicle.images.length === 0) && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-2xl">
                                                <CarFront className="w-10 h-10 text-zinc-400 opacity-60" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Thumbnails */}
                                {images.length > 1 && (
                                    <div className="flex gap-2.5 pb-2 overflow-x-auto scrollbar-hide px-1">
                                        {images.map((img: string, i: number) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentImage(i)}
                                                className={cn(
                                                    "w-20 aspect-[4/3] rounded-xl border-2 transition-all p-0.5 shrink-0 hover:scale-105 active:scale-95",
                                                    currentImage === i ? "border-zinc-900 shadow-md" : "border-transparent opacity-60 grayscale-[50%]"
                                                )}
                                            >
                                                <img src={img} className="w-full h-full object-cover rounded-[0.5rem]" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Specs Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {[
                                    { label: 'KM', val: `${vehicle.mileage?.toLocaleString('pt-br')} km`, icon: Gauge },
                                    { label: 'ANO', val: vehicle.year, icon: Calendar },
                                    { label: 'CÂMBIO', val: vehicle.transmission || 'Auto', icon: Zap },
                                    { label: 'TIPO', val: 'Premium', icon: CarFront },
                                ].map((item, i) => (
                                    <div key={i} className="p-4 bg-zinc-50/50 border border-zinc-100 rounded-3xl flex flex-col gap-1 transition-colors hover:bg-zinc-100/50">
                                        <item.icon className="w-4 h-4 text-zinc-400 mb-1" />
                                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none">{item.label}</p>
                                        <p className="text-[11px] font-bold text-zinc-800 uppercase truncate">{item.val}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Pricing Section - Desktop Professional Card */}
                            <div className="bg-zinc-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl border border-white/5">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -mr-40 -mt-40" />

                                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
                                    <div className="space-y-6 w-full">
                                        <div className={cn(
                                            "inline-flex items-center gap-2 px-3 py-1 border rounded-full",
                                            isReserved ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/10"
                                        )}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", isReserved ? "bg-amber-500" : "bg-primary animate-pulse")} />
                                            <p className={cn("text-[9px] font-black uppercase tracking-[0.2em]", isReserved ? "text-amber-500" : "text-primary")}>
                                                {isReserved ? (isMyReservation ? 'Você reservou este item' : 'Veículo Reservado') : 'Oportunidade Repasse'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.25em]">Preço de Aquisiçao</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-bold text-white/20 italic tracking-tighter tabular-nums leading-none">R$</span>
                                                <h3 className="text-5xl font-black tracking-tighter tabular-nums leading-none">
                                                    {(vehicle.price_repasse || 0).toLocaleString('pt-br')}
                                                </h3>
                                            </div>
                                        </div>

                                        {/* Timer/Reservation Banner */}
                                        {isReserved && reservedUntil && !isExpired && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={cn(
                                                    "p-4 rounded-2xl border flex items-center gap-4",
                                                    isMyReservation
                                                        ? "bg-amber-500/20 border-amber-500/30 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                                                        : "bg-white/5 border-white/10 text-zinc-400"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                    isMyReservation ? "bg-amber-500 text-white" : "bg-zinc-800 text-zinc-500"
                                                )}>
                                                    <Timer className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">
                                                        {isMyReservation ? 'Sua reserva expira em:' :
                                                            isOwner ? `Reservado por ${vehicle.reserver?.name || 'outro lojista'}` :
                                                                'Tempo para expirar:'}
                                                    </p>
                                                    <p className="text-lg font-black tracking-tight tabular-nums">
                                                        {timeLeft}
                                                    </p>
                                                </div>
                                                {isMyReservation && (
                                                    <AlertTriangle className="w-5 h-5 animate-pulse opacity-50" />
                                                )}
                                            </motion.div>
                                        )}

                                        <div className="flex items-center gap-3 pt-2">
                                            <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-0.5">
                                                <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter leading-none">Fipe Mercado</p>
                                                <p className="text-[13px] font-bold text-zinc-300 tabular-nums">R$ {((vehicle.price_repasse * 1.15).toLocaleString('pt-br'))}</p>
                                            </div>
                                            <div className="px-4 py-2 bg-primary/10 rounded-2xl border border-primary/20 flex flex-col gap-0.5">
                                                <p className="text-[8px] font-bold text-primary/60 uppercase tracking-tighter leading-none">Margem Estimada</p>
                                                <p className="text-[13px] font-bold text-primary tabular-nums">+ R$ {(vehicle.price_repasse * 0.15).toLocaleString('pt-br')}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-56 p-6 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-lg flex flex-col items-center text-center shrink-0">
                                        <ShieldCheck className="w-10 h-10 text-primary mb-3" />
                                        <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-2">Transação Segura</p>
                                        <p className="text-[10px] text-zinc-400 font-medium leading-relaxed italic">
                                            Smart Repasses garante a reserva até a vistoria do veículo.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <span className="p-2 bg-zinc-100 rounded-lg">
                                        <Info className="w-4 h-4 text-zinc-800" />
                                    </span>
                                    <h4 className="text-[11px] font-bold text-zinc-800 uppercase tracking-widest mt-0.5">Observações do Vendedor</h4>
                                    <Separator className="flex-1 opacity-40" />
                                </div>
                                <div className="bg-zinc-50/50 p-8 rounded-[2rem] border border-zinc-100">
                                    <p className="text-sm font-medium text-zinc-600 leading-relaxed italic whitespace-pre-wrap">
                                        {vehicle.description ? `"${vehicle.description}"` : "Sem descrição."}
                                    </p>
                                </div>
                            </div>

                            {/* Dealer Card */}
                            <div className="p-6 bg-white border border-zinc-100 rounded-[2.5rem] flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center text-primary text-lg font-black shadow-lg">
                                        {vehicle.seller.initial}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-black text-zinc-800 uppercase tracking-tight leading-none">{vehicle.seller.name}</p>
                                            <CheckCircle2 className="w-4 h-4 text-primary" />
                                        </div>
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Lojista Parceiro Verificado</p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className="rounded-xl px-4 py-2 border-zinc-200 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (vehicle.seller.username) {
                                            navigate(`/network/dealer/${vehicle.seller.username}`);
                                        } else if (vehicle.seller.id) {
                                            navigate(`/network/dealer/${vehicle.seller.id}`);
                                        }
                                        onClose();
                                    }}
                                >
                                    Ver Perfil
                                </Button>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                {/* Footer Actions - Premium Sticky bar */}
                <div className="p-8 bg-white/95 backdrop-blur-xl border-t border-zinc-100 flex items-center gap-4 sticky bottom-0 z-50">
                    <TooltipProvider>
                        <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-14 w-14 min-w-[3.5rem] rounded-2xl border-zinc-200 hover:text-primary hover:bg-orange-50 transition-colors"
                                    onClick={handleStartChat}
                                >
                                    <MessageSquare className="w-6 h-6" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Abrir Chat</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <div className="flex-1 flex gap-3 h-14">
                        <Button
                            onClick={() => onSendProposal?.(vehicle)}
                            variant="outline"
                            className="flex-[1] h-full border-2 border-zinc-900 rounded-2xl text-[11px] font-black text-zinc-800 uppercase tracking-wider hover:bg-zinc-50 active:scale-95 transition-all"
                        >
                            Enviar Proposta
                        </Button>
                        <Button
                            className={cn(
                                "flex-[1.5] h-14 rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-xl shadow-zinc-900/10 gap-2 active:scale-95 group transition-all",
                                isReserved && !isReserving ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-zinc-900 text-white hover:bg-zinc-800"
                            )}
                            disabled={isReserving || isReserved || isOwner}
                            onClick={handleReserve}
                        >
                            {isReserving ? 'PROCESSANDO...' : isReserved ? 'RESERVADO' : isOwner ? 'MEU VEÍCULO' : 'Reservar Agora'}
                            {!isReserved && !isOwner && <ArrowUpRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
