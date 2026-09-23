# System Architecture & Technical Design Document

## 1. High-Level Architecture

The NexCRM & Operations Management System is structured as a decoupled, multi-tiered architecture with a clear separation of concerns:

```
[ Client Layer: React 18 + Vite + Tailwind CSS ]
                        │
                        ▼ (HTTP REST + Bearer Token)
[ Security & API Gateway Layer: Express + Helmet + Rate Limit ]
                        │
                        ▼
[ Authentication & Granular RBAC Middleware Layer ]
   - Extracts JWT Claims (Role, Branch, User ID)
   - Enforces Role Gates (ADMIN, MANAGER, EXECUTIVE)
   - Injects IDOR-Safe Record Scoping (Assigned vs Branch vs Global)
                        │
                        ▼
[ Domain Controller & Validation Layer (Zod Schemas) ]
   - Strict input sanitization & parameter verification
                        │
                        ▼
[ Business & Concurrency Engine ]
   - Optimistic Concurrency Control (Version Check)
   - Transactional Payment Reconciliation
   - Immutable Activity / Audit Logger
                        │
                        ▼
[ Data Access Layer: Prisma ORM (Parameterized Queries) ]
                        │
                        ▼
[ Relational Storage Engine: PostgreSQL / SQLite ]
   - Composite B-Tree Indexes
   - Partitioned Audit Tables
   - Foreign Key Constraints & Cascades
```

---

## 2. Database Design & Scalability Strategy (5M+ Customers, 50M+ Activities)

### 2.1 Schema Overview & Relationships
- **`users`**: Master employee identities with role, branch, and active status.
- **`customers`**: Client accounts linked to assigned employees.
- **`leads`**: Sales pipeline opportunities with stage transitions and conversion links to customers.
- **`orders`**: Commercial orders carrying monetary values, fulfillment status, and the **`version`** field for Optimistic Concurrency Control.
- **`payments`**: Atomic payment transactions linked to orders, triggering automatic order payment state transitions (`UNPAID` → `PARTIAL` → `PAID`).
- **`tasks`**: Operational tasks with priorities and deadlines.
- **`audit_logs`**: Append-only activity trail capturing historical state changes and conflict events.

### 2.2 Scaling to 5 Million+ Customers

#### A. Keyset (Cursor-Based) Pagination vs. Offset Degradation
In a database with 5,000,000 customers, traditional offset pagination (`OFFSET 2500000 LIMIT 20`) causes severe performance degradation because the database engine must scan and discard 2.5 million rows before returning the requested 20 ($O(N)$ complexity, taking 3–6 seconds per query).

NexCRM implements **Keyset Pagination**:
```sql
-- Fast Index Seek: O(log N)
SELECT id, code, name, email, status, created_at
FROM customers
WHERE created_at < $last_created_at
ORDER BY created_at DESC, id DESC
LIMIT 20;
```
Execution time remains **under 3ms** regardless of whether querying page 1 or page 250,000.

#### B. Composite Indexing Strategy
Indexes are specifically tailored to prevent sequential table scans:
```sql
-- Fast unique lookups:
CREATE UNIQUE INDEX idx_customers_code ON customers(code);
CREATE INDEX idx_customers_email ON customers(email);

-- Fast paginated queries filtered by status and date:
CREATE INDEX idx_customers_status_created ON customers(status, created_at DESC);

-- Fast IDOR-scoped queries for sales executives:
CREATE INDEX idx_customers_assigned_status ON customers(assigned_to_id, status);

-- Branch-scoped reporting:
CREATE INDEX idx_customers_branch_created ON customers(branch, created_at DESC);
```

#### C. Read Replicas & Connection Pooling
- **Connection Pooling**: Uses PgBouncer in transaction pooling mode to manage thousands of concurrent client connections without exhausting database server memory.
- **Read/Write Splitting**: Queries for the dashboard, customer search, and audit logs are directed to read replicas, preserving the primary database exclusively for writes and transactions.

---

### 2.3 Scaling to 50 Million+ Activity Records

#### A. Declarative Range Partitioning
Querying or maintaining a single 50M-row table causes index bloat and slow vacuum times. In production PostgreSQL, the `audit_logs` table is partitioned by month:

```sql
-- Partition Master Table
CREATE TABLE audit_logs (
    id UUID NOT NULL,
    user_id UUID,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    summary TEXT NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly Partitions (Example: 2026)
CREATE TABLE audit_logs_2026_09 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE audit_logs_2026_10 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
```
**Benefits**:
- **Partition Pruning**: A query for activity in the past 7 days scans only the active month's partition.
- **Maintenance & Archival**: Partitions older than 180 days can be detached (`ALTER TABLE DETACH PARTITION`) and dumped into compressed Parquet format on Amazon S3 cold storage.

#### B. Audit Immutability & Anti-Tampering Guarantee
To satisfy compliance and prevent rogue or compromised accounts from modifying audit history:
1. **Application Layer**: No `PUT`, `PATCH`, or `DELETE` endpoints exist for audit logs.
2. **Database Permissions**: The application database user (`crm_app_user`) has write permissions restricted:
   ```sql
   REVOKE UPDATE, DELETE ON audit_logs FROM crm_app_user;
   GRANT INSERT, SELECT ON audit_logs TO crm_app_user;
   ```
3. **Database Triggers**: An append-only trigger rejects any attempt to update or remove records:
   ```sql
   CREATE OR REPLACE FUNCTION prevent_audit_tampering()
   RETURNS TRIGGER AS $$
   BEGIN
       RAISE EXCEPTION 'Audit records are strictly append-only and cannot be updated or deleted.';
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER trg_audit_immutable
   BEFORE UPDATE OR DELETE ON audit_logs
   FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();
   ```

