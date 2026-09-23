import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import prisma from '../prisma';

const app = createApp();

let adminToken: string;
let testOrderId: string;

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@crm.local', password: 'Admin@123' });
  adminToken = loginRes.body.token;

  // Find or create test order with exact 50,000 initial value and version 1
  const existingOrder = await prisma.order.findUnique({
    where: { orderNumber: 'ORD-1001' },
  });

  if (existingOrder) {
    testOrderId = existingOrder.id;
    // Reset to 50,000 and version 1 for test repeatability
    await prisma.order.update({
      where: { id: testOrderId },
      data: { amount: 50000, version: 1 },
    });
  }
});

describe('Optimistic Concurrency Control (OCC) Scenario', () => {
  it('Should prevent lost updates when Employee A and B edit the same order simultaneously', async () => {
    // 1. Both Employee A and Employee B read the order at the same time:
    // Order ORD-1001: Amount = ₹50,000, Version = 1
    const getRes = await request(app)
      .get(`/api/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    const initialOrder = getRes.body.order;
    expect(initialOrder.amount).toBe(50000);
    expect(initialOrder.version).toBe(1);

    // 2. Employee A submits update first: ₹50,000 -> ₹55,000 using version 1
    const empARes = await request(app)
      .put(`/api/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 55000,
        version: 1, // Employee A's read version
      });

    expect(empARes.status).toBe(200);
    expect(empARes.body.success).toBe(true);
    expect(empARes.body.order.amount).toBe(55000);
    expect(empARes.body.order.version).toBe(2); // Incremented to 2

    // 3. Employee B attempts to submit update: ₹50,000 -> ₹60,000 using stale version 1
    const empBRes = await request(app)
      .put(`/api/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 60000,
        version: 1, // Employee B still has stale version 1
      });

    // Concurrency conflict MUST be detected!
    expect(empBRes.status).toBe(409);
    expect(empBRes.body.success).toBe(false);
    expect(empBRes.body.error).toBe('CONCURRENCY_CONFLICT');
    expect(empBRes.body.conflict).toBeDefined();
    expect(empBRes.body.conflict.currentAmount).toBe(55000);
    expect(empBRes.body.conflict.currentVersion).toBe(2);
    expect(empBRes.body.conflict.submittedVersion).toBe(1);

    // 4. Verify in DB that Employee A's ₹55,000 was NOT overwritten by Employee B's stale edit
    const dbOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
    });
    expect(dbOrder?.amount).toBe(55000);
    expect(dbOrder?.version).toBe(2);

    // 5. Verify that AuditLog recorded the conflict event
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'ORDER',
        entityId: testOrderId,
        action: 'CONFLICT_DETECTED',
      },
    });
    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].summary).toContain('stale version 1');

    // 6. Employee B refreshes with latest version (version: 2) and reapplies edit to ₹60,000
    const empBRetryRes = await request(app)
      .put(`/api/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 60000,
        version: 2, // Now using fresh version
      });

    expect(empBRetryRes.status).toBe(200);
    expect(empBRetryRes.body.order.amount).toBe(60000);
    expect(empBRetryRes.body.order.version).toBe(3);
  });
});
