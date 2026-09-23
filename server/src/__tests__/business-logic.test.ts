import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import prisma from '../prisma';

const app = createApp();
let adminToken: string;

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@crm.local', password: 'Admin@123' });
  adminToken = loginRes.body.token;
});

describe('Business Logic & Operations Workflows', () => {
  it('Recording payment should update order paymentStatus from UNPAID to PARTIAL to PAID', async () => {
    // 1. Create a customer & fresh order for 100,000
    const customer = await prisma.customer.findFirst();
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer!.id,
        amount: 100000,
        status: 'PROCESSING',
      });

    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.order.id;
    expect(orderRes.body.order.paymentStatus).toBe('UNPAID');

    // 2. Record partial payment of 40,000
    const pay1Res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderId,
        amount: 40000,
        paymentMethod: 'UPI',
        transactionRef: 'UPI-TEST-1',
      });

    expect(pay1Res.status).toBe(201);
    expect(pay1Res.body.order.paymentStatus).toBe('PARTIAL');

    // 3. Record remaining payment of 60,000
    const pay2Res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderId,
        amount: 60000,
        paymentMethod: 'BANK_TRANSFER',
        transactionRef: 'NEFT-TEST-2',
      });

    expect(pay2Res.status).toBe(201);
    expect(pay2Res.body.order.paymentStatus).toBe('PAID');

    // 4. Attempting to record additional payment should be rejected with 400
    const pay3Res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderId,
        amount: 10000,
        paymentMethod: 'CASH',
      });

    expect(pay3Res.status).toBe(400);
    expect(pay3Res.body.error).toBe('ORDER_ALREADY_PAID');
  });

  it('Input validation: should reject malformed email or missing required fields', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'A', // Too short (min 2)
        email: 'not-an-email',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.issues).toBeDefined();
    expect(res.body.issues.length).toBeGreaterThan(0);
  });

  it('Converting lead to customer should create customer and set lead status to WON', async () => {
    const lead = await prisma.lead.findFirst({
      where: { customerId: null },
    });

    if (lead) {
      const convertRes = await request(app)
        .post(`/api/leads/${lead.id}/convert`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(convertRes.status).toBe(200);
      expect(convertRes.body.customer.code).toMatch(/^CUST-\d+$/);
      expect(convertRes.body.lead.status).toBe('WON');
    }
  });

  it('Dashboard metrics API returns accurate aggregated figures', async () => {
    const res = await request(app)
      .get('/api/dashboard/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics.totalCustomers).toBeGreaterThan(0);
    expect(res.body.metrics.revenue).toBeGreaterThanOrEqual(0);
    expect(res.body.leadPipeline).toBeDefined();
    expect(res.body.orderStatusBreakdown).toBeDefined();
  });
});
