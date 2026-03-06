import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, DollarSign, RefreshCcw, Send, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NumericFormat } from 'react-number-format'

interface ProposalModalProps {
    vehicle: any
    isOpen: boolean
    onClose: (success?: boolean) => void
}

export function ProposalModal({ vehicle, isOpen, onClose }: ProposalModalProps) {
    const [type, setType] = useState<'cash' | 'trade'>('cash')
    const [amount, setAmount] = useState<number | undefined>(undefined)
    const [tradeDetails, setTradeDetails] = useState('')
    const [isSent, setIsSent] = useState(false)

    if (!vehicle) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setIsSent(true)
        setTimeout(() => {
            setIsSent(false)
            onClose(true)
        }, 2500)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-[150] p-6 font-sans">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => onClose()}
                        className="absolute inset-0 bg-zinc-900/80 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        {isSent ? (
                            <div className="p-16 flex flex-col items-center text-center space-y-6">
                                <div className="w-24 h-24 bg-orange-100/50 rounded-[2rem] flex items-center justify-center shadow-xl shadow-orange-500/10">
                                    <CheckCircle2 className="w-12 h-12 text-primary animate-bounce" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black text-zinc-800 uppercase tracking-tighter">Proposta Enviada!</h3>
                                    <p className="text-zinc-500 font-medium">O lojista será notificado e responderá via chat em instantes.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {/* Header */}
                                <div className="p-8 pb-4 flex items-center justify-between border-b border-zinc-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-primary">
                                            <DollarSign className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Enviar Proposta para</p>
                                            <h3 className="text-xl font-black text-zinc-800 uppercase tracking-tight truncate">{vehicle.make} {vehicle.model}</h3>
                                        </div>
                                    </div>
                                    <button onClick={() => onClose()} className="p-3 hover:bg-zinc-50 rounded-xl transition-all">
                                        <X className="w-6 h-6 text-zinc-300" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                                    {/* Toggle Type */}
                                    <div className="grid grid-cols-2 gap-3 p-1.5 bg-zinc-100 rounded-[1.75rem]">
                                        <button
                                            type="button"
                                            onClick={() => setType('cash')}
                                            className={cn(
                                                "py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2",
                                                type === 'cash' ? "bg-white text-zinc-800 shadow-xl" : "text-zinc-500 hover:text-zinc-700"
                                            )}
                                        >
                                            <DollarSign className="w-4 h-4" />
                                            Dinheiro
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setType('trade')}
                                            className={cn(
                                                "py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2",
                                                type === 'trade' ? "bg-zinc-900 text-white shadow-xl shadow-zinc-900/10" : "text-zinc-500 hover:text-zinc-700"
                                            )}
                                        >
                                            <RefreshCcw className="w-4 h-4" />
                                            Troca
                                        </button>
                                    </div>

                                    {/* Main Inputs */}
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Valor da Proposta (R$)</label>
                                            <div className="relative group">
                                                <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 group-focus-within:text-primary transition-colors z-10" />
                                                <NumericFormat
                                                    required
                                                    thousandSeparator="."
                                                    decimalSeparator=","
                                                    prefix="R$ "
                                                    placeholder="R$ 0,00"
                                                    onValueChange={(values) => setAmount(values.floatValue)}
                                                    className="w-full pl-16 pr-8 py-5 bg-[#FAFAFA] border-2 border-transparent rounded-2xl text-lg font-black placeholder:text-zinc-200 focus:bg-white focus:border-primary/20 outline-none transition-all shadow-inner"
                                                />
                                            </div>
                                        </div>

                                        {type === 'trade' && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="space-y-2"
                                            >
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Detalhes da Troca</label>
                                                <textarea
                                                    required
                                                    value={tradeDetails}
                                                    onChange={(e) => setTradeDetails(e.target.value)}
                                                    placeholder="Descreva o carro da troca (Modelo, Ano, KM, Condição)..."
                                                    className="w-full p-6 bg-[#FAFAFA] border-2 border-transparent rounded-[2rem] text-sm font-bold placeholder:text-zinc-200 focus:bg-white focus:border-primary/20 outline-none transition-all shadow-inner min-h-[120px]"
                                                />
                                            </motion.div>
                                        )}
                                    </div>

                                    <div className="bg-amber-50 rounded-2xl p-4 flex gap-3 border border-amber-100/50">
                                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                        <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                                            Sua proposta será enviada para análise do lojista. Lembre-se que ofertas absurdas podem comprometer sua reputação na rede.
                                        </p>
                                    </div>

                                    {/* Footer Actions */}
                                    <button
                                        type="submit"
                                        disabled={!amount}
                                        className="w-full h-16 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-zinc-900/20 flex items-center justify-center gap-3 active:scale-95 group disabled:opacity-50"
                                    >
                                        Confirmar e Enviar
                                        <Send className="w-4 h-4 text-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                    </button>
                                </form>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
