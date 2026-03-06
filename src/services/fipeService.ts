const FIPE_BASE_URL = 'https://fipe.parallelum.com.br/api/v2';

export interface FipeItem {
    code: string;
    name: string;
}

export interface FipeVehicleInfo {
    brand: string;
    model: string;
    modelYear: number;
    fuel: string;
    price: string;
    codeFipe: string;
    referenceMonth: string;
}

export const fipeService = {
    getBrands: async (vehicleType: 'cars' | 'motorcycles' | 'trucks' = 'cars'): Promise<FipeItem[]> => {
        const response = await fetch(`${FIPE_BASE_URL}/${vehicleType}/brands`);
        if (!response.ok) throw new Error('Falha ao carregar marcas');
        return response.json();
    },

    getModels: async (brandId: string, vehicleType: 'cars' = 'cars'): Promise<FipeItem[]> => {
        const response = await fetch(`${FIPE_BASE_URL}/${vehicleType}/brands/${brandId}/models`);
        if (!response.ok) throw new Error('Falha ao carregar modelos');
        return response.json();
    },

    getYears: async (brandId: string, modelId: string, vehicleType: 'cars' = 'cars'): Promise<FipeItem[]> => {
        const response = await fetch(`${FIPE_BASE_URL}/${vehicleType}/brands/${brandId}/models/${modelId}/years`);
        if (!response.ok) throw new Error('Falha ao carregar anos');
        return response.json();
    },

    getVehicleInfo: async (brandId: string, modelId: string, yearId: string, vehicleType: 'cars' = 'cars'): Promise<FipeVehicleInfo> => {
        const response = await fetch(`${FIPE_BASE_URL}/${vehicleType}/brands/${brandId}/models/${modelId}/years/${yearId}`);
        if (!response.ok) throw new Error('Falha ao carregar informações da FIPE');
        return response.json();
    }
};
