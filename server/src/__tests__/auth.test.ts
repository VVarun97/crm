import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Authentication & Security', () => {
  it('should successfully log in with valid credentials and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@crm.local',
        password: 'Admin@123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('admin@crm.local');
    expect(res.body.user.role).toBe('ADMIN');
    // Ensure sensitive data like passwordHash is NOT exposed
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('should reject invalid password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@crm.local',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_CREDENTIALS');
  });

  it('should reject non-existent user with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@crm.local',
        password: 'Password@123',
      });

    expect(res.status).toBe(401);
  });

  it('should reject protected route when Authorization header is missing', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('should allow access to /api/auth/me with valid Bearer token', async () => {
    // 1. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'executive@crm.local',
        password: 'Exec@123',
      });
    const token = loginRes.body.token;

    // 2. Fetch /me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.user.fullName).toBe('Rahul Verma');
    expect(meRes.body.user.role).toBe('EXECUTIVE');
  });
});
