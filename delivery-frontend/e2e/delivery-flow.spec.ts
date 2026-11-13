import { expect, test, type Page } from '@playwright/test';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Correo Electrónico', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: /entrar a mi cuenta/i }).click();
}

function makeJwt(sub: string, email: string, role: 'CLIENT' | 'ADMIN' | 'DELIVERY'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      email,
      role,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url');
  return `${header}.${payload}.mock-signature`;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

test.describe('Flujo E2E Multirrol DeliveryPro', () => {
  test('Cliente crea pedido -> Admin confirma y prepara -> Repartidor entrega -> Cliente califica', async ({
    page,
  }) => {
    const users = {
      'u-client': {
        _id: 'u-client',
        name: 'Laura Cliente',
        email: 'client@delivery.com',
        role: 'CLIENT' as const,
      },
      'u-admin': {
        _id: 'u-admin',
        name: 'Carlos Admin',
        email: 'admin@delivery.com',
        role: 'ADMIN' as const,
      },
      'u-rider': {
        _id: 'u-rider',
        name: 'Mateo Repartidor',
        email: 'rider@delivery.com',
        role: 'DELIVERY' as const,
      },
    };

    const categories = [
      {
        _id: 'cat-burgers',
        name: 'Hamburguesas',
        description: 'Parrilla artesanal',
        image: '',
      },
    ];

    const products = [
      {
        _id: 'prod-burger-1',
        name: 'Burger Trufada',
        description: 'Carne madurada 200g con queso cheddar y mayo trufada.',
        price: 32000,
        available: true,
        stock: 15,
        categoryId: 'cat-burgers',
        image: '',
      },
    ];

    const addresses = [
      {
        _id: 'addr-1',
        userId: 'u-client',
        title: 'Casa',
        street: 'Calle 85 #15-20',
        city: 'Bogotá',
        state: 'Cundinamarca',
        zipCode: '110221',
        country: 'Colombia',
        isDefault: true,
      },
    ];

    let cartItems: Array<{ productId: (typeof products)[0]; quantity: number; price: number }> = [];
    const orders: Array<{
      _id: string;
      userId: { _id: string; name: string; email: string; role: string };
      deliveryId?: string;
      items: Array<{ productId: (typeof products)[0]; name: string; quantity: number; price: number }>;
      total: number;
      status: string;
      address: string;
      createdAt: string;
    }> = [];
    const reviews: Array<Record<string, unknown>> = [];

    const deliveryProfile = {
      _id: 'prof-rider-1',
      userId: 'u-rider',
      vehicleType: 'MOTO',
      plate: 'DEL-900',
      isAvailable: true,
      totalDeliveries: 12,
    };

    await page.route('**/socket.io/**', (route) => route.abort());

    await page.route('**/api/v1/**', async (route) => {
      const request = route.request();
      const method = request.method();

      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS_HEADERS });
        return;
      }

      const url = new URL(request.url());
      const path = url.pathname.replace(/^\/api\/v1/, '');

      const json = async (data: unknown, status = 200) => {
        await route.fulfill({
          status,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ success: true, data }),
        });
      };

      if (method === 'GET' && path === '/health') {
        return json({ status: 'ok' });
      }

      if (method === 'POST' && path === '/auth/login') {
        const body = request.postDataJSON() as { email: string };
        const matched = Object.values(users).find((u) => u.email === body.email) ?? users['u-client'];
        return json({
          access_token: makeJwt(matched._id, matched.email, matched.role),
          refresh_token: `refresh-${matched._id}`,
        });
      }

      if (method === 'POST' && path === '/auth/logout') {
        return json({ message: 'Logged out' });
      }

      if (method === 'GET' && path.startsWith('/users/')) {
        const userId = path.replace('/users/', '');
        const user = users[userId as keyof typeof users];
        return json(user ?? users['u-client']);
      }

      if (method === 'GET' && path === '/categories') {
        return json(categories);
      }

      if (method === 'GET' && path === '/products') {
        return json({
          data: products,
          meta: { total: products.length, page: 1, lastPage: 1 },
        });
      }

      if (method === 'GET' && path === '/cart') {
        const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        return json({
          _id: 'cart-1',
          userId: 'u-client',
          status: 'ACTIVE',
          items: cartItems,
          total,
        });
      }

      if (method === 'POST' && path === '/cart/add') {
        const body = request.postDataJSON() as { productId: string; quantity: number };
        const prod = products.find((p) => p._id === body.productId) ?? products[0];
        cartItems = [{ productId: prod, quantity: body.quantity || 1, price: prod.price }];
        const total = prod.price * (body.quantity || 1);
        return json({
          _id: 'cart-1',
          userId: 'u-client',
          status: 'ACTIVE',
          items: cartItems,
          total,
        });
      }

      if (method === 'GET' && path === '/addresses') {
        return json(addresses);
      }

      if (method === 'POST' && path === '/orders') {
        const body = request.postDataJSON() as { address: string };
        const orderTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const createdOrder = {
          _id: 'order100001',
          userId: users['u-client'],
          items: cartItems.map((i) => ({
            productId: i.productId,
            name: i.productId.name,
            quantity: i.quantity,
            price: i.price,
          })),
          total: orderTotal,
          status: 'PENDING',
          address: body.address,
          createdAt: new Date().toISOString(),
        };
        orders.unshift(createdOrder);
        cartItems = [];
        return json(createdOrder, 201);
      }

      if (method === 'GET' && path === '/orders') {
        return json({
          data: orders,
          meta: { total: orders.length, page: 1, lastPage: 1 },
        });
      }

      if (method === 'GET' && path === '/orders/me') {
        return json({
          data: orders,
          meta: { total: orders.length, page: 1, lastPage: 1 },
        });
      }

      if (method === 'GET' && path.startsWith('/orders/')) {
        const id = path.replace('/orders/', '');
        const found = orders.find((o) => o._id === id) ?? orders[0];
        return json(found);
      }

      if (method === 'PATCH' && path.endsWith('/status')) {
        const id = path.replace('/orders/', '').replace('/status', '');
        const body = request.postDataJSON() as { status: string };
        const found = orders.find((o) => o._id === id);
        if (found) {
          found.status = body.status;
        }
        return json(found);
      }

      if (method === 'GET' && path === '/analytics/dashboard') {
        return json({
          kpis: {
            totalRevenue: 32000,
            totalOrders: orders.length,
            paidOrdersCount: 1,
            averageOrderValue: 32000,
            totalUsers: 3,
            activeProducts: 1,
          },
          ordersByStatus: { PENDING: orders.length },
        });
      }

      if (method === 'GET' && path === '/analytics/sales') {
        return json([{ date: '2026-11-13', ordersCount: 1, dailyRevenue: 32000 }]);
      }

      if (method === 'GET' && path === '/analytics/top-products') {
        return json([
          {
            productId: 'prod-burger-1',
            name: 'Burger Trufada',
            totalQuantitySold: 1,
            totalRevenue: 32000,
            ordersCount: 1,
          },
        ]);
      }

      if (method === 'GET' && path === '/delivery/profile') {
        return json(deliveryProfile);
      }

      if (method === 'GET' && path === '/delivery/orders/available') {
        return json(orders.filter((o) => o.status === 'PREPARING'));
      }

      if (method === 'PATCH' && path.endsWith('/accept')) {
        const id = path.replace('/delivery/orders/', '').replace('/accept', '');
        const found = orders.find((o) => o._id === id);
        if (found) {
          found.status = 'OUT_FOR_DELIVERY';
          found.deliveryId = 'u-rider';
        }
        return json(found);
      }

      if (method === 'GET' && path === '/delivery/orders/active') {
        return json(orders.filter((o) => o.status === 'OUT_FOR_DELIVERY'));
      }

      if (method === 'PATCH' && path.endsWith('/deliver')) {
        const id = path.replace('/delivery/orders/', '').replace('/deliver', '');
        const found = orders.find((o) => o._id === id);
        if (found) {
          found.status = 'DELIVERED';
        }
        return json(found);
      }

      if (method === 'POST' && path === '/reviews') {
        const body = request.postDataJSON() as Record<string, unknown>;
        const review = {
          _id: 'rev-1',
          ...body,
          user: { _id: 'u-client', name: 'Laura Cliente' },
          createdAt: new Date().toISOString(),
        };
        reviews.push(review);
        return json(review, 201);
      }

      return json({});
    });

    // 1. Cliente inicia sesión, agrega producto al carrito y confirma pedido
    await loginAs(page, 'client@delivery.com', 'Client123456');

    await expect(page.getByRole('heading', { name: 'Burger Trufada' })).toBeVisible();
    await page.getByRole('button', { name: 'Agregar', exact: true }).first().click();

    await expect(page.getByText('Tu Carrito de Compras')).toBeVisible();
    await page.getByRole('button', { name: /ir a pagar/i }).click();

    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByText('Casa', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /confirmar pedido y ver seguimiento/i }).click();

    await expect(page).toHaveURL(/\/orders\/order100001$/);
    await expect(page.getByText('Recibido').first()).toBeVisible();

    // 2. Admin entra a despacho y avanza pedido hasta PREPARING ("En cocina")
    await loginAs(page, 'admin@delivery.com', 'Admin123456');

    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole('link', { name: /despacho de pedidos/i }).click();
    await expect(page).toHaveURL(/\/admin\/orders$/);

    await page.getByRole('button', { name: 'Marcar pagado' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await page.getByRole('button', { name: 'A cocina' }).click();
    await expect(page.getByText('En Cocina', { exact: true })).toBeVisible();

    // 3. Repartidor acepta pedido disponible y lo marca como entregado
    await loginAs(page, 'rider@delivery.com', 'Rider123456');

    await expect(page).toHaveURL(/\/delivery$/);
    await expect(page.getByText('#ER100001')).toBeVisible();
    await page.getByRole('button', { name: /aceptar entrega/i }).click();

    await expect(page).toHaveURL(/\/delivery\/active$/);
    await page.getByRole('button', { name: /marcar como entregado/i }).click();
    await expect(page.getByText('No tienes entregas en curso')).toBeVisible();

    // 4. Cliente regresa al detalle del pedido entregado y publica una reseña
    await loginAs(page, 'client@delivery.com', 'Client123456');

    await expect(page).toHaveURL('/');
    await page.goto('/orders/order100001');
    await page.getByRole('button', { name: /calificar plato/i }).click();

    await page.getByRole('button', { name: 'Calificar con 5 estrellas' }).click();
    await page.locator('#review-comment').fill('Excelente sabor y entrega puntual.');
    await page.getByRole('button', { name: /publicar reseña/i }).click();

    await expect(page.getByText('Reseña Publicada')).toBeVisible();
    expect(reviews).toHaveLength(1);
  });
});
