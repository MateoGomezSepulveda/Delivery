import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function () {
  // Encendemos la base de datos temporal
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Guardamos la instancia globalmente para poder apagarla después
  (global as any).__MONGOINSTANCE = mongoServer;

  // Engañamos a NestJS para que use esta DB
  process.env.MONGO_URI = uri;
}
