export default async function () {
  const instance = (global as any).__MONGOINSTANCE;
  if (instance) {
    // Solo apagar el servidor, NestJS (app.close) maneja la desconexión
    await instance.stop();
  }
}
