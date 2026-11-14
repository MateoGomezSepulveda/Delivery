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
 * Semilla rápida de catálogo de licorería y charcutería (requiere sesión ADMIN)
 */
export async function seedDemoCatalogApi(): Promise<void> {
  const demoCategories = [
    {
      name: 'Licores y Destilados',
      description: 'Whisky, ron, aguardiente, tequila, ginebra y vodka 100% originales',
    },
    {
      name: 'Vinos y Cervezas',
      description: 'Vinos tintos, blancos, espumosos y cervezas nacionales e importadas bien frías',
    },
    {
      name: 'Quesos y Charcutería',
      description: 'Quesos madurados, jamón serrano, salami y tablas para maridar',
    },
    {
      name: 'Cigarrillos y Pasabocas',
      description: 'Cigarrillos, encendedores, frutos secos, chocolates, hielo y mezcladores',
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

  const spiritsId = categoryMap.get('Licores y Destilados')!;
  const winesBeersId = categoryMap.get('Vinos y Cervezas')!;
  const cheesesId = categoryMap.get('Quesos y Charcutería')!;
  const cigarettesSnacksId = categoryMap.get('Cigarrillos y Pasabocas')!;

  const demoProducts: CreateProductPayload[] = [
    {
      name: 'Whisky Buchanan’s Deluxe 12 Años 750ml',
      description:
        'Whisky escocés blended de 12 años con notas suaves de naranja, chocolate y miel. Sello de autenticidad.',
      price: 165000,
      available: true,
      categoryId: spiritsId,
      image:
        'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Aguardiente Antioqueño Tapa Azul Sin Azúcar 750ml',
      description:
        'Aguardiente colombiano sin azúcar, ideal para compartir bien frío con amigos.',
      price: 52000,
      available: true,
      categoryId: spiritsId,
      image:
        'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Vino Tinto Reserva Cabernet Sauvignon 750ml',
      description:
        'Vino tinto chileno con crianza en barrica de roble, notas de frutos rojos maduros y taninos elegantes.',
      price: 68000,
      available: true,
      categoryId: winesBeersId,
      image:
        'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Six Pack Cerveza Club Colombia Dorada 330ml',
      description:
        '6 latas de cerveza tipo lager de maestría cervecera, entregadas bien frías.',
      price: 26500,
      available: true,
      categoryId: winesBeersId,
      image:
        'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Tabla de Queso Manchego, Gouda & Jamón Serrano (350g)',
      description:
        'Selección lista para consumir con queso manchego curado, gouda holandés, jamón serrano y aceitunas.',
      price: 48900,
      available: true,
      categoryId: cheesesId,
      image:
        'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Queso Brie Francés Cremoso 200g',
      description:
        'Queso de pasta blanda y corteza blanca, perfecto para acompañar con vino tinto o frutos secos.',
      price: 34000,
      available: true,
      categoryId: cheesesId,
      image:
        'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Cajetilla Cigarrillos Marlboro Gold (20 unidades)',
      description:
        'Cajetilla de 20 cigarrillos rubios suaves. Producto exclusivo para mayores de edad (+18).',
      price: 11500,
      available: true,
      categoryId: cigarettesSnacksId,
      image:
        'https://images.unsplash.com/photo-1527099908998-5b7365fe2a0b?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Mix Premium Almendras, Marañones y Pistachos 250g',
      description:
        'Mezcla tostada con toque de sal marina, el acompañante ideal para tus bebidas y licores.',
      price: 22900,
      available: true,
      categoryId: cigarettesSnacksId,
      image:
        'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=900&q=80',
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
