import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Car, CheckCircle2, Loader2, Zap, Gauge, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fipeService, FipeItem } from '@/services/fipeService'
import { supabase } from '@/lib/supabase'
import Select from 'react-select'
import imageCompression from 'browser-image-compression'
import { useAuthStore } from '@/store/useAuthStore'

interface VehicleFormProps {
    isOpen: boolean
    onClose: () => void
    initialData?: any
}

const customSelectStyles = {
    control: (base: any, state: any) => ({
        ...base,
        backgroundColor: '#FAFAFA',
        border: '2px solid transparent',
        borderColor: state.isFocused ? '#F0A727' : 'transparent',
        borderRadius: '1.25rem',
        padding: '0.6rem 0.8rem',
        fontSize: '14px',
        fontWeight: '700',
        boxShadow: state.isFocused ? '0 0 0 4px rgba(240, 167, 39, 0.05)' : 'none',
        '&:hover': {
            backgroundColor: '#fff',
            borderColor: 'rgba(240, 167, 39, 0.1)'
        }
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected ? '#0C0C0C' : state.isFocused ? '#FAFAFA' : 'transparent',
        color: state.isSelected ? '#fff' : '#0C0C0C',
        fontWeight: '700',
        fontSize: '13px',
        padding: '12px 20px',
        '&:active': {
            backgroundColor: '#0C0C0C',
            color: '#fff'
        }
    }),
    menu: (base: any) => ({
        ...base,
        borderRadius: '1.5rem',
        overflow: 'hidden',
        border: '2px solid #FAFAFA',
        boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
    }),
    placeholder: (base: any) => ({
        ...base,
        color: '#A1A1AA',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontSize: '11px',
        fontWeight: '900'
    })
}

