import { apiClient } from '@/api/axios.client';
import { createCategoryApi, getCategoriesApi } from '@/api/endpoints/categories.api';
import type { PaginatedResponse } from '@/types/api.types';
import type {
  CreateProductPayload,
  Product,
  ProductQueryParams,
} from '@/types/catalog.types';

export async function getProductsApi(
  params?: ProductQueryParams,
): Promise<PaginatedResponse<Product>> {
  const cleanParams: Record<string, unknown> = {};
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        cleanParams[key] = value;
      }
    });
  }

  const response = await apiClient.get<PaginatedResponse<Product> | Product[]>(
    '/products',
    {
      params: cleanParams,
    },
  );

  if (Array.isArray(response.data)) {
    return {
      data: response.data,
      meta: {
        total: response.data.length,
        page: 1,
        lastPage: 1,
      },
    };
  }

  return response.data;
}

export async function getProductByIdApi(id: string): Promise<Product> {
  const response = await apiClient.get<Product>(`/products/${id}`);
  return response.data;
}

export async function createProductApi(
  payload: CreateProductPayload,
): Promise<Product> {
  const response = await apiClient.post<Product>('/products', payload);
  return response.data;
}

export async function updateProductApi(
  id: string,
  payload: Partial<CreateProductPayload>,
): Promise<Product> {
  const response = await apiClient.patch<Product>(`/products/${id}`, payload);
  return response.data;
}

export async function deleteProductApi(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

/**
 * Semilla rápida de catálogo para entorno de desarrollo (requiere sesión ADMIN)
 */
export async function seedDemoCatalogApi(): Promise<void> {
  const demoCategories = [
    {
      name: 'Hamburguesas Gourmet',
      description: 'Carne Certified Angus a la parrilla en pan brioche artesanal',
    },
    {
      name: 'Pizzas Napolitanas',
      description: 'Masa madre fermentada 48h horneada a la leña',
    },
    {
      name: 'Sushi & Poke Bowls',
      description: 'Cortes frescos de salmón y atún con ingredientes orientales',
    },
    {
      name: 'Postres & Bebidas',
      description: 'Malteadas cremosas, postres de autor y bebidas refrescantes',
    },
  ];

  const existingCats = await getCategoriesApi({ limit: 50 });
  const categoryMap = new Map<string, string>();
  existingCats.data.forEach((c) => categoryMap.set(c.name, c._id));

  for (const cat of demoCategories) {
    if (!categoryMap.has(cat.name)) {
      const created = await createCategoryApi(cat);
      categoryMap.set(cat.name, created._id);
    }
  }

  const burgersId = categoryMap.get('Hamburguesas Gourmet')!;
  const pizzasId = categoryMap.get('Pizzas Napolitanas')!;
  const sushiId = categoryMap.get('Sushi & Poke Bowls')!;
  const dessertsId = categoryMap.get('Postres & Bebidas')!;

  const demoProducts: CreateProductPayload[] = [
    {
      name: 'Doble Truffle Smash Burger',
      description:
        'Doble carne smash 200g, queso cheddar madurado, tocineta ahumada, cebolla caramelizada y mayonesa de trufa negra en pan brioche.',
      price: 38900,
      available: true,
      categoryId: burgersId,
      image:
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Crispy Chicken & Honey Mustard',
      description:
        'Pechuga de pollo crujiente empanizada en panko, coleslaw fresca, pepinillos artesanales y salsa honey mustard.',
      price: 32500,
      available: true,
      categoryId: burgersId,
      image:
        'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Pizza Margherita D.O.P.',
      description:
        'Salsa de tomates San Marzano, mozzarella fior di latte fresca, hojas de albahaca orgánica y aceite de oliva extra virgen.',
      price: 42000,
      available: true,
      categoryId: pizzasId,
      image:
        'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Pizza Prosciutto & Burrata',
      description:
        'Base pomodoro artesanal coronada con burrata entera cremosa, prosciutto di Parma, rúgula fresca y reducción balsámica.',
      price: 54000,
      available: true,
      categoryId: pizzasId,
      image:
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Dragon Roll Tempura (10 bocados)',
      description:
        'Rollo relleno de langostino apanado y queso crema, cubierto de aguacate, anguila glaseada y ajonjolí tostado.',
      price: 41500,
      available: true,
      categoryId: sushiId,
      image:
        'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Pacific Salmon Poke Bowl',
      description:
        'Base de arroz de sushi con salmón fresco marinado en ponzu, edamames, mango, aguacate, wakame y crispy onions.',
      price: 36900,
      available: true,
      categoryId: sushiId,
      image:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Cheesecake Vasco de Pistacho',
      description:
        'Tarta de queso horneada al estilo San Sebastián con centro cremoso y cobertura tibia de praliné de pistacho.',
      price: 22900,
      available: true,
      categoryId: dessertsId,
      image:
        'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Limonada de Coco Cremosa 16oz',
      description:
        'Preparada al instante con leche de coco natural, zumo de limón recién exprimido y hielo frappé.',
      price: 12500,
      available: false,
      categoryId: dessertsId,
      image:
        'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80',
    },
  ];

  for (const prod of demoProducts) {
    await createProductApi(prod);
  }

  // Crear también un cupón promocional de prueba (BIENVENIDA20)
  try {
    await apiClient.post('/coupons', {
      code: 'BIENVENIDA20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minOrderAmount: 15000,
      maxDiscountAmount: 25000,
      expirationDate: '2027-12-31T23:59:59.000Z',
      usageLimit: 100,
      isActive: true,
    });
  } catch {
    // Si el cupón BIENVENIDA20 ya existe en MongoDB, continuamos sin error
  }
}
