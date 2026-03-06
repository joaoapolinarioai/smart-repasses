import { create } from 'zustand'

interface FilterState {
    searchTerm: string
    setSearchTerm: (term: string) => void
    filters: {
        make: string
        model: string
        minPrice: string
        maxPrice: string
        minYear: string
        maxYear: string
        transmission: string
        maxMileage: string
    }
    setFilter: (name: string, value: string) => void
    clearFilters: () => void
    activeFiltersCount: () => number
}

const initialFilters = {
    make: '',
    model: '',
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    transmission: '',
    maxMileage: '',
}

export const useFilterStore = create<FilterState>((set, get) => ({
    searchTerm: '',
    setSearchTerm: (term) => set({ searchTerm: term }),
    filters: initialFilters,
    setFilter: (name, value) => set((state) => ({
        filters: { ...state.filters, [name]: value }
    })),
    clearFilters: () => set({ filters: initialFilters, searchTerm: '' }),
    activeFiltersCount: () => {
        const { filters, searchTerm } = get()
        let count = searchTerm ? 1 : 0
        Object.values(filters).forEach(value => {
            if (value) count++
        })
        return count
    }
}))
