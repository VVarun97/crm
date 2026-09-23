import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CRM database seed...');

  // Clean existing data in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.task.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database records.');

  // Password hashes
  const adminPass = await bcrypt.hash('Admin@123', 10);
  const managerPass = await bcrypt.hash('Manager@123', 10);
  const execPass = await bcrypt.hash('Exec@123', 10);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@crm.local',
      passwordHash: adminPass,
      fullName: 'Rajesh Kumar',
      role: 'ADMIN',
      branch: 'Global',
      department: 'Executive Leadership',
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@crm.local',
      passwordHash: managerPass,
      fullName: 'Amit Sharma',
      role: 'MANAGER',
      branch: 'Mumbai',
      department: 'Sales & Operations',
    },
  });

  const exec1 = await prisma.user.create({
    data: {
      email: 'executive@crm.local',
      passwordHash: execPass,
      fullName: 'Rahul Verma',
      role: 'EXECUTIVE',
      branch: 'Mumbai',
      department: 'Sales',
    },
  });

  const exec2 = await prisma.user.create({
    data: {
      email: 'priya@crm.local',
      passwordHash: execPass,
      fullName: 'Priya Nair',
      role: 'EXECUTIVE',
      branch: 'Bangalore',
      department: 'Operations',
    },
  });

  console.log('👥 Created Demo Users (Admin, Manager, 2 Executives)');

  // 2. Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      code: 'CUST-1001',
      name: 'Acme Technologies Ltd',
      email: 'contact@acmetech.in',
      phone: '+91 98200 12345',
      company: 'Acme Group',
      status: 'ACTIVE',
      branch: 'Mumbai',
      assignedToId: exec1.id,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      code: 'CUST-1002',
      name: 'Apex Cloud Innovations',
      email: 'procure@apexcloud.io',
      phone: '+91 98450 67890',
      company: 'Apex Cloud Inc.',
      status: 'ACTIVE',
      branch: 'Bangalore',
      assignedToId: exec2.id,
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      code: 'CUST-1003',
      name: 'Zenith Logistics Corp',
      email: 'dispatch@zenithlog.com',
      phone: '+91 99100 23456',
      company: 'Zenith Logistics',
      status: 'ACTIVE',
      branch: 'Mumbai',
      assignedToId: exec1.id,
    },
  });

  const customer4 = await prisma.customer.create({
    data: {
      code: 'CUST-1004',
      name: 'Stellar Fintech Solutions',
      email: 'ops@stellarfin.com',
      phone: '+91 98765 43210',
      company: 'Stellar Fintech',
      status: 'LEAD',
      branch: 'Mumbai',
      assignedToId: manager.id,
    },
  });

  const customer5 = await prisma.customer.create({
    data: {
      code: 'CUST-1023',
      name: 'Reliance Logistics Allied',
      email: 'corp@relallied.com',
      phone: '+91 98222 33445',
      company: 'Allied Infrastructure',
      status: 'ACTIVE',
      branch: 'Mumbai',
      assignedToId: exec1.id,
    },
  });

  console.log('🏢 Created 5 Customers');

  // 3. Create Leads
  const lead1 = await prisma.lead.create({
    data: {
      title: 'Enterprise Cloud Migration Deal',
      contactName: 'Arvind Gupta',
      email: 'arvind@techcorp.in',
      phone: '+91 98111 22334',
      value: 450000,
      status: 'QUALIFIED',
      followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      assignedToId: exec1.id,
      branch: 'Mumbai',
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      title: 'Fleet Tracking & Telemetry System',
      contactName: 'Sunita Rao',
      email: 'sunita@bluedart-partner.com',
      phone: '+91 97222 55667',
      value: 220000,
      status: 'CONTACTED',
      followUpDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      assignedToId: exec2.id,
      branch: 'Bangalore',
    },
  });

  const lead3 = await prisma.lead.create({
    data: {
      title: 'ERP & Operations Integration Package',
      contactName: 'Vikram Singhania',
      email: 'vikram@bharatsteel.com',
      phone: '+91 98333 77889',
      value: 750000,
      status: 'PROPOSAL',
      followUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      assignedToId: manager.id,
      branch: 'Mumbai',
    },
  });

  const lead4 = await prisma.lead.create({
    data: {
      title: 'Omnichannel POS Setup',
      contactName: 'Deepak Joshi',
      email: 'deepak@citymart.in',
      phone: '+91 96555 88990',
      value: 125000,
      status: 'NEW',
      followUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      assignedToId: exec1.id,
      branch: 'Mumbai',
    },
  });

  console.log('🎯 Created 4 Leads across stages');

  // 4. Create Orders (Including the Concurrency Demo Order!)
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-1001',
      customerId: customer1.id,
      employeeId: exec1.id,
      amount: 50000, // Ready for the concurrency scenario: Employee A (₹55k) vs Employee B (₹60k)
      status: 'PROCESSING',
      paymentStatus: 'UNPAID',
      version: 1,
      notes: 'Initial enterprise support contract for Q1',
    },
  });

  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-1002',
      customerId: customer2.id,
      employeeId: exec2.id,
      amount: 180000,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      version: 2,
      notes: 'Dedicated cloud server provisioning and SLA',
    },
  });

  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-1003',
      customerId: customer3.id,
      employeeId: exec1.id,
      amount: 95000,
      status: 'PROCESSING',
      paymentStatus: 'PARTIAL',
      version: 1,
      notes: 'Fleet software licenses and GPS telemetry integration',
    },
  });

  console.log('📦 Created 3 Orders (ORD-1001 ready for Concurrency OCC demonstration)');

  // 5. Create Payments
  await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-1001',
      orderId: order2.id,
      amount: 180000,
      paymentMethod: 'BANK_TRANSFER',
      transactionRef: 'NEFT-HDFC-99238411',
      notes: 'Full settlement for ORD-1002',
      createdById: exec2.id,
    },
  });

  await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-1002',
      orderId: order3.id,
      amount: 40000,
      paymentMethod: 'UPI',
      transactionRef: 'UPI-RAZORPAY-882194',
      notes: 'Advance 40k paid towards ORD-1003',
      createdById: exec1.id,
    },
  });

  console.log('💳 Created 2 Payments');

  // 6. Create Tasks
  await prisma.task.create({
    data: {
      title: 'Quarterly Review Meeting with Acme Technologies',
      description: 'Discuss Q2 renewal and SLA compliance with C-suite',
      priority: 'HIGH',
      status: 'PENDING',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      assignedToId: exec1.id,
      createdById: manager.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Verify Payment Receipt for ORD-1003',
      description: 'Check bank settlement statement for Zenith Logistics',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      assignedToId: exec1.id,
      createdById: manager.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Schedule Technical Demo for Bharat Steel',
      description: 'Showcase ERP connector with custom SAP endpoints',
      priority: 'MEDIUM',
      status: 'PENDING',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      assignedToId: manager.id,
      createdById: admin.id,
    },
  });

  console.log('📋 Created 3 Operational Tasks');

  // 7. Create Audit History illustrating requirement examples:
  // "Rahul created customer CUST-1023"
  // "Amit changed lead status: NEW → QUALIFIED"
  // "Rahul updated order: ₹50,000 → ₹55,000"
  await prisma.auditLog.create({
    data: {
      userId: exec1.id,
      userName: exec1.fullName,
      userRole: exec1.role,
      entityType: 'CUSTOMER',
      entityId: customer5.id,
      action: 'CREATE',
      summary: `${exec1.fullName} created customer CUST-1023 (Reliance Logistics Allied)`,
      details: JSON.stringify({ code: 'CUST-1023', status: 'ACTIVE' }),
      createdAt: new Date(Date.now() - 3 * 3600 * 1000),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: manager.id,
      userName: manager.fullName,
      userRole: manager.role,
      entityType: 'LEAD',
      entityId: lead1.id,
      action: 'STATUS_CHANGE',
      summary: `${manager.fullName} changed lead status: NEW → QUALIFIED`,
      details: JSON.stringify({ status: { old: 'NEW', new: 'QUALIFIED' } }),
      createdAt: new Date(Date.now() - 2 * 3600 * 1000),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: exec1.id,
      userName: exec1.fullName,
      userRole: exec1.role,
      entityType: 'ORDER',
      entityId: order1.id,
      action: 'UPDATE',
      summary: `${exec1.fullName} updated order ${order1.orderNumber}: ₹45,000 → ₹50,000`,
      details: JSON.stringify({
        oldAmount: 45000,
        newAmount: 50000,
        oldVersion: 0,
        newVersion: 1,
      }),
      createdAt: new Date(Date.now() - 1 * 3600 * 1000),
    },
  });

  console.log('📜 Created Audit Trail entries matching specification examples.');
  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
