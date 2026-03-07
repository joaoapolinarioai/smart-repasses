import React, { useState, useEffect, useCallback } from 'react'
import { Phone, Loader2, Camera, CheckCircle2, User, MapPin, AtSign, Info, Move, Save, Pencil, Layout, Globe, MessageSquare, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { motion, AnimatePresence } from 'framer-motion'
import imageCompression from 'browser-image-compression'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import localidades from '@/data/locations.json';

// Define the type based on our json structure
type Localidade = {
    n: string;
    u: string;
};

const phoneMask = (value: string) => {
    let raw = value.replace(/\D/g, '');
    if (raw.length > 11) raw = raw.slice(0, 11);

    if (raw.length === 0) return '';
    if (raw.length <= 2) return `(${raw}`;
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
};

export function ProfilePage() {
    const { profile, setProfile } = useAuthStore()
    const [isSaving, setIsSaving] = useState(false)
    const [isAdjustingCover, setIsAdjustingCover] = useState(false)
    const [formData, setFormData] = useState({
        full_name: '',
        username: '',
        store_name: '',
        phone: '',
        city: '',
        state: '',
        avatar_url: '',
        bio: '',
        cover_url: '',
        cover_position_y: 50,
        cover_zoom: 100
    })

    const [isUploading, setIsUploading] = useState<{ avatar: boolean, cover: boolean }>({
        avatar: false,
        cover: false
    })

    // Location States
    const allCities = (localidades as Localidade[]).map(loc => ({
        nome: loc.n,
        uf: loc.u
    }));
    const [isLoadingCities, setIsLoadingCities] = useState(false)
    const [searchCity, setSearchCity] = useState('');

    const fetchCities = useCallback(() => {
        // No-op, data is already local
        setIsLoadingCities(false);
    }, []);

    // Fetch ALL Cities on Mount
    useEffect(() => {
        fetchCities();
    }, [fetchCities]);

    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // Check if the input exactly matches one of the datalist formats "City - UF"
        const matchedCity = allCities.find(c => `${c.nome} - ${c.uf}` === value);

        if (matchedCity) {
            // User selected an option from the list
            setFormData(prev => ({ ...prev, city: matchedCity.nome, state: matchedCity.uf }));
            setSearchCity(`${matchedCity.nome} - ${matchedCity.uf}`);
        } else {
            // User is just typing
            setSearchCity(value);
            // We don't clear the formData.city/state immediately to allow partial typing
            // without losing data if they blur, but you could if you want strict matching.
            // Usually, it's safer to only set formData on a full match.
            setFormData(prev => ({ ...prev, city: value, state: '' })); // Update city as user types, clear state
        }
    };

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                username: profile.username || '',
                store_name: profile.store_name || '',
                phone: profile.phone || '',
                city: profile.city || '',
                state: profile.state || '',
                avatar_url: profile.avatar_url || '',
                bio: profile.bio || '',
                cover_url: profile.cover_url || '',
                cover_position_y: profile.cover_position_y || 50,
                cover_zoom: profile.cover_zoom || 100
            })
            if (profile.city && profile.state) {
                setSearchCity(`${profile.city} - ${profile.state}`);
            } else if (profile.city) {
                setSearchCity(profile.city);
            }
            if (profile.cover_position_y !== undefined) {
                setFormData(prev => ({ ...prev, cover_position_y: profile.cover_position_y }));
            }
            if (profile.cover_zoom !== undefined) {
                setFormData(prev => ({ ...prev, cover_zoom: profile.cover_zoom }));
            }
        }
    }, [profile])

    const isNameLocked = (profile?.name_changes_count || 0) >= 1
    const isUsernameLocked = (profile?.username_changes_count || 0) >= 1

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(prev => ({ ...prev, [type]: true }))

        try {
            const options = {
                maxSizeMB: 0.4,
                maxWidthOrHeight: type === 'avatar' ? 500 : 2000,
                useWebWorker: true,
                initialQuality: 0.8
            }

            const compressedFile = await imageCompression(file, options)
            const fileExt = compressedFile.name.split('.').pop() || 'jpg'
            const fileName = `${profile?.id || 'guest'}_${type}_${Date.now()}.${fileExt}`
            const filePath = `profiles/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('profile_images')
                .upload(filePath, compressedFile)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('profile_images')
                .getPublicUrl(filePath)

            setFormData(prev => ({ ...prev, [type === 'avatar' ? 'avatar_url' : 'cover_url']: publicUrl }))
            if (type === 'cover') setIsAdjustingCover(true)
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error('Erro ao enviar imagem: ' + error.message)
        } finally {
            setIsUploading(prev => ({ ...prev, [type]: false }))
        }
    }

    const handleSubmit = async () => {
        setIsSaving(true)
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            const userId = authUser?.id || profile?.id

            const updates: any = {
                store_name: formData.store_name,
                phone: formData.phone,
                city: formData.city,
                state: formData.state,
                bio: formData.bio,
                avatar_url: formData.avatar_url,
                cover_url: formData.cover_url,
                cover_position_y: formData.cover_position_y,
                cover_zoom: formData.cover_zoom,
                updated_at: new Date().toISOString()
            }

            if (!isNameLocked && formData.full_name !== (profile?.full_name || '')) {
                updates.full_name = formData.full_name
                updates.name_changes_count = (profile?.name_changes_count || 0) + 1
            }

            if (!isUsernameLocked && formData.username !== (profile?.username || '')) {
                updates.username = formData.username.toLowerCase().trim()
                updates.username_changes_count = (profile?.username_changes_count || 0) + 1
            }

            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId)
                .select()
                .single()

            if (error) throw error
            setProfile(data)
            setIsAdjustingCover(false)
            toast.success('Perfil salvo com sucesso!')
        } catch (error: any) {
            console.error('Update error:', error)
            toast.error('Erro ao salvar: ' + (error.message || 'Erro desconhecido'))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F0F2F5] pb-32">
            {/* Header / Brand Bar */}
            <div className="bg-zinc-900 pt-12 lg:pt-16 pb-20 lg:pb-24 px-4 lg:px-6 overflow-hidden relative">
                <div className="max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 lg:gap-6 text-center md:text-left">
                    <div className="space-y-2">
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                                <Layout className="w-5 h-5 text-black" />
                            </div>
                            <h1 className="text-xl lg:text-2xl font-[950] text-white uppercase tracking-tighter leading-none">Estúdio de Perfil</h1>
                        </div>
                        <p className="text-zinc-500 text-[8px] lg:text-[10px] font-black uppercase tracking-widest px-4 md:px-0">Configure a identidade visual e informações da sua loja</p>
                    </div>
                </div>
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
            </div>

            <div className="max-w-5xl mx-auto -mt-16 px-6 space-y-8 relative z-20">
                {/* Completion Banner */}
                {(!formData.username || !formData.phone || (!formData.city || !formData.state)) && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#0C0C0C] rounded-[2.5rem] p-8 shadow-2xl shadow-black/20 border border-white/5 relative overflow-hidden group"
                    >
                        {/* Background Glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[60px] rounded-full group-hover:bg-amber-500/20 transition-all" />

                        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                            <div className="w-16 h-16 bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl flex items-center justify-center shrink-0 text-amber-500">
                                <ShieldAlert className="w-8 h-8 animate-pulse" />
                            </div>
                            <div className="flex-1 space-y-2 text-center md:text-left">
                                <h2 className="text-xl font-[950] text-white uppercase tracking-tighter">Complete seu Estúdio</h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 leading-relaxed">
                                    Preencha os campos obrigatórios para liberar o marketplace:
                                </p>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                                    {!formData.username && (
                                        <div className="bg-zinc-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#F0A727] border border-white/5">
                                            @usuário
                                        </div>
                                    )}
                                    {!formData.phone && (
                                        <div className="bg-zinc-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#F0A727] border border-white/5">
                                            WhatsApp
                                        </div>
                                    )}
                                    {(!formData.city || !formData.state) && (
                                        <div className="bg-zinc-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#F0A727] border border-white/5">
                                            Localização
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Visual Identity Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Banner Setup */}
                    <div className="lg:col-span-8 bg-white rounded-[2.5rem] shadow-xl shadow-zinc-200/50 border border-zinc-100 overflow-hidden">
                        <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Camera className="w-5 h-5 text-primary" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-zinc-900">Imagem de Capa (Banner)</span>
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="h-64 rounded-3xl relative overflow-hidden bg-zinc-100 group">
                                <img
                                    src={formData.cover_url || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=2000'}
                                    className="w-full h-full object-cover"
                                    style={{
                                        objectPosition: `center ${formData.cover_position_y}%`,
                                        transform: `scale(${formData.cover_zoom / 100})`
                                    }}
                                    alt="Preview Capa"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-wrap items-center justify-center gap-4 p-4">
                                    <label className="px-6 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-primary transition-colors flex items-center gap-2">
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} disabled={isUploading.cover} />
                                        {isUploading.cover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                                        {formData.cover_url ? 'Mudar Foto' : 'Adicionar Foto'}
                                    </label>
                                    {formData.cover_url && (
                                        <>
                                            <button
                                                onClick={() => setIsAdjustingCover(true)}
                                                className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors flex items-center gap-2"
                                            >
                                                <Move className="w-4 h-4" />
                                                Ajustar Visão
                                            </button>
                                            <button
                                                onClick={() => setFormData(f => ({ ...f, cover_url: '' }))}
                                                className="px-6 py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors flex items-center gap-2"
                                            >
                                                Remover
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <p className="mt-4 text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                                Recomendamos imagens em alta resolução (mínimo 1500px). <br />Use o ajuste para enquadrar perfeitamente a sua marca.
                            </p>
                        </div>

                        {/* Adjustment Controls Inner */}
                        <AnimatePresence>
                            {isAdjustingCover && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-zinc-50 border-t border-zinc-100 overflow-hidden"
                                >
                                    <div className="p-10 space-y-8">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Ajuste de Enquadramento</h4>
                                            <button onClick={() => setIsAdjustingCover(false)} className="text-[9px] font-black uppercase text-zinc-400 hover:text-black">Concluir</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <div className="space-y-5">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                                    <span>Posição Vertical</span>
                                                    <span>{formData.cover_position_y}%</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="100"
                                                    value={formData.cover_position_y}
                                                    onChange={(e) => setFormData(f => ({ ...f, cover_position_y: parseInt(e.target.value) }))}
                                                    className="w-full accent-primary h-1.5 bg-zinc-200 rounded-full appearance-none"
                                                />
                                            </div>
                                            <div className="space-y-5">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                                    <span>Zoom da Imagem</span>
                                                    <span>{formData.cover_zoom}%</span>
                                                </div>
                                                <input
                                                    type="range" min="100" max="150"
                                                    value={formData.cover_zoom}
                                                    onChange={(e) => setFormData(f => ({ ...f, cover_zoom: parseInt(e.target.value) }))}
                                                    className="w-full accent-primary h-1.5 bg-zinc-200 rounded-full appearance-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Avatar Setup */}
                    <div className="lg:col-span-4 bg-white rounded-[2.5rem] shadow-xl shadow-zinc-200/50 border border-zinc-100 flex flex-col items-center p-10 space-y-8">
                        <div className="text-center space-y-2">
                            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-900 block">Foto de Perfil</span>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Logo ou Foto Pessoal</span>
                        </div>

                        <div className="relative group">
                            <div className="w-48 h-48 rounded-[3.5rem] bg-zinc-900 border-[10px] border-zinc-50 shadow-inner overflow-hidden flex items-center justify-center relative">
                                {formData.avatar_url ? (
                                    <img src={formData.avatar_url} className="w-full h-full object-cover" alt="Perfil" />
                                ) : (
                                    <div className="text-6xl font-black text-primary uppercase">
                                        {formData.store_name?.[0] || '?'}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2 text-white">
                                    <label className="flex flex-col items-center gap-2 cursor-pointer hover:text-primary transition-colors p-4">
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} disabled={isUploading.avatar} />
                                        {isUploading.avatar ? <Loader2 className="w-8 h-8 animate-spin" /> : <Camera className="w-8 h-8" />}
                                        <span className="text-[9px] font-black uppercase">{formData.avatar_url ? 'Trocar Foto' : 'Adicionar Foto'}</span>
                                    </label>
                                    {formData.avatar_url && (
                                        <button
                                            onClick={() => setFormData(f => ({ ...f, avatar_url: '' }))}
                                            className="mt-1 text-[9px] font-black uppercase text-red-400 hover:text-red-300"
                                        >
                                            Remover
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-zinc-100">
                                <CheckCircle2 className="w-6 h-6 text-primary" />
                            </div>
                        </div>

                        <p className="text-center text-[9px] font-medium text-zinc-400 leading-relaxed max-w-[200px]">
                            Seu avatar será exibido em todos os anúncios e chats da rede.
                        </p>
                    </div>
                </div>

                {/* Identity Form Section */}
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-zinc-200/50 border border-zinc-100 p-10 md:p-14 space-y-12">

                    {/* Basic Info */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-900">Informações de Identidade</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                            {/* Store Name */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    Nome da Loja <span className="text-primary">*</span>
                                </label>
                                <div className="group relative">
                                    <input
                                        className="w-full bg-zinc-50 border-2 border-transparent rounded-2xl px-6 py-5 font-bold text-zinc-800 outline-none focus:bg-white focus:border-primary/20 transition-all text-lg shadow-sm"
                                        value={formData.store_name}
                                        onChange={(e) => setFormData(f => ({ ...f, store_name: e.target.value }))}
                                        placeholder="Ex: Smart Premium Auto"
                                    />
                                    <Pencil className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-200 group-hover:text-primary transition-colors" />
                                </div>
                            </div>

                            {/* Username */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    Identidade Digital (@username)
                                    {isUsernameLocked && (
                                        <span title="Definido permanentemente">
                                            <Info className="w-3 h-3 text-zinc-300 cursor-help" />
                                        </span>
                                    )}
                                </label>
                                <div className="relative group">
                                    <AtSign className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-50" />
                                    <input
                                        disabled={isUsernameLocked}
                                        className={cn(
                                            "w-full pl-14 pr-6 py-5 bg-zinc-50 border-2 border-transparent rounded-2xl font-bold text-zinc-800 outline-none focus:bg-white focus:border-primary/20 transition-all text-lg shadow-sm uppercase tracking-widest",
                                            isUsernameLocked && "opacity-60 cursor-not-allowed grayscale"
                                        )}
                                        value={formData.username}
                                        onChange={(e) => setFormData(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                                        placeholder="seu_usuario"
                                    />
                                </div>
                            </div>

                            {/* Owner Name */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Responsável Legal</label>
                                <div className="relative group">
                                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 group-focus-within:text-primary transition-colors" />
                                    <input
                                        disabled={isNameLocked}
                                        className={cn(
                                            "w-full pl-14 pr-6 py-5 bg-zinc-50 border-2 border-transparent rounded-2xl font-bold text-zinc-800 outline-none focus:bg-white focus:border-primary/20 transition-all text-lg shadow-sm",
                                            isNameLocked && "opacity-60 cursor-not-allowed"
                                        )}
                                        value={formData.full_name}
                                        onChange={(e) => setFormData(f => ({ ...f, full_name: e.target.value }))}
                                        placeholder="Nome Completo"
                                    />
                                </div>
                            </div>

                            {/* Bio / Description */}
                            <div className="space-y-3 md:col-span-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Apresentação da Loja (Bio)</label>
                                <div className="relative group">
                                    <textarea
                                        className="w-full bg-zinc-50 border-2 border-transparent rounded-[2rem] px-8 py-8 font-medium text-zinc-600 outline-none focus:bg-white focus:border-primary/20 transition-all text-lg shadow-sm resize-none min-h-[160px] leading-relaxed italic"
                                        value={formData.bio}
                                        onChange={(e) => setFormData(f => ({ ...f, bio: e.target.value }))}
                                        placeholder="Descreva a história e especialidade da sua loja..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-zinc-100 w-full" />

                    {/* Contact & Location */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-900">Contato & Localização</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Phone */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">WhatsApp Comercial</label>
                                <div className="relative group">
                                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                                    <input
                                        className="w-full pl-14 pr-6 py-5 bg-zinc-50 border-2 border-transparent rounded-2xl font-bold text-zinc-800 outline-none focus:bg-white focus:border-primary/20 transition-all text-lg shadow-sm"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(f => ({ ...f, phone: phoneMask(e.target.value) }))}
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                    />
                                </div>
                            </div>

                            {/* Unified Location Search */}
                            <div className="md:col-span-3 space-y-3">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    Localização (Cidade e Estado) <span className="text-primary">*</span>
                                </label>
                                <div className="relative group">
                                    <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                                    <input
                                        list="all-locations-list"
                                        className="w-full pl-14 pr-6 py-5 bg-zinc-50 border-2 border-transparent rounded-2xl font-bold text-zinc-800 outline-none focus:bg-white focus:border-primary/20 transition-all text-lg shadow-sm"
                                        value={searchCity}
                                        onChange={handleLocationChange}
                                        placeholder={isLoadingCities ? "Carregando cidades..." : "Ex: Guarujá - SP"}
                                    />
                                    <datalist id="all-locations-list">
                                        {allCities
                                            .filter(c => `${c.nome} - ${c.uf}`.toLowerCase().includes(searchCity.toLowerCase()))
                                            .slice(0, 50)
                                            .map((city, idx) => (
                                                <option key={`${city.nome}-${city.uf}-${idx}`} value={`${city.nome} - ${city.uf}`} />
                                            ))}
                                    </datalist>
                                    {isLoadingCities && <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
                                </div>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">
                                    Dica: Digite apenas o nome da cidade e selecione na lista para preencher tudo automaticamente.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="pt-8 mb-4 border-t border-zinc-200/50 flex flex-col items-center">
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="px-16 py-5 bg-primary text-black rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/30 active:translate-y-0 transition-all disabled:opacity-50 w-full md:w-auto overflow-hidden relative group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin relative z-10" /> : <Save className="w-5 h-5 relative z-10" />}
                        <span className="relative z-10">{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                    </button>
                    <p className="mt-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">
                        Ao salvar, suas informações serão atualizadas em todos os anúncios.
                    </p>
                </div>

                <footer className="py-12 flex flex-col items-center gap-6 opacity-40">
                    <div className="flex items-center gap-10">
                        <div className="flex items-center gap-2 group cursor-pointer hover:text-primary transition-colors">
                            <Globe className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Painel Principal</span>
                        </div>
                        <div className="flex items-center gap-2 group cursor-pointer hover:text-primary transition-colors">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Suporte Técnico</span>
                        </div>
                    </div>
                    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Smart Repasses v2.0 - Studio</div>
                </footer>
            </div>
        </div>
    )
}