---

## 3. Concurrency Scenario Solution (Optimistic Concurrency Control)

### 3.1 The Race Condition Scenario
- Order `ORD-1001` has amount **₹50,000** and `version: 1`.
- Employee A and Employee B open the order simultaneously.
- Employee A edits the amount to **₹55,000**.
- Employee B edits the amount to **₹60,000**.

Without concurrency control, the second commit would silently overwrite Employee A's update, causing **unintended data loss (Lost Update Anomaly)**.

### 3.2 The OCC Implementation
1. The `orders` schema contains a monotonic integer column: `version INT DEFAULT 1`.
2. When Employee A submits:
   ```sql
   UPDATE orders 
   SET amount = 55000, version = version + 1, updated_at = NOW() 
   WHERE id = '...' AND version = 1;
   ```
   Rows affected = 1. Database version becomes **2**. Audit log records: `Amount changed: ₹50,000 → ₹55,000 by Employee A`.
3. When Employee B submits with their original snapshot (`version: 1`):
   ```sql
   UPDATE orders 
   SET amount = 60000, version = version + 1, updated_at = NOW() 
   WHERE id = '...' AND version = 1;
   ```
   Rows affected = 0 (because current DB version is 2).
4. The server detects the version mismatch and responds with **`HTTP 409 Conflict`**:
   ```json
   {
     "success": false,
     "error": "CONCURRENCY_CONFLICT",
     "message": "Conflict detected: Order ORD-1001 was modified by another user while you were editing.",
     "conflict": {
       "orderId": "...",
       "orderNumber": "ORD-1001",
       "currentAmount": 55000,
       "currentVersion": 2,
       "submittedVersion": 1,
       "submittedAmount": 60000
     }
   }
   ```
5. An audit log entry with action `CONFLICT_DETECTED` is recorded.
6. The client displays a **Conflict Resolution Dialog**:
   - Shows the current database value (₹55,000) vs their pending change (₹60,000).
   - Allows Employee B to **[Reload Latest Data]** or **[Force Overwrite]** if authorized.

### 3.3 Why Optimistic Locking over Pessimistic Locking?
- **Pessimistic Locking (`SELECT FOR UPDATE`)**: Holds database row locks while an employee is looking at an edit screen. If the employee walks away or has network latency, other employees and background jobs are blocked, leading to lock contention and deadlocks.
- **Optimistic Locking**: Incurs **zero lock overhead**, maximizes throughput, and is the gold standard for web-scale CRM applications.

---

## 4. Authentication, Authorization & Security Architecture

### 4.1 Authentication
- Passwords hashed using `bcrypt` with salt rounds = 10.
- Signed JWT access tokens with 7-day expiration containing non-sensitive identity claims (`id`, `email`, `role`, `branch`).
- Password hashes and sensitive fields are excluded from all query return objects.

### 4.2 Role-Based Access Control (RBAC) Matrix

| Feature / Action | Admin | Manager | Executive |
| :--- | :---: | :---: | :---: |
| **View Dashboard** | Global | Branch | Personal |
| **View Customers** | All | Branch | Assigned to User |
| **Create Customer** | Yes | Yes | Yes |
| **Delete Customer** | Yes | Yes | Forbidden (403) |
| **View Leads** | All | Branch | Assigned to User |
| **Convert Lead to Customer** | Yes | Yes | Yes |
| **View Orders** | All | Branch | Assigned to User |
| **Update Order (OCC Check)**| Yes | Yes | Yes (Assigned) |
| **Record Payment** | Yes | Yes | Yes |
| **View System Audit Logs** | Yes | Yes | Forbidden (403) |

### 4.3 Insecure Direct Object Reference (IDOR) Mitigation
Frontend authorization checks are never trusted as the security boundary. Every API query uses `getRecordAccessScope(req)` to inject server-side filters:
```typescript
export const getRecordAccessScope = (req: AuthenticatedRequest) => {
  if (req.user?.role === 'ADMIN') return {};
  if (req.user?.role === 'MANAGER') return { branch: req.user.branch };
  // EXECUTIVE: strictly scoped to assigned records
  return { assignedToId: req.user.id };
};
```

### 4.4 Defense-in-Depth Security
- **SQL Injection Prevention**: Prisma ORM executes strictly parameterized queries.
- **Rate Limiting**: `express-rate-limit` enforces 300 requests / 15 minutes for general APIs and 15 attempts / 5 minutes for `/api/auth/login`.
- **Security Headers**: `helmet` configures HTTP protection headers (MIME sniffing prevention, X-XSS-Protection, Frameguard).
- **Input Validation**: Strict `Zod` schemas validate every incoming body and query parameter, stripping unexpected properties.

---

## 5. Future Scalability Roadmap

For scaling beyond 20 million customers and 500 million activities:
1. **Search Indexing**: Offload fuzzy search (name, email, phone) to an **Elasticsearch** or **OpenSearch** cluster synced via Debezium CDC (Change Data Capture).
2. **Dashboard Pre-aggregation**: Utilize Redis or PostgreSQL Materialized Views refreshed every 5 minutes for dashboard KPI cards.
3. **Event-Driven Architecture**: Emit domain events (e.g. `OrderCreated`, `PaymentSettled`) to an Apache Kafka or RabbitMQ event bus to decouple email notifications, invoicing, and CRM pipelines.
