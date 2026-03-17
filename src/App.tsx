import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { MarketplaceFeed } from '@/features/marketplace/pages/Feed'
import { FavoritesPage } from '@/features/marketplace/pages/Favorites'
import { ProfilePage } from '@/features/profile/pages/Profile'
import { useAuthStore } from '@/store/useAuthStore'
import { LoginPage } from '@/features/auth/pages/Login'

import { InventoryPage } from '@/features/inventory/pages/Inventory'
import { ChatPage } from '@/features/chat/pages/Chat'
import { NetworkPage } from '@/features/social/pages/Network'
import { DealerProfilePage } from '@/features/social/pages/DealerProfile'

import { Toaster } from 'sonner'

import { AdminGuard, StatusGuard, ProfileCompletenessGuard } from '@/components/Guards'
import { AdminDashboard } from '@/features/admin/pages/Dashboard'
import { UserManagement } from '@/features/admin/pages/UserManagement'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPassword'

function App() {
    const { user, isLoading } = useAuthStore()

    if (isLoading) {
        return null
    }

    if (!user) {
        return <LoginPage />
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            <Toaster position="bottom-right" richColors expand={true} />
            <Routes>
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Auth Protected Routes with Status Check */}
                <Route element={<StatusGuard />}>
                    <Route element={<DashboardLayout />}>
                        <Route path="/settings" element={<ProfilePage />} />

                        <Route element={<ProfileCompletenessGuard />}>
                            <Route path="/" element={<MarketplaceFeed />} />
                            <Route path="/favorites" element={<FavoritesPage />} />
                            <Route path="/inventory" element={<InventoryPage />} />
                            <Route path="/chat" element={<ChatPage />} />
                            <Route path="/chat/:identifier" element={<ChatPage />} />
                            <Route path="/network" element={<NetworkPage />} />
                            <Route path="/network/dealer/:username" element={<DealerProfilePage />} />
                            <Route path="/@:username" element={<DealerProfilePage />} />
                            <Route path="/:username" element={<DealerProfilePage />} />

                            {/* Admin Routes */}
                            <Route path="/admin" element={<AdminGuard />}>
                                <Route index element={<AdminDashboard />} />
                                <Route path="users" element={<UserManagement />} />
                            </Route>
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Route>
            </Routes>
        </div>
    )
}

export default App
