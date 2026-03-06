import { X, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFilterStore } from '@/store/useFilterStore'

interface FilterDrawerProps {
    isOpen: boolean
    onClose: () => void
}

const MAKES = ['Audi', 'BMW', 'Chevrolet', 'Fiat', 'Ford', 'Honda', 'Hyundai', 'Jeep', 'Mercedes-Benz', 'Nissan', 'Porsche', 'Toyota', 'Volkswagen', 'Volvo']
const TRANSMISSIONS = ['Automático', 'Manual', 'CVT', 'Dualogic']

export function FilterDrawer({ isOpen, onClose }: FilterDrawerProps) {
    const { filters, setFilter, clearFilters, activeFiltersCount } = useFilterStore()

    const handleClear = () => {
        clearFilters()
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 lg:hidden"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[60] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tighter">Filtros</h2>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                                    {activeFiltersCount()} filtros ativos
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10">
                            {/* Make & Model */}
                            <div className="space-y-6">
                                <p className="text-[11px] font-black text-zinc-800 uppercase tracking-[0.2em]">Marca e Modelo</p>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Marca</label>
                                        <select
                                            value={filters.make}
                                            onChange={(e) => setFilter('make', e.target.value)}
                                            className="w-full px-5 py-4 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-primary/20 outline-none transition-all appearance-none"
                                        >
                                            <option value="">Todas as marcas</option>
                                            {MAKES.map(make => (
                                                <option key={make} value={make}>{make}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Modelo</label>
                                        <input
                                            type="text"
                                            value={filters.model}
                                            onChange={(e) => setFilter('model', e.target.value)}
                                            placeholder="Ex: Civic, Golf..."
                                            className="w-full px-5 py-4 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold placeholder:text-zinc-300 focus:bg-white focus:border-primary/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Price Range */}
                            <div className="space-y-6">
                                <p className="text-[11px] font-black text-zinc-800 uppercase tracking-[0.2em]">Faixa de Preço</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Mínimo</label>
                                        <input
                                            type="number"
                                            value={filters.minPrice}
                                            onChange={(e) => setFilter('minPrice', e.target.value)}
                                            placeholder="R$ 0"
                                            className="w-full px-5 py-4 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-primary/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Máximo</label>
                                        <input
                                            type="number"
                                            value={filters.maxPrice}
                                            onChange={(e) => setFilter('maxPrice', e.target.value)}
                                            placeholder="R$ 1M+"
                                            className="w-full px-5 py-4 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-primary/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Year Range */}
                            <div className="space-y-6">
                                <p className="text-[11px] font-black text-zinc-800 uppercase tracking-[0.2em]">Ano</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">De</label>
                                        <input
                                            type="number"
                                            value={filters.minYear}
                                            onChange={(e) => setFilter('minYear', e.target.value)}
                                            placeholder="2010"
                                            className="w-full px-5 py-4 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-primary/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Até</label>
                                        <input
                                            type="number"
                                            value={filters.maxYear}
                                            onChange={(e) => setFilter('maxYear', e.target.value)}
                                            placeholder="2024"
                                            className="w-full px-5 py-4 bg-zinc-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-primary/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Transmission */}
                            <div className="space-y-6">
                                <p className="text-[11px] font-black text-zinc-800 uppercase tracking-[0.2em]">Câmbio</p>
                                <div className="flex flex-wrap gap-2">
                                    {TRANSMISSIONS.map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setFilter('transmission', filters.transmission === t ? '' : t)}
                                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filters.transmission === t
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                                : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-zinc-100 bg-zinc-50/50 space-y-4">
                            <button
                                onClick={onClose}
                                className="w-full py-5 bg-zinc-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl shadow-zinc-900/10 hover:bg-zinc-800 transition-all active:scale-95"
                            >
                                Aplicar Filtros
                            </button>
                            <button
                                onClick={handleClear}
                                className="w-full py-4 bg-white border-2 border-zinc-100 text-zinc-400 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:text-zinc-800 hover:border-zinc-200 transition-all active:scale-95"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Limpar Tudo
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
