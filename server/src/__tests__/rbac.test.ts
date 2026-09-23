import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

let adminToken: string;
let managerToken: string;
let execToken: string;

beforeAll(async () => {
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@crm.local', password: 'Admin@123' });
  adminToken = adminRes.body.token;

  const managerRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'manager@crm.local', password: 'Manager@123' });
  managerToken = managerRes.body.token;

  const execRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'executive@crm.local', password: 'Exec@123' });
  execToken = execRes.body.token;
});

describe('Authorization & RBAC Restrictions', () => {
  it('Admin should be able to access system-wide audit logs', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('Executive should be FORBIDDEN (403) from accessing audit logs endpoint', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${execToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('Executive should be FORBIDDEN (403) from deleting a customer', async () => {
    const res = await request(app)
      .delete('/api/customers/dummy-customer-id')
      .set('Authorization', `Bearer ${execToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('Manager should have access to audit logs', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
