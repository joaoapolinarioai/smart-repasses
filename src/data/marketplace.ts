// Mock/Initial data for the Marketplace to avoid empty screens during onboarding
export const SHOWCASE_ITEMS = [
    {
        id: 'v1',
        make: 'BMW',
        model: '320i M Sport',
        year: 2024,
        price_repasse: 285000,
        mileage: 12000,
        location: 'SÃO PAULO',
        images: ['https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=800'],
        description: 'Estado de zero quilômetro.',
        seller_id: '006721aa-b6cc-4adc-b082-dce9b4900bde',
        seller: {
            name: 'SMART PREMIUM AUTO',
            initial: 'S',
            isVip: true
        }
    },
    {
        id: 'v2',
        make: 'Toyota',
        model: 'Corolla Cross',
        year: 2024,
        price_repasse: 148000,
        mileage: 25000,
        location: 'CAMPINAS',
        images: ['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=800'],
        description: 'Único dono.',
        seller_id: 'e725462e-e3c8-4eac-9c96-21ac8300a26b',
        seller: {
            name: 'ELITE MOTORS SP',
            initial: 'E',
            isVip: true
        }
    }
];

export const ONLINE_DEALERS_PLACEHOLDERS = [
    { id: 1, initial: 'E', color: 'bg-primary' },
    { id: 2, initial: 'B', color: 'bg-blue-600' },
    { id: 3, initial: 'S', color: 'bg-orange-500' },
    { id: 4, initial: 'J', color: 'bg-red-500' },
    { id: 5, initial: 'L', color: 'bg-indigo-600' },
];
