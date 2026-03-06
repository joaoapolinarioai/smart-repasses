import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
    LayoutDashboard,
    Car,
    MessageSquare,
    Users,
    Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/useAuthStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { VehicleForm } from '@/features/inventory/components/VehicleForm'

const navigation = [
    { name: 'Feed', href: '/', icon: LayoutDashboard },
    { name: 'Rede', href: '/network', icon: Users },
    { name: 'Anunciar', href: '#', icon: Plus, isAction: true },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
    { name: 'Estoque', href: '/inventory', icon: Car },
]

export function BottomNav() {
    const location = useLocation()
    const { user } = useAuthStore()
    const currentUserId = user?.id
    const [isAnunciarOpen, setIsAnunciarOpen] = useState(false)

    const { data: totalUnread = 0 } = useQuery({
        queryKey: ['unread-messages-count', currentUserId],
        queryFn: async () => {
            if (!currentUserId) return 0
            const { data: participations } = await supabase
                .from('chat_participants')
                .select('room_id, last_read_at')
                .eq('profile_id', currentUserId)

            if (!participations || participations.length === 0) return 0

            let count = 0
            for (const p of participations) {
                const { count: unreadInRoom } = await supabase
                    .from('chat_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('room_id', p.room_id)
                    .neq('sender_id', currentUserId)
                    .gt('created_at', p.last_read_at || '1970-01-01T00:00:00Z')

                count += unreadInRoom || 0
            }
            return count
        },
        enabled: !!currentUserId,
    })

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden mobile-nav-blur pb-safe">
                <div className="flex justify-around items-center px-2 py-3">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))

                        if (item.isAction) {
                            return (
                                <button
                                    key="anunciar-btn"
                                    onClick={() => setIsAnunciarOpen(true)}
                                    className="relative flex flex-col items-center gap-1 min-w-[64px] -mt-8"
                                >
                                    <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-zinc-900/50 border-4 border-white active:scale-95 transition-transform">
                                        <Plus className="w-7 h-7 text-primary stroke-[3px]" />
                                    </div>
                                    <span className="text-[9px] font-black text-zinc-900 uppercase tracking-widest mt-1">
                                        Anunciar
                                    </span>
                                </button>
                            )
                        }

                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "relative flex flex-col items-center gap-1 min-w-[64px] transition-all duration-300",
                                    isActive ? "text-primary" : "text-zinc-600"
                                )}
                            >
                                <div className={cn(
                                    "p-2 rounded-2xl transition-all duration-300",
                                    isActive && "bg-primary/10"
                                )}>
                                    <item.icon className={cn("w-6 h-6", isActive ? "stroke-[2.5px]" : "stroke-2")} />

                                    {item.name === 'Chat' && totalUnread > 0 && (
                                        <span className="absolute top-1 right-1 w-5 h-5 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                                            {totalUnread > 9 ? '9+' : totalUnread}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest scale-90">
                                    {isActive ? item.name : ''}
                                </span>

                                {isActive && (
                                    <motion.div
                                        layoutId="bottomNavIndicator"
                                        className="absolute -top-3 w-8 h-1 bg-primary rounded-full"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </Link>
                        )
                    })}
                </div>
            </nav>

            <VehicleForm
                isOpen={isAnunciarOpen}
                onClose={() => setIsAnunciarOpen(false)}
            />
        </>
    )
}
