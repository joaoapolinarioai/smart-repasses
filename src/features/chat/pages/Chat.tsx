import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/lib/utils'
import {
    Search,
    Send,
    Circle,
    User,
    Ban,
    Trash2,
    ExternalLink,
    MoreVertical,
    Image as ImageIcon,
    Paperclip,
    Smile,
    CheckCheck,
    ArrowLeft,
    Loader2,
    MessageSquare
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { motion } from 'framer-motion'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

// -- Tipos Reais --
interface ChatRoom {
    id: string
    created_at: string
    updated_at: string
    last_read_at?: string
    unread_count: number
    other_party: {
        id: string
        full_name: string
        username: string
        avatar_url: string
        last_read_at?: string
    }
    last_message?: {
        content: string
        created_at: string
        type?: 'text' | 'image' | 'file'
    }
    vehicle?: {
        id: string
        make: string
        model: string
        price_repasse: number
        images: string[]
    }
}

interface Message {
    id: string
    room_id: string
    sender_id: string
    content: string
    created_at: string
    type: 'text' | 'image' | 'file'
    media_url?: string
}

export function ChatPage() {
    const { identifier } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user: currentUser } = useAuthStore()
    const currentUserId = currentUser?.id

    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
    const [messageInput, setMessageInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [showRoomsMobile, setShowRoomsMobile] = useState(true)

    const scrollRef = useRef<HTMLDivElement>(null)

    // --- Queries ---

    // 1. Buscar Lista de Salas Reais (todas onde eu participo)
    const { data: rooms, isLoading: isLoadingRooms, error: roomsError } = useQuery({
        queryKey: ['chat-rooms', currentUserId],
        queryFn: async () => {
            if (!currentUserId) return []

            const { data: participations, error: pError } = await supabase
                .from('chat_participants')
                .select('room_id, last_read_at')
                .eq('profile_id', currentUserId)

            if (pError) throw pError

            const participationMap = (participations || []).reduce((acc: any, p) => {
                acc[p.room_id] = p.last_read_at
                return acc
            }, {})

            const roomIds = Object.keys(participationMap)
            if (roomIds.length === 0) return []

            const { data: roomsData, error: rError } = await supabase
                .from('chat_rooms')
                .select(`
                    id, 
                    created_at, 
                    updated_at,
                    participants:chat_participants(
                        last_read_at,
                        profile:profiles(id, full_name, username, avatar_url)
                    ),
                    messages:chat_messages(id, content, created_at, sender_id, type, media_url),
                    vehicle:vehicles(id, make, model, price_repasse, images)
                `)
                .in('id', roomIds)
                .order('updated_at', { ascending: false })

            if (rError) throw rError

            return (roomsData || []).map(r => {
                const participantsList = (r.participants as any[]) || []
                const otherParticipantData = participantsList.find(p => p.profile?.id && p.profile.id !== currentUserId)
                const other = otherParticipantData?.profile

                const msgsList = (r.messages as any[]) || []
                const lastMsg = msgsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

                const lastRead = participationMap[r.id]
                const unreadCount = msgsList.filter(m =>
                    m.sender_id !== currentUserId &&
                    (!lastRead || new Date(m.created_at) > new Date(lastRead))
                ).length

                return {
                    id: r.id,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                    last_read_at: lastRead,
                    unread_count: unreadCount,
                    other_party: {
                        id: other?.id || 'id-desconhecido',
                        full_name: other?.full_name || 'Lojista',
                        username: other?.username || '',
                        avatar_url: other?.avatar_url,
                        last_read_at: otherParticipantData?.last_read_at
                    },
                    last_message: lastMsg ? {
                        content: lastMsg.content,
                        created_at: lastMsg.created_at,
                        type: lastMsg.type
                    } : undefined,
                    vehicle: r.vehicle ? {
                        id: (r.vehicle as any).id,
                        make: (r.vehicle as any).make,
                        model: (r.vehicle as any).model,
                        price_repasse: (r.vehicle as any).price_repasse,
                        images: (r.vehicle as any).images
                    } : undefined
                }
            }) as ChatRoom[]
        },
        enabled: !!currentUserId
    })

    // Sincronizar room select com identifier na URL
    useEffect(() => {
        if (!identifier || !rooms) return

        let targetRoom: ChatRoom | undefined

        if (identifier.startsWith('@')) {
            const username = identifier.slice(1).toLowerCase()
            targetRoom = rooms.find(r => r.other_party.username?.toLowerCase() === username)
        } else {
            targetRoom = rooms.find(r => r.id === identifier)
        }

        if (targetRoom) {
            setSelectedRoomId(targetRoom.id)
            setShowRoomsMobile(false)
        }
    }, [identifier, rooms])

    // 2. Buscar Mensagens da Sala Selecionada
    const { data: messages, isLoading: isLoadingMessages, error: messagesError } = useQuery({
        queryKey: ['chat-messages', selectedRoomId],
        queryFn: async () => {
            if (!selectedRoomId) return []
            const { data, error } = await supabase
                .from('chat_messages')
                .select('id, room_id, sender_id, content, created_at, type, media_url')
                .eq('room_id', selectedRoomId)
                .order('created_at', { ascending: true })

            if (error) throw error
            return data as Message[]
        },
        enabled: !!selectedRoomId
    })

    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
        const file = e.target.files?.[0]
        if (!file || !selectedRoomId || !currentUserId) return

        setIsUploading(true)
        try {
            let fileToUpload = file

            if (type === 'image') {
                const options = {
                    maxSizeMB: 0.5,
                    maxWidthOrHeight: 1200,
                    useWebWorker: true
                }
                fileToUpload = await imageCompression(file, options)
            }

            const fileExt = file.name.split('.').pop()
            const fileName = `${selectedRoomId}_${Date.now()}.${fileExt}`
            const filePath = `chat_media/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('chat_media')
                .upload(filePath, fileToUpload)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('chat_media')
                .getPublicUrl(filePath)

            // Send message with media
            await sendMessageMutation.mutateAsync({
                content: type === 'image' ? '📷 Imagem' : `📎 ${file.name}`,
                type,
                media_url: publicUrl
            })

            if (e.target) e.target.value = ''
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('Erro ao enviar arquivo.')
        } finally {
            setIsUploading(false)
        }
    }

    // Realtime Subscription
    useEffect(() => {
        if (!selectedRoomId) return

        const channel = supabase.channel(`room-${selectedRoomId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages'
            }, (payload) => {
                if (payload.new.room_id !== selectedRoomId) return

                queryClient.setQueryData(['chat-messages', selectedRoomId], (old: Message[] | undefined) => {
                    const exists = old?.some(m => m.id === payload.new.id)
                    if (exists) return old
                    return [...(old || []), payload.new]
                })

                // Mark as read since user is actively in the room
                markAsReadMutation.mutate(selectedRoomId)

                queryClient.invalidateQueries({ queryKey: ['chat-rooms'] })
                setTimeout(scrollToBottom, 50)
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [selectedRoomId, queryClient])

    // Mark as read when room selected
    useEffect(() => {
        if (selectedRoomId) {
            markAsReadMutation.mutate(selectedRoomId)
        }
    }, [selectedRoomId])

    // --- Mutations ---

    const markAsReadMutation = useMutation({
        mutationFn: async (roomId: string) => {
            if (!currentUserId) return
            const { error } = await supabase
                .from('chat_participants')
                .update({ last_read_at: new Date().toISOString() })
                .eq('room_id', roomId)
                .eq('profile_id', currentUserId)
            if (error) throw error
        }
    })

    const deleteRoomMutation = useMutation({
        mutationFn: async (roomId: string) => {
            const { error: pError } = await supabase
                .from('chat_participants')
                .delete()
                .eq('room_id', roomId)
                .eq('profile_id', currentUserId)
            if (pError) throw pError
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chat-rooms'] })
            setSelectedRoomId(null)
            navigate('/chat')
        }
    })

    const blockUserMutation = useMutation({
        mutationFn: async (bannedId: string) => {
            const { error } = await supabase
                .from('chat_bans')
                .insert({
                    banner_id: currentUserId,
                    banned_id: bannedId
                })
            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Usuário bloqueado com sucesso.')
            queryClient.invalidateQueries({ queryKey: ['chat-rooms'] })
        }
    })

    const sendMessageMutation = useMutation({
        mutationFn: async ({ content, type = 'text', media_url }: { content: string, type?: 'text' | 'image' | 'file', media_url?: string }) => {
            if (!selectedRoomId || !currentUserId) return
            const { data, error } = await supabase
                .from('chat_messages')
                .insert({
                    room_id: selectedRoomId,
                    sender_id: currentUserId,
                    content,
                    type,
                    media_url
                })
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (newMessage) => {
            setMessageInput('')
            if (newMessage) {
                queryClient.setQueryData(['chat-messages', selectedRoomId], (old: Message[] | undefined) => {
                    const exists = old?.some(m => m.id === newMessage.id)
                    if (exists) return old
                    return [...(old || []), newMessage]
                })
                queryClient.invalidateQueries({ queryKey: ['chat-rooms'] })
                setTimeout(scrollToBottom, 50)
                if (selectedRoomId) markAsReadMutation.mutate(selectedRoomId)
            }
        }
    })

    // --- Helpers ---

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!messageInput.trim() || sendMessageMutation.isPending) return
        sendMessageMutation.mutate({ content: messageInput })
    }

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }

    useEffect(() => {
        if (selectedRoomId && !isLoadingMessages) {
            scrollToBottom()
            const currentRoom = rooms?.find(r => r.id === selectedRoomId)
            if (currentRoom && currentRoom.unread_count > 0) {
                markAsReadMutation.mutate(selectedRoomId)
            }
        }
    }, [selectedRoomId, isLoadingMessages, rooms])

    const selectedRoom = rooms?.find(r => r.id === selectedRoomId)

    const getDateLabel = (dateStr: string) => {
        const date = new Date(dateStr)
        if (isToday(date)) return 'Hoje'
        if (isYesterday(date)) return 'Ontem'
        return format(date, "dd 'de' MMMM", { locale: ptBR })
    }

    return (
        <div className="h-[calc(100vh-80px)] lg:h-[calc(100vh-120px)] flex border-0 lg:border-3 border-zinc-50 rounded-none lg:rounded-[3rem] overflow-hidden bg-white shadow-none lg:shadow-premium mx-0 lg:mx-10 mb-0 lg:mb-10">
            {/* Sidebar de Conversas */}
            <aside className={cn(
                "w-full lg:w-96 border-r border-zinc-50 flex flex-col bg-zinc-50/30",
                !showRoomsMobile ? "hidden lg:flex" : "flex"
            )}>
                <div className="p-6 lg:p-8 space-y-4 lg:space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl lg:text-2xl font-[950] text-zinc-800 uppercase tracking-tighter">Negociações</h2>
                        <div className="w-9 h-9 lg:w-10 lg:h-10 bg-white rounded-lg lg:rounded-xl flex items-center justify-center border-2 border-zinc-100 shadow-sm">
                            <MessageSquare className="w-4 h-4 lg:w-5 lg:h-5 text-zinc-400" />
                        </div>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar lojista..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3.5 bg-white border-2 border-zinc-100 rounded-xl lg:rounded-2xl text-[11px] lg:text-xs font-bold placeholder:text-zinc-300 focus:border-primary/20 transition-all outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
                    {isLoadingRooms ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                    ) : rooms?.length === 0 ? (
                        <div className="text-center py-20 px-4 space-y-4">
                            <p className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">Nenhuma conversa iniciada</p>
                            <Link to="/network" className="text-[10px] text-primary font-bold uppercase underline">Buscar Lojistas</Link>
                        </div>
                    ) : (roomsError || !rooms) ? (
                        <div className="text-center py-20 px-4 space-y-4">
                            <p className="text-[10px] font-black uppercase text-red-400 tracking-widest leading-relaxed">Erro ao carregar negociações. Recarregue a página.</p>
                        </div>
                    ) : rooms?.map((room) => (
                        <button
                            key={room.id}
                            onClick={() => {
                                navigate(`/chat/${room.id}`)
                                setShowRoomsMobile(false)
                            }}
                            className={`w-full p-5 rounded-[2rem] flex items-center gap-4 transition-all group ${selectedRoomId === room.id ? 'bg-zinc-900 shadow-xl shadow-zinc-900/10' : 'hover:bg-white border-2 border-transparent hover:border-zinc-50'}`}
                        >
                            <div className="relative">
                                <div className="w-14 h-14 rounded-2xl bg-zinc-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                                    {room.vehicle?.images?.[0] ? (
                                        <img
                                            src={room.vehicle.images[0]}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (room.other_party.avatar_url && room.other_party.avatar_url.trim() !== '') ? (
                                        <img
                                            src={room.other_party.avatar_url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-lg font-black text-zinc-400">
                                            {(room.other_party.full_name?.[0] || 'L').toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-white"></div>
                            </div>

                            <div className="flex-1 text-left min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <p className={`text-xs font-black uppercase tracking-tight truncate ${selectedRoomId === room.id ? 'text-white' : 'text-zinc-800'}`}>{room.other_party.full_name}</p>
                                    <div className="flex items-center gap-2">
                                        {room.unread_count > 0 && (
                                            <span className="min-w-[18px] h-[18px] px-1 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center animate-bounce-subtle">
                                                {room.unread_count}
                                            </span>
                                        )}
                                        <span className={`text-[9px] font-bold ${selectedRoomId === room.id ? 'text-zinc-500' : 'text-zinc-300'}`}>
                                            {room.last_message ? format(new Date(room.last_message.created_at), 'HH:mm') : ''}
                                        </span>
                                    </div>
                                </div>
                                <p className={`text-[11px] font-medium truncate ${selectedRoomId === room.id ? 'text-zinc-400' : 'text-zinc-400'} ${room.unread_count > 0 && selectedRoomId !== room.id ? 'text-zinc-900 font-bold' : ''}`}>
                                    {room.last_message?.type === 'image' ? '📷 Imagem' : room.last_message?.type === 'file' ? '📎 Arquivo' : room.last_message?.content || 'Inicie a conversa...'}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </aside >

            {/* Área da Conversa */}
            <main className={`flex-1 flex flex-col bg-white ${showRoomsMobile ? 'hidden lg:flex' : 'flex'}`}>
                {
                    selectedRoomId ? (
                        <>
                            <header className="px-5 lg:px-8 py-4 lg:py-6 border-b border-zinc-50 flex items-center justify-between shadow-sm relative z-10 bg-white">
                                <div className="flex items-center gap-3 lg:gap-4">
                                    <button onClick={() => setShowRoomsMobile(true)} className="lg:hidden w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-800">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-zinc-50 overflow-hidden ring-2 ring-zinc-50 flex items-center justify-center flex-shrink-0">
                                        {(selectedRoom?.other_party.avatar_url && selectedRoom.other_party.avatar_url.trim() !== '') ? (
                                            <img
                                                src={selectedRoom.other_party.avatar_url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-sm lg:text-base font-black text-zinc-400">
                                                {(selectedRoom?.other_party.full_name?.[0] || 'L').toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-[13px] lg:text-sm font-[950] text-zinc-800 uppercase tracking-tight truncate leading-tight">{selectedRoom?.other_party.full_name}</h3>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Circle className="w-1.5 h-1.5 lg:w-2 lg:h-2 fill-primary text-primary" />
                                            <span className="text-[9px] lg:text-[10px] font-bold text-primary uppercase tracking-widest">Online agora</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger asChild>
                                            <button className="w-9 h-9 lg:w-11 lg:h-11 bg-zinc-50 rounded-lg lg:rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-800 transition-all hover:shadow-sm">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </DropdownMenu.Trigger>

                                        <DropdownMenu.Portal>
                                            <DropdownMenu.Content
                                                className="min-w-[200px] bg-white rounded-2xl p-2 shadow-2xl border border-zinc-100 z-[100] animate-in fade-in zoom-in-95 duration-100"
                                                sideOffset={5}
                                                align="end"
                                            >
                                                <DropdownMenu.Item className="outline-none">
                                                    <Link
                                                        to={selectedRoom?.other_party.username ? `/@${selectedRoom.other_party.username}` : `/profile/${selectedRoom?.other_party.id}`}
                                                        className="flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-zinc-600 uppercase tracking-widest hover:bg-zinc-50 rounded-xl transition-colors cursor-pointer"
                                                    >
                                                        <User className="w-4 h-4 text-zinc-400" />
                                                        Ver Perfil
                                                    </Link>
                                                </DropdownMenu.Item>

                                                <DropdownMenu.Item
                                                    onClick={() => {
                                                        if (confirm('Deseja realmente excluir esta conversa?')) {
                                                            deleteRoomMutation.mutate(selectedRoomId)
                                                        }
                                                    }}
                                                    className="flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-red-500 uppercase tracking-widest hover:bg-red-50 rounded-xl transition-colors cursor-pointer outline-none"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Excluir Conversa
                                                </DropdownMenu.Item>

                                                <DropdownMenu.Separator className="h-px bg-zinc-50 my-1" />

                                                <DropdownMenu.Item
                                                    onClick={() => {
                                                        if (confirm('Deseja bloquear este usuário? Você não receberá mais mensagens dele.')) {
                                                            blockUserMutation.mutate(selectedRoom?.other_party.id!)
                                                        }
                                                    }}
                                                    className="flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-zinc-400 uppercase tracking-widest hover:bg-zinc-50 rounded-xl transition-colors cursor-pointer outline-none"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                    Bloquear Lojista
                                                </DropdownMenu.Item>
                                            </DropdownMenu.Content>
                                        </DropdownMenu.Portal>
                                    </DropdownMenu.Root>
                                </div>
                            </header>

                            {/* Widget do Veículo (Estilo OLX) */}
                            {
                                selectedRoom?.vehicle && (
                                    <div className="px-5 lg:px-8 py-2.5 lg:py-3 bg-zinc-50/50 border-b border-zinc-100 flex items-center justify-between group">
                                        <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
                                            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl bg-white border border-zinc-100 overflow-hidden shadow-sm flex-shrink-0">
                                                <img
                                                    src={selectedRoom.vehicle.images?.[0] || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=200'}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] lg:text-[11px] font-[950] text-zinc-800 uppercase tracking-tight truncate leading-none mb-1">
                                                    {selectedRoom.vehicle.make} {selectedRoom.vehicle.model}
                                                </p>
                                                <p className="text-xs lg:text-sm font-black text-primary tracking-tighter leading-none">
                                                    R$ {selectedRoom.vehicle.price_repasse.toLocaleString('pt-br')}
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/marketplace`} // Seria melhor v/${id} se houver a rota
                                            className="flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 bg-white border border-zinc-100 rounded-lg lg:rounded-xl text-[9px] font-black text-zinc-400 uppercase tracking-widest hover:text-primary transition-all hover:shadow-sm ml-2 flex-shrink-0"
                                        >
                                            <span className="hidden sm:inline">Anúncio</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                )
                            }

                            <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-zinc-50/10">
                                {isLoadingMessages ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                    </div>
                                ) : !!messagesError ? (
                                    <div className="text-center py-10 space-y-4">
                                        <p className="text-[10px] font-black uppercase text-red-400 tracking-widest leading-relaxed">Erro ao carregar mensagens. Recarregue a página.</p>
                                    </div>
                                ) : messages?.map((msg, index) => {
                                    const isMine = msg.sender_id === currentUserId
                                    const prevMsg = messages[index - 1]
                                    const showDateLine = !prevMsg || format(new Date(prevMsg.created_at), 'yyyy-MM-dd') !== format(new Date(msg.created_at), 'yyyy-MM-dd')

                                    const isSeen = selectedRoom?.other_party.last_read_at && new Date(msg.created_at) <= new Date(selectedRoom.other_party.last_read_at)

                                    return (
                                        <div key={msg.id} className="w-full">
                                            {showDateLine && (
                                                <div className="flex items-center justify-center my-10">
                                                    <div className="h-px bg-zinc-100 flex-1"></div>
                                                    <span className="px-6 py-1.5 bg-zinc-50 rounded-full text-[10px] font-black text-zinc-300 uppercase tracking-widest mx-4 border border-zinc-100">
                                                        {getDateLabel(msg.created_at)}
                                                    </span>
                                                    <div className="h-px bg-zinc-100 flex-1"></div>
                                                </div>
                                            )}
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-4`}
                                            >
                                                <div className={`max-w-[70%] space-y-2`}>
                                                    <div className={`px-6 py-4 rounded-[1.8rem] text-sm font-semibold shadow-sm leading-relaxed whitespace-pre-wrap ${isMine
                                                        ? 'bg-zinc-900 text-white rounded-tr-sm'
                                                        : 'bg-white text-zinc-700 border border-zinc-50 rounded-tl-sm shadow-zinc-200/50'
                                                        }`}>
                                                        {msg.type === 'image' && msg.media_url ? (
                                                            <div className="space-y-2">
                                                                <img
                                                                    src={msg.media_url}
                                                                    alt=""
                                                                    className="max-w-full rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
                                                                    onClick={() => window.open(msg.media_url, '_blank')}
                                                                />
                                                                {msg.content && msg.content !== '📷 Imagem' && <p>{msg.content}</p>}
                                                            </div>
                                                        ) : msg.type === 'file' && msg.media_url ? (
                                                            <a
                                                                href={msg.media_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-3 p-2 bg-zinc-100/10 rounded-xl hover:bg-zinc-100 transition-all no-underline text-inherit"
                                                            >
                                                                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                                                                    <Paperclip className="w-5 h-5 text-primary" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold truncate">{msg.content.replace('📎 ', '')}</p>
                                                                    <p className="text-[9px] font-black uppercase text-primary tracking-widest mt-0.5">Clique para baixar</p>
                                                                </div>
                                                            </a>
                                                        ) : (
                                                            msg.content
                                                        )}
                                                    </div>
                                                    <div className={`flex items-center gap-2 px-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                        <span className="text-[9px] font-bold text-zinc-300 uppercase">
                                                            {format(new Date(msg.created_at), 'HH:mm')}
                                                        </span>
                                                        {isMine && (
                                                            <CheckCheck className={`w-3.5 h-3.5 ${isSeen ? 'text-blue-500' : 'text-zinc-300'}`} />
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )
                                })}
                                <div ref={scrollRef} />
                            </div>

                            <div className="p-8">
                                <form
                                    onSubmit={handleSendMessage}
                                    className="bg-white rounded-[2.5rem] p-3 flex items-center gap-3 border-2 border-zinc-50 focus-within:border-primary/20 transition-all shadow-premium"
                                >
                                    <div className="flex items-center gap-1 pl-2">
                                        <button
                                            type="button"
                                            onClick={() => imageInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-primary transition-colors disabled:opacity-30"
                                        >
                                            <ImageIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-primary transition-colors disabled:opacity-30"
                                        >
                                            <Paperclip className="w-5 h-5" />
                                        </button>
                                        <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => handleMediaUpload(e, 'image')} />
                                        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleMediaUpload(e, 'file')} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Escreva sua proposta ou mensagem..."
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        className="flex-1 bg-transparent py-3 text-sm font-bold text-zinc-800 placeholder:text-zinc-300 outline-none"
                                    />
                                    <div className="flex items-center gap-2 pr-1">
                                        <button type="button" className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-800"><Smile className="w-5 h-5" /></button>
                                        <button
                                            type="submit"
                                            disabled={!messageInput.trim() || sendMessageMutation.isPending}
                                            className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all shadow-lg shadow-zinc-400/20 disabled:opacity-50 active:scale-95"
                                        >
                                            {sendMessageMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 space-y-6 bg-zinc-50/20">
                            <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center shadow-premium border border-zinc-50">
                                <MessageSquare className="w-10 h-10 text-zinc-100" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-black text-zinc-800 uppercase tracking-tighter">Conectado com a Rede</h3>
                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest max-w-xs leading-relaxed">Selecione uma negociação ao lado para começar ou continue suas prospeções.</p>
                            </div>
                        </div>
                    )}
            </main >
        </div >
    )
}
