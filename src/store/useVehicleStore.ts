import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface VehicleStore {
    favorites: string[]
    toggleFavorite: (vehicleId: string) => void
    isFavorite: (vehicleId: string) => boolean
}

export const useVehicleStore = create<VehicleStore>()(
    persist(
        (set, get) => ({
            favorites: [],
            toggleFavorite: (vehicleId) => {
                const { favorites } = get()
                const isFav = favorites.includes(vehicleId)
                if (isFav) {
                    set({ favorites: favorites.filter(id => id !== vehicleId) })
                } else {
                    set({ favorites: [...favorites, vehicleId] })
                }
            },
            isFavorite: (vehicleId) => get().favorites.includes(vehicleId),
        }),
        {
            name: 'smart-repasses-vehicles'
        }
    )
)
