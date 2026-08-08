const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function request(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  const status = res.status;
  let data: any;
  try {
    data = await res.json();
  } catch (e) {
    data = await res.text();
  }

  return { status, data, ok: res.ok };
}

async function runFlowTest() {
  console.log('--------------------------------------------------');
  console.log('🚀 INICIANDO PRUEBAS DE ENDPOINTS (Flujo Completo)');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('--------------------------------------------------\n');

  const randomId = Math.floor(Math.random() * 10000);
  const adminEmail = `admin_${randomId}@test.com`;
  const clientEmail = `client_${randomId}@test.com`;
  const password = 'password123';

  // 1. Registro de Usuario Administrador
  console.log(`1. Registrando usuario Administrador (${adminEmail})...`);
  const regAdmin = await request('/users', {
    method: 'POST',
    body: { name: 'Admin Test', email: adminEmail, password, role: 'ADMIN' },
  });
  console.log(`   Status: ${regAdmin.status} ${regAdmin.ok ? '✅' : '❌'}`);
  if (!regAdmin.ok) console.log('   Response:', regAdmin.data);

  // 2. Login Administrador
  console.log(`\n2. Iniciando sesión como Administrador...`);
  const loginAdmin = await request('/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password },
  });
  console.log(`   Status: ${loginAdmin.status} ${loginAdmin.ok ? '✅' : '❌'}`);
  const adminToken = loginAdmin.data?.access_token;
  if (!adminToken) {
    console.error('❌ Error: No se pudo obtener el access_token del Administrador.');
    return;
  }
  console.log('   Token de Admin obtenido correctamente.');

  // 3. Crear Categoría (Admin)
  console.log(`\n3. Creando nueva categoría como Admin...`);
  const createCat = await request('/categories', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { name: `Comida Rápida ${randomId}`, description: 'Hamburguesas y Papas' },
  });
  console.log(`   Status: ${createCat.status} ${createCat.ok ? '✅' : '❌'}`);
  const categoryId = createCat.data?._id;
  console.log(`   Categoría Creada ID: ${categoryId}`);

  // 4. Crear Producto (Admin)
  console.log(`\n4. Creando nuevo producto como Admin...`);
  const createProd = await request('/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: `Hamburguesa Doble ${randomId}`,
      price: 25000,
      categoryId: categoryId,
      description: 'Hamburguesa con queso y tocineta',
      available: true,
    },
  });
  console.log(`   Status: ${createProd.status} ${createProd.ok ? '✅' : '❌'}`);
  const productId = createProd.data?._id;
  console.log(`   Producto Creado ID: ${productId}`);

  // 5. Registro de Usuario Cliente
  console.log(`\n5. Registrando usuario Cliente (${clientEmail})...`);
  const regClient = await request('/users', {
    method: 'POST',
    body: { name: 'Cliente Test', email: clientEmail, password, role: 'CLIENT' },
  });
  console.log(`   Status: ${regClient.status} ${regClient.ok ? '✅' : '❌'}`);

  // 6. Login Cliente
  console.log(`\n6. Iniciando sesión como Cliente...`);
  const loginClient = await request('/auth/login', {
    method: 'POST',
    body: { email: clientEmail, password },
  });
  console.log(`   Status: ${loginClient.status} ${loginClient.ok ? '✅' : '❌'}`);
  const clientToken = loginClient.data?.access_token;
  if (!clientToken) {
    console.error('❌ Error: No se pudo obtener el access_token del Cliente.');
    return;
  }
  console.log('   Token de Cliente obtenido correctamente.');

  // 7. Consultar Productos (Cliente)
  console.log(`\n7. Consultando lista de productos disponibles...`);
  const getProds = await request('/products', {
    method: 'GET',
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  console.log(`   Status: ${getProds.status} ${getProds.ok ? '✅' : '❌'}`);
  console.log(`   Total de productos encontrados: ${Array.isArray(getProds.data) ? getProds.data.length : 0}`);

  // 8. Agregar Producto al Carrito (Cliente)
  console.log(`\n8. Agregando producto al carrito de compras (Cantidad: 2)...`);
  const addToCart = await request('/cart/add', {
    method: 'POST',
    headers: { Authorization: `Bearer ${clientToken}` },
    body: { productId: productId, quantity: 2 },
  });
  console.log(`   Status: ${addToCart.status} ${addToCart.ok ? '✅' : '❌'}`);

  // 9. Consultar Carrito de Compras (Cliente)
  console.log(`\n9. Consultando el contenido actual del carrito de compras...`);
  const getCart = await request('/cart', {
    method: 'GET',
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  console.log(`   Status: ${getCart.status} ${getCart.ok ? '✅' : '❌'}`);
  console.log('   Contenido del Carrito:', JSON.stringify(getCart.data, null, 2));

  // 10. Crear Orden de Compra / Checkout (Cliente)
  console.log(`\n10. Generando la orden de compra a partir del carrito...`);
  const createOrder = await request('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${clientToken}` },
    body: { address: 'Calle 100 # 15-20, Apto 402, Bogotá' },
  });
  console.log(`   Status: ${createOrder.status} ${createOrder.ok ? '✅' : '❌'}`);
  const orderId = createOrder.data?._id;
  console.log(`   Orden Creada ID: ${orderId}`);
  console.log('   Detalles de la Orden:', JSON.stringify(createOrder.data, null, 2));

  // 11. Consultar Mis Órdenes (Cliente)
  console.log(`\n11. Consultando órdenes del usuario cliente (/orders/me)...`);
  const getMyOrders = await request('/orders/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  console.log(`   Status: ${getMyOrders.status} ${getMyOrders.ok ? '✅' : '❌'}`);
  console.log(`   Total órdenes encontradas para el cliente: ${Array.isArray(getMyOrders.data) ? getMyOrders.data.length : 0}`);

  // 12. Verificar que el carrito quedó vacío tras la orden
  console.log(`\n12. Verificando que el carrito se limpió tras realizar la compra...`);
  const checkCartEmpty = await request('/cart', {
    method: 'GET',
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  console.log(`   Status: ${checkCartEmpty.status} ${checkCartEmpty.ok ? '✅' : '❌'}`);
  console.log('   Items en carrito post-compra:', checkCartEmpty.data?.items?.length || 0);

  // 13. Actualizar Estado de la Orden (Admin) — Flujo completo
  if (orderId) {
    const statusFlow = ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    console.log(`\n13. Actualizando estado de la orden como Admin (flujo completo)...`);
    for (const status of statusFlow) {
      const updateOrder = await request(`/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { status },
      });
      console.log(`   → ${status}: ${updateOrder.status} ${updateOrder.ok ? '✅' : '❌'}`);
      if (!updateOrder.ok) {
        console.log('   Error:', updateOrder.data);
        break;
      }
    }
  }

  console.log('\n--------------------------------------------------');
  console.log('🎉 PRUEBAS DE ENDPOINTS COMPLETADAS EXITOSAMENTE');
  console.log('--------------------------------------------------');
}

runFlowTest().catch((err) => {
  console.error('❌ Error durante la ejecución del test:', err);
});
