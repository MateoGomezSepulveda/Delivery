import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestAppFactory } from './helpers/test-app.factory';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  // Antes de todos los tests de este archivo, creamos la app de NestJS
  beforeAll(async () => {
    app = await TestAppFactory.create();
  });

  // Al terminar, cerramos la app
  afterAll(async () => {
    await app.close();
  });

  const testUser = {
    name: 'E2E Test User',
    email: 'e2e@delivery.com',
    password: 'Password123!',
  };

  it('Debe registrar un nuevo usuario (POST /api/v1/users)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/users')
      .send(testUser)
      .expect(201) // Esperamos código 201 Created
      .then((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe(testUser.email);
      });
  });

  it('Debe iniciar sesión y devolver tokens (POST /api/v1/auth/login)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200) // Esperamos código 200 OK
      .then((res) => {
        expect(res.body.success).toBe(true);
        // Verificamos que nos haya devuelto los tokens
        expect(res.body.data.access_token).toBeDefined();
        expect(res.body.data.refresh_token).toBeDefined();
      });
  });
});