const formatCurrency = (value: string) => {
    let raw = value.replace(/\D/g, '');
    let numeric = parseInt(raw) / 100;
    if (isNaN(numeric)) return '';
    return numeric.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const formatMileage = (value: string) => {
    let raw = value.replace(/\D/g, '');
    if (!raw) return '';
    return parseInt(raw).toLocaleString('pt-BR');
};

export function VehicleForm({ isOpen, onClose, initialData }: VehicleFormProps) {
    const { user } = useAuthStore()
    const [brands, setBrands] = useState<FipeItem[]>([])
    const [models, setModels] = useState<FipeItem[]>([])
    const [years, setYears] = useState<FipeItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<number | null>(null)

    const [formData, setFormData] = useState({
        brandId: '',
        make: '',
        modelId: '',
        model: '',
        yearId: '',
        year: '',
        price_repasse: '',
        price_fipe: '',
        mileage: '',
        description: '',
        color: '',
        transmission: '',
        fuel_type: '',
        images: [] as string[]
    })

    useEffect(() => {
        if (isOpen) {
            fipeService.getBrands().then(setBrands).catch(console.error)

            if (initialData) {
                const initialForm = {
                    brandId: initialData.brandId || '',
                    make: initialData.make || '',
                    modelId: initialData.modelId || '',
                    model: initialData.model || '',
                    yearId: initialData.yearId || '',
                    year: initialData.year?.toString() || '',
                    price_repasse: initialData.price_repasse ? initialData.price_repasse.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
                    price_fipe: initialData.price_fipe ? (typeof initialData.price_fipe === 'number' ? initialData.price_fipe.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : initialData.price_fipe) : '',
                    mileage: initialData.mileage ? initialData.mileage.toLocaleString('pt-BR') : '',
                    description: initialData.description || '',
                    color: initialData.color || '',
                    transmission: initialData.transmission || '',
                    fuel_type: initialData.fuel_type || '',
                    images: initialData.images || []
                }
                setFormData(initialForm)

                // Forçar busca de IDs baseada nos nomes se IDs vierem vazios (caso comum em edições)
                fipeService.getBrands().then(allBrands => {
                    setBrands(allBrands)
                    if (!initialData.brandId && initialData.make) {
                        const foundBrand = allBrands.find(b => b.name.toLowerCase() === initialData.make.toLowerCase())
                        if (foundBrand) {
                            setFormData(prev => ({ ...prev, brandId: foundBrand.code }))
                            fipeService.getModels(foundBrand.code).then(allModels => {
                                setModels(allModels)
                                if (!initialData.modelId && initialData.model) {
                                    const foundModel = allModels.find(m => m.name.toLowerCase() === initialData.model.toLowerCase())
                                    if (foundModel) {
                                        setFormData(prev => ({ ...prev, modelId: foundModel.code }))
                                        fipeService.getYears(foundBrand.code, foundModel.code).then(setYears).catch(console.error)
                                    }
                                }
                            }).catch(console.error)
                        }
                    }
                }).catch(console.error)
            } else {
                setFormData({
                    brandId: '',
                    make: '',
                    modelId: '',
                    model: '',
                    yearId: '',
                    year: '',
                    price_repasse: '',
                    price_fipe: '',
                    mileage: '',
                    description: '',
                    color: '',
                    transmission: '',
                    fuel_type: '',
                    images: []
                })
            }
        }
    }, [isOpen, initialData])

    const handleBrandChange = async (option: any) => {
        if (!option) return;
        setFormData(prev => ({ ...prev, brandId: option.value, make: option.label, modelId: '', model: '', yearId: '', year: '' }))
        setIsLoading(true)
        try {
            const data = await fipeService.getModels(option.value)
            setModels(data)
        } finally {
            setIsLoading(false)
        }
    }

    const handleModelChange = async (option: any) => {
        if (!option) return;
        setFormData(prev => ({ ...prev, modelId: option.value, model: option.label, yearId: '', year: '' }))
        setIsLoading(true)
        try {
            const data = await fipeService.getYears(formData.brandId, option.value)
            setYears(data)
        } finally {
            setIsLoading(false)
        }
    }

    const handleYearChange = async (option: any) => {
        if (!option) return;
        setIsLoading(true)
        try {
            const info = await fipeService.getVehicleInfo(formData.brandId, formData.modelId, option.value)
            setFormData(prev => ({ ...prev, yearId: option.value, year: option.label, price_fipe: info.price }))
        } finally {
            setIsLoading(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0 || formData.images.length + files.length > 8) return

        setIsLoading(true)
        setUploadProgress(0)

        try {
            const newImages = [...formData.images]
            for (const file of files) {
                const compressed = await imageCompression(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1600 })
                const fileExt = compressed.name.split('.').pop() || 'jpg'
                const filePath = `vehicles/${Math.random()}.${fileExt}`

                await supabase.storage.from('vehicle_images').upload(filePath, compressed)
                const { data: { publicUrl } } = supabase.storage.from('vehicle_images').getPublicUrl(filePath)
                newImages.push(publicUrl)
                setUploadProgress(Math.round((newImages.length / (formData.images.length + files.length)) * 100))
            }
            setFormData(p => ({ ...p, images: newImages }))
        } catch (error) {
            console.error('Upload error:', error)
        } finally {
            setIsLoading(false)
            setUploadProgress(null)
        }
    }

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isSubmitting || !user) return
        setIsSubmitting(true)
        try {
            const cleanPrice = formData.price_repasse.replace(/\./g, '').replace(',', '.')
            const cleanMileage = formData.mileage.replace(/\./g, '')

            if (initialData?.id) {
                // Update
                const { error } = await supabase
                    .from('vehicles')
                    .update({
                        make: formData.make,
                        model: formData.model,
                        year: parseInt(formData.year) || initialData.year,
                        price_repasse: parseFloat(cleanPrice) || 0,
                        mileage: parseInt(cleanMileage) || 0,
                        images: formData.images,
                        description: formData.description,
                        color: formData.color,
                        transmission: formData.transmission,
                        fuel_type: formData.fuel_type,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', initialData.id)

                if (error) throw error
            } else {
                // Insert
                const { error } = await supabase.from('vehicles').insert([{
                    make: formData.make,
                    model: formData.model,
                    year: parseInt(formData.year) || 2024,
                    price_repasse: parseFloat(cleanPrice) || 0,
                    mileage: parseInt(cleanMileage) || 0,
                    images: formData.images,
                    description: formData.description,
                    color: formData.color,
                    transmission: formData.transmission,
                    fuel_type: formData.fuel_type,
                    status: 'available',
                    seller_id: user.id
                }])

                if (error) throw error
            }

            onClose()
            // reload logic might need to be replaced with query invalidation
            // but for now keeping consistency with existing code
            if (!initialData) {
                window.location.reload()
            }
        } catch (error) {
            console.error('Submit error:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-[250] p-4 sm:p-6 bg-zinc-950/40 backdrop-blur-xl">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="bg-white rounded-[4rem] w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.25)] border-4 border-zinc-50"
                    >
                        {/* Header */}
                        <div className="px-12 py-10 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-zinc-900 rounded-[1.5rem] flex items-center justify-center text-primary shadow-xl shadow-zinc-900/10">
                                    <Car className="w-7 h-7" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-zinc-800 leading-none mb-1.5">
                                        {initialData ? 'Editar Repasse' : 'Anunciar Repasse'}
                                    </h2>
                                    <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest leading-none">
                                        {initialData ? 'Atualize as informações do seu veículo' : 'Preencha os dados do veículo para publicar na rede'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-zinc-100 text-zinc-400 hover:text-zinc-800 hover:border-zinc-200 transition-all shadow-sm active:scale-95"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-12">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                                {/* Left Column: Basic Info */}
                                <div className="lg:col-span-5 space-y-10">
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                            <span className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-800">Dados do Veículo</span>
                                        </div>

                                        <div className="grid gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Marca</label>
                                                <Select
                                                    styles={customSelectStyles}
                                                    placeholder="Selecione a Marca"
                                                    options={brands.map(b => ({ value: b.code, label: b.name }))}
                                                    value={formData.brandId ? { value: formData.brandId, label: formData.make } : formData.make ? { value: '', label: formData.make } : null}
                                                    onChange={handleBrandChange}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Modelo Completo</label>
                                                <Select
                                                    styles={customSelectStyles}
                                                    placeholder="Selecione o Modelo"
                                                    options={models.map(m => ({ value: m.code, label: m.name }))}
                                                    value={formData.modelId ? { value: formData.modelId, label: formData.model } : formData.model ? { value: '', label: formData.model } : null}
                                                    onChange={handleModelChange}
                                                    isDisabled={(!formData.brandId && !formData.make) || isLoading}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Ano Modelo</label>
                                                <Select
                                                    styles={customSelectStyles}
                                                    placeholder="Selecione o Ano"
                                                    options={years.map(y => ({ value: y.code, label: y.name }))}
                                                    value={formData.yearId ? { value: formData.yearId, label: formData.year } : formData.year ? { value: '', label: formData.year } : null}
                                                    onChange={handleYearChange}
                                                    isDisabled={(!formData.modelId && !formData.model) || isLoading}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8 pt-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                            <span className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-800">Valores e Condição</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Preço Repasse</label>
                                                <div className="relative group">
                                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300 font-black text-sm group-focus-within:text-primary transition-colors">R$</span>
                                                    <input
                                                        placeholder="0,00"
                                                        className="w-full pl-14 pr-6 py-5 bg-zinc-50 border-2 border-transparent rounded-2xl text-[16px] font-black text-zinc-800 focus:bg-white focus:border-primary/20 outline-none transition-all shadow-sm"
                                                        type="text"
                                                        value={formData.price_repasse}
                                                        onChange={e => setFormData(p => ({ ...p, price_repasse: formatCurrency(e.target.value) }))}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Quilometragem</label>
                                                <div className="relative group">
                                                    <Gauge className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                                                    <input
                                                        placeholder="Ex: 45.000"
                                                        className="w-full pl-14 pr-6 py-5 bg-zinc-50 border-2 border-transparent rounded-2xl text-[16px] font-black text-zinc-800 focus:bg-white focus:border-primary/20 outline-none transition-all shadow-sm"
                                                        type="text"
                                                        value={formData.mileage}
                                                        onChange={e => setFormData(p => ({ ...p, mileage: formatMileage(e.target.value) }))}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Cor</label>
                                                <input
                                                    placeholder="Ex: Branco Pérola"
                                                    className="w-full px-6 py-5 bg-zinc-50 border-2 border-transparent rounded-2xl text-[14px] font-bold text-zinc-800 focus:bg-white focus:border-primary/20 outline-none transition-all shadow-sm"
                                                    type="text"
                                                    value={formData.color}
                                                    onChange={e => setFormData(p => ({ ...p, color: e.target.value }))}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Câmbio</label>
                                                <Select
                                                    styles={customSelectStyles}
                                                    placeholder="Selecione"
                                                    options={[
                                                        { value: 'Automático', label: 'Automático' },
                                                        { value: 'Manual', label: 'Manual' },
                                                        { value: 'CVT', label: 'CVT' }
                                                    ]}
                                                    value={formData.transmission ? { value: formData.transmission, label: formData.transmission } : null}
                                                    onChange={(opt: any) => setFormData(p => ({ ...p, transmission: opt?.value }))}
                                                />
                                            </div>
                                        </div>

                                        {formData.price_fipe && (
                                            <div className="p-6 bg-orange-50/30 rounded-[2rem] border-2 border-orange-100 flex items-center justify-between shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black text-orange-900/40 uppercase tracking-widest block mb-0.5">Referência Fipe</span>
                                                        <span className="text-sm font-black text-orange-900 uppercase tracking-tighter">Valor de Mercado</span>
                                                    </div>
                                                </div>
                                                <span className="text-xl font-black text-primary tracking-tighter">R$ {formData.price_fipe}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column: Media and Description */}
                                <div className="lg:col-span-7 space-y-10">
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                                <span className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-800">Galeria de Fotos ({formData.images.length}/8)</span>
                                            </div>
                                            {isLoading && (
                                                <div className="flex items-center gap-3 px-4 py-2 bg-orange-50 rounded-full border border-orange-100 animate-pulse">
                                                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Enviando {uploadProgress}%</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-4 gap-4">
                                            {formData.images.map((img, i) => (
                                                <div key={i} className="group relative aspect-square rounded-[1.5rem] overflow-hidden border-2 border-zinc-100 shadow-sm bg-zinc-50">
                                                    <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeImage(i)}
                                                            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 transition-all shadow-xl active:scale-90"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {formData.images.length < 8 && (
                                                <label className={cn(
                                                    "border-4 border-dashed rounded-[1.5rem] flex flex-col items-center justify-center cursor-pointer aspect-square bg-[#FAFAFA] hover:bg-white hover:border-primary/30 hover:shadow-xl transition-all group relative overflow-hidden",
                                                    formData.images.length === 0 ? "border-red-100" : "border-zinc-100"
                                                )}>
                                                    <div className="w-12 h-12 bg-white rounded-[1rem] flex items-center justify-center text-zinc-300 group-hover:text-primary shadow-sm transition-all group-hover:rotate-12 mb-3">
                                                        <Camera className="w-6 h-6" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-zinc-400 group-hover:text-primary uppercase tracking-widest">
                                                        {formData.images.length === 0 ? 'Obrigatório' : 'Adicionar'}
                                                    </span>
                                                    <input type="file" multiple className="hidden" onChange={handleImageUpload} />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                            <span className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-800">Detalhes Adicionais</span>
                                        </div>
                                        <textarea
                                            placeholder="Descreva o estado do veículo, laudo cautelar, detalhes de pneus, teto solar, ou observações importantes de repasse..."
                                            className="w-full p-10 bg-[#FAFAFA] border-2 border-transparent rounded-[3rem] text-[16px] font-medium text-zinc-800 focus:bg-white focus:border-primary/20 outline-none transition-all shadow-sm h-56 resize-none placeholder:text-zinc-300 italic leading-relaxed"
                                            value={formData.description}
                                            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="px-12 py-10 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                            <div className="hidden lg:flex items-center gap-6 max-w-xl">
                                <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-300 flex-shrink-0">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                                    Ao publicar o anúncio, você confirma que todas as informações são <span className="text-zinc-800 font-black">verídicas</span> e o veículo possui procedência garantida.
                                </p>
                            </div>
                            <div className="flex items-center gap-6 ml-auto">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-10 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-800 transition-colors"
                                >
                                    Descartar
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !formData.year || !formData.price_repasse || !user || formData.images.length === 0}
                                    className="px-16 py-6 bg-[#0C0C0C] text-primary rounded-3xl flex items-center justify-center gap-4 text-sm font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-[0_20px_50px_rgba(0,0,0,0.2)] group disabled:opacity-50 disabled:grayscale active:scale-95 whitespace-nowrap"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            {initialData ? 'Salvar Alterações' : 'Publicar Anúncio'}
                                            <Zap className="w-5 h-5 fill-primary group-hover:scale-125 group-hover:-rotate-12 transition-transform duration-300" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

function ShieldCheck(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
