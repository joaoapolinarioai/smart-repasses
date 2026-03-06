import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
    Heart,
    ChevronRight,
    ChevronLeft,
    Share2,
    MoreHorizontal,
    Pencil,
    Trash2,
    Eye,
    CheckCircle,
    Clock,
    Check,
    Users2,
    Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVehicleStore } from '@/store/useVehicleStore'
import { Link } from 'react-router-dom'
import { isAfter } from 'date-fns'
import { Timer, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

interface VehicleCardProps {
    vehicle: {
        id: string
        make: string
        model: string
        year: number
        price_repasse: number
        price_fipe?: number
        best_proposal?: number
        mileage?: number
        location?: string
        transmission?: string
        status: 'available' | 'reserved' | 'sold'
        images: string[]
        locked_until?: string
        reserved_by?: string
        seller: {
            id?: string
            username?: string
            name: string
            initial: string
            isVip?: boolean
        }
        reserver?: {
            id: string
            username: string
            name: string
        }
    }
    onOpenDetails?: (vehicle: any) => void
    isManagement?: boolean
    isPartner?: boolean
    onEdit?: (vehicle: any) => void
    onDelete?: (vehicle: any) => void
    onStatusChange?: (id: string, status: 'available' | 'reserved' | 'sold') => void
    onFinalize?: (vehicle: any) => void
}

export function VehicleCard({
    vehicle,
    onOpenDetails,
    isManagement = false,
    isPartner = false,
    onEdit,
    onDelete,
    onStatusChange,
    onFinalize
}: VehicleCardProps) {
    const { toggleFavorite, isFavorite } = useVehicleStore()
    const { user } = useAuthStore()
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [timeLeft, setTimeLeft] = useState<string>('')

    const isFav = isFavorite(vehicle.id)
    const isReserved = vehicle.status === 'reserved'
    const isMyReservation = user?.id === vehicle.reserved_by
    const reservedUntil = vehicle.locked_until ? new Date(vehicle.locked_until) : null
    const isExpired = reservedUntil ? !isAfter(reservedUntil, new Date()) : true

    useEffect(() => {
        if (!isReserved || !reservedUntil || isExpired) return

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
    }, [isReserved, reservedUntil, isExpired])

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation()
        const priceFormatted = (vehicle.price_repasse || 0).toLocaleString('pt-br')
        const text = `Confira este repasse: ${vehicle.make} ${vehicle.model} ${vehicle.year}\nPreço: R$ ${priceFormatted}\nLink: ${window.location.origin}/v/${vehicle.id}`
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
        window.open(whatsappUrl, '_blank')
    }

    const placeholderImage = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=1200'
    const images = (vehicle.images && vehicle.images.length > 0) ? vehicle.images : [placeholderImage]
    const priceRepasse = vehicle.price_repasse || 0

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation()
        setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation()
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
    }

    return (
        <div
            onClick={() => onOpenDetails?.(vehicle)}
            className="bg-white rounded-[2.5rem] border-2 lg:border-3 border-zinc-50 tech-card hover:shadow-premium-hover transition-all duration-500 group cursor-pointer flex flex-col h-full overflow-hidden"
        >
            {/* 1. Image Header */}
            <div className="relative aspect-[16/10] overflow-hidden rounded-[2.2rem] m-2 isolate bg-zinc-100">
                {!isManagement && isPartner && (
                    <div className="absolute top-4 left-4 px-3.5 py-1.5 bg-zinc-900/90 rounded-full shadow-lg z-30 flex items-center gap-2 border border-white/10 backdrop-blur-md">
                        <Users2 className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">Seguindo</span>
                    </div>
                )}
                <AnimatePresence mode="wait">
                    <motion.img
                        key={currentImageIndex}
                        src={images[currentImageIndex]}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = placeholderImage
                        }}
                        className={cn(
                            "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
                            (!vehicle.images || vehicle.images.length === 0) && "opacity-40 grayscale-[50%]"
                        )}
                    />
                </AnimatePresence>

                {(!vehicle.images || vehicle.images.length === 0) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 mb-2 opacity-60">
                            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                            <circle cx="7" cy="17" r="2" />
                            <path d="M9 17h6" />
                            <circle cx="17" cy="17" r="2" />
                        </svg>
                    </div>
                )}

                {images.length > 1 && (
                    <>
                        <button
                            onClick={prevImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white backdrop-blur-md rounded-lg flex items-center justify-center text-zinc-800 transition-all z-20 opacity-0 group-hover:opacity-100 shadow-xl border border-white/20"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={nextImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white backdrop-blur-md rounded-lg flex items-center justify-center text-zinc-800 transition-all z-20 opacity-0 group-hover:opacity-100 shadow-xl border border-white/20"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </>
                )}

                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                    {isManagement ? (
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-10 h-10 bg-white/95 hover:bg-white backdrop-blur-md rounded-xl flex items-center justify-center transition-all shadow-lg border border-white/20 active:scale-95 group/menu"
                                >
                                    <MoreHorizontal className="w-5 h-5 text-zinc-600 group-hover/menu:text-primary transition-colors" />
                                </button>
                            </DropdownMenu.Trigger>

                            <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                    className="z-[300] min-w-[200px] bg-white rounded-3xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-2 border-zinc-50 animate-in fade-in zoom-in duration-200"
                                    align="end"
                                    sideOffset={8}
                                >
                                    <DropdownMenu.Item
                                        onClick={(e) => { e.stopPropagation(); onOpenDetails?.(vehicle); }}
                                        className="flex items-center gap-3 px-4 py-3 text-[10px] font-black text-zinc-600 uppercase tracking-widest hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer outline-none"
                                    >
                                        <Eye className="w-4 h-4 text-zinc-400" />
                                        Ver Anúncio
                                    </DropdownMenu.Item>

                                    <DropdownMenu.Item
                                        onClick={(e) => { e.stopPropagation(); onEdit?.(vehicle); }}
                                        className="flex items-center gap-3 px-4 py-3 text-[10px] font-black text-zinc-600 uppercase tracking-widest hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer outline-none"
                                    >
                                        <Pencil className="w-4 h-4 text-zinc-400" />
                                        Editar Dados
                                    </DropdownMenu.Item>

                                    <DropdownMenu.Separator className="h-px bg-zinc-50 my-2 mx-2" />

                                    {vehicle.status === 'available' && (
                                        <>
                                            <DropdownMenu.Item
                                                onClick={(e) => { e.stopPropagation(); onStatusChange?.(vehicle.id, 'sold'); }}
                                                className="flex items-center gap-3 px-4 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:bg-emerald-50 rounded-2xl transition-colors cursor-pointer outline-none"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Marcar como Vendido
                                            </DropdownMenu.Item>

                                            <DropdownMenu.Item
                                                onClick={(e) => { e.stopPropagation(); onStatusChange?.(vehicle.id, 'reserved'); }}
                                                className="flex items-center gap-3 px-4 py-3 text-[10px] font-black text-amber-600 uppercase tracking-widest hover:bg-amber-50 rounded-2xl transition-colors cursor-pointer outline-none"
                                            >
                                                <Clock className="w-4 h-4" />
                                                Marcar como Reservado
                                            </DropdownMenu.Item>
                                        </>
                                    )}

                                    {vehicle.status === 'reserved' && (
                                        <DropdownMenu.Item
                                            onClick={(e) => { e.stopPropagation(); onFinalize?.(vehicle); }}
                                            className="flex items-center gap-3 px-4 py-3 text-[10px] font-black text-primary uppercase tracking-widest hover:bg-orange-50 rounded-2xl transition-colors cursor-pointer outline-none"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M20 6 9 17l-5-5"></path><path d="m16 6-7 7-4-4"></path></svg>
                                            Confirmar Repasse
                                        </DropdownMenu.Item>
                                    )}

                                    {vehicle.status === 'reserved' && (
                                        <DropdownMenu.Item
                                            onClick={(e) => { e.stopPropagation(); onStatusChange?.(vehicle.id, 'available'); }}
                                            className="flex items-center gap-3 px-4 py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 rounded-2xl transition-colors cursor-pointer outline-none"
                                        >
                                            <Check className="w-4 h-4" />
                                            Marcar como Disponível
                                        </DropdownMenu.Item>
                                    )}

                                    <DropdownMenu.Separator className="h-px bg-zinc-50 my-2 mx-2" />

                                    <DropdownMenu.Item
                                        onClick={(e) => { e.stopPropagation(); handleShare(e); }}
                                        className="flex items-center gap-3 px-4 py-3 text-[10px] font-black text-zinc-600 uppercase tracking-widest hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer outline-none"
                                    >
                                        <Share2 className="w-4 h-4 text-zinc-400" />
                                        Compartilhar Link
                                    </DropdownMenu.Item>

                                    <DropdownMenu.Item
                                        onClick={(e) => { e.stopPropagation(); onDelete?.(vehicle); }}
                                        className="flex items-center gap-3 px-4 py-3 text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-colors cursor-pointer outline-none"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Excluir Repasse
                                    </DropdownMenu.Item>
                                </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                    ) : (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(vehicle.id); }}
                                className="w-10 h-10 bg-white/90 hover:bg-white backdrop-blur-md rounded-xl flex items-center justify-center transition-all shadow-lg border border-white/20 group/fav active:scale-90"
                            >
                                <Heart className={cn("w-5 h-5 transition-all text-zinc-400 group-hover/fav:text-red-500", isFav && "fill-red-500 text-red-500")} />
                            </button>

                            <button
                                onClick={handleShare}
                                className="w-10 h-10 bg-white/90 hover:bg-white backdrop-blur-md rounded-xl flex items-center justify-center transition-all shadow-lg border border-white/20 group/share active:scale-90"
                            >
                                <Share2 className="w-5 h-5 text-zinc-400 group-hover/share:text-primary transition-colors" />
                            </button>
                        </>
                    )}
                </div>

                <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
                    <span className={cn(
                        "px-3 py-1.5 rounded-lg text-[9px] font-[900] uppercase tracking-widest shadow-lg backdrop-blur-sm border border-white/10 flex items-center gap-1.5",
                        vehicle.status === 'reserved' ? "bg-amber-500/90 text-white" :
                            vehicle.status === 'sold' ? "bg-zinc-800/80 text-white" : "bg-primary text-white"
                    )}>
                        {vehicle.status === 'reserved' ? (
                            <>
                                <Timer className="w-3 h-3" />
                                {timeLeft || 'RESERVADO'}
                            </>
                        ) : vehicle.status === 'sold' ? 'VENDIDO' : 'EM ABERTO'}
                    </span>

                    {isReserved && isMyReservation && !isExpired && (
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[8px] font-black text-amber-600 uppercase tracking-widest shadow-lg flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Sua Reserva
                        </span>
                    )}
                </div>
            </div>

            {/* 2. Content */}
            <div className="p-6 pt-2 flex flex-col flex-1">
                <div className="mb-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-[22px] font-[900] text-zinc-800 uppercase leading-[0.9] tracking-tighter truncate">
                            {vehicle.make} {vehicle.model}
                        </h3>
                        <div className="text-right shrink-0">
                            <span className="text-[10px] font-black text-zinc-400">{vehicle.year}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                        <span>{vehicle.mileage?.toLocaleString('pt-br')} KM</span>
                        <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                        <span className="truncate">{vehicle.location || 'SÃO PAULO'}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-2xl">
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Repasse</p>
                        <p className="text-base font-black text-zinc-800 tracking-tight">R$ {priceRepasse.toLocaleString('pt-br')}</p>
                    </div>
                    <div className="p-3 bg-orange-50/20 border border-orange-100 rounded-2xl relative">
                        <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">Proposta</p>
                        <p className="text-base font-black text-primary tracking-tight">
                            R$ {(vehicle.best_proposal || priceRepasse * 0.95).toLocaleString('pt-br')}
                        </p>
                    </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-4 border-t border-zinc-50">
                    <Link
                        to={vehicle.seller.username ? `/@${vehicle.seller.username}` : (vehicle.seller.id ? `/@${vehicle.seller.id}` : '#')}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                    >
                        <div className="w-7 h-7 bg-zinc-900 rounded-xl flex items-center justify-center text-primary text-[8px] font-black shadow-lg">
                            {vehicle.seller.initial}
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                                <p className="text-[9px] font-[950] text-zinc-800 uppercase tracking-tight truncate max-w-[120px]">
                                    {vehicle.seller.name}
                                </p>
                                {isPartner && <Star className="w-2.5 h-2.5 text-primary fill-current shrink-0" />}
                            </div>
                            <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest leading-none">
                                {isPartner ? 'Seu Parceiro' : 'Verificado'}
                            </span>
                        </div>
                    </Link>
                    <button className="flex items-center gap-1.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest hover:text-primary transition-all group/see">
                        Ver Detalhes
                        <ChevronRight className="w-3.5 h-3.5 group-hover/see:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    )
}
