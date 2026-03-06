import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, MessageSquare, X, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ReviewModalProps {
    isOpen: boolean
    onClose: () => void
    dealId: string
    reviewedId: string
    reviewedName: string
    onSuccess?: () => void
}

export function ReviewModal({
    isOpen,
    onClose,
    dealId,
    reviewedId,
    reviewedName,
    onSuccess
}: ReviewModalProps) {
    const { user } = useAuthStore()
    const [rating, setRating] = useState(0)
    const [comment, setComment] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [hoveredStar, setHoveredStar] = useState(0)

    // Check if already reviewed on mount
    useEffect(() => {
        const checkExisting = async () => {
            if (!dealId || !user) return;
            const { data } = await supabase
                .from('reviews')
                .select('id')
                .eq('deal_id', dealId)
                .eq('reviewer_id', user.id)
                .single();

            if (data) setIsSuccess(true);
        };
        checkExisting();
    }, [dealId, user]);

    const handleSubmit = async () => {
        if (!rating || !user) return

        setIsSubmitting(true)
        try {
            const { error } = await supabase
                .from('reviews')
                .insert({
                    deal_id: dealId,
                    reviewer_id: user.id,
                    reviewed_id: reviewedId,
                    rating,
                    comment
                })

            if (error) throw error

            setIsSuccess(true)
            setTimeout(() => {
                onSuccess?.()
                onClose()
            }, 2000)
        } catch (error) {
            console.error('Error submitting review:', error)
            toast.error('Erro ao enviar avaliação. Tente novamente.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.4)] overflow-hidden"
                >
                    {isSuccess ? (
                        <div className="p-12 text-center space-y-6">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-zinc-800 uppercase tracking-tighter">Avaliação Enviada!</h3>
                                <p className="text-zinc-400 font-medium">Obrigado por fortalecer a transparência na nossa rede.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-zinc-800 uppercase tracking-tighter">Como foi o negócio?</h3>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Avalie sua experiência com {reviewedName}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-800 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Stars Selection */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onMouseEnter={() => setHoveredStar(star)}
                                                onMouseLeave={() => setHoveredStar(0)}
                                                onClick={() => setRating(star)}
                                                className="transition-all transform hover:scale-125 active:scale-90"
                                            >
                                                <Star
                                                    className={cn(
                                                        "w-10 h-10 transition-all",
                                                        (hoveredStar || rating) >= star
                                                            ? "text-primary fill-primary drop-shadow-[0_0_8px_rgba(240,167,39,0.3)]"
                                                            : "text-zinc-200 fill-none"
                                                    )}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                                        {rating === 1 ? 'Muito Ruim' :
                                            rating === 2 ? 'Regular' :
                                                rating === 3 ? 'Bom' :
                                                    rating === 4 ? 'Muito Bom' :
                                                        rating === 5 ? 'Excelente!' : 'Selecione uma nota'}
                                    </p>
                                </div>

                                {/* Comment Field */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-zinc-400 px-2">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Seu Comentário (Opcional)</span>
                                    </div>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="O que você mais gostou nesta negociação?"
                                        className="w-full h-32 p-6 bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] text-sm font-medium placeholder:text-zinc-300 focus:border-primary/20 transition-all outline-none resize-none"
                                    />
                                </div>

                                <button
                                    disabled={!rating || isSubmitting}
                                    onClick={handleSubmit}
                                    className={cn(
                                        "w-full py-5 rounded-[1.5rem] flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100",
                                        rating ? "bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-900/10" : "bg-zinc-100 text-zinc-400 shadow-none"
                                    )}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Publicar Avaliação
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
