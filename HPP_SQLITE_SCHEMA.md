# HPP SQLite Schema Design

**Purpose:** Append-only event storage for replay systems

---

## Design Principles

1. **Append-Only:** Events are never updated or deleted
2. **No Payload Flattening:** Event data stored as JSON, not individual columns
3. **Idempotent:** Unique constraints prevent duplicate events
4. **Replay-Ready:** Cursor-based iteration via sequence numbers
5. **Multiple Timestamps:** Track occurredAt, receivedAt, persistedAt separately

---

## Events Table

```sql
CREATE TABLE events (
  -- Primary key
  id TEXT PRIMARY KEY, -- UUID v7

  -- Event metadata
  type TEXT NOT NULL, -- HPPEventType
  schema_version INTEGER NOT NULL, -- Immutable version number

  -- Timestamps
  timestamp TEXT NOT NULL, -- occurredAt - when the business event happened
  received_at TEXT NOT NULL, -- when HPP received the event
  persisted_at TEXT NOT NULL, -- when the event was stored

  -- Ordering for replay systems
  sequence INTEGER PRIMARY KEY AUTOINCREMENT, -- Explicit ordering

  -- Event data (no flattening)
  payload_json TEXT NOT NULL, -- JSON string of event.data
  metadata_json TEXT, -- JSON string of event.metadata

  -- Idempotency
  -- Unique constraint on event ID prevents duplicates
  -- Additional unique constraint on (provider, eventType, providerObjectId)
  -- for external idempotency (Kit webhooks, Google retries)

  -- Indexes for replay systems
  INDEX idx_events_sequence (sequence),
  INDEX idx_events_timestamp (timestamp),
  INDEX idx_events_type (type),
  INDEX idx_events_schema_version (schema_version),

  -- Indexes for legacy queries (kept for compatibility)
  INDEX idx_events_payload_email (payload_json) -- For email lookups via JSON extraction
);
```

---

## Idempotency Constraints

### Option 1: Event ID Uniqueness
```sql
-- Already covered by PRIMARY KEY on id
```

### Option 2: Provider-Based Idempotency
```sql
CREATE TABLE event_provenance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'kit', 'google', 'manual', 'form'
  event_type TEXT NOT NULL,
  provider_object_id TEXT, -- Kit subscriber ID, Google review ID, etc.
  UNIQUE(provider, event_type, provider_object_id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);
```

**Why:** Kit webhooks retry, Google retries, browsers retry. This prevents duplicate events from the same source.

---

## Aggregate Tracking (Future)

```sql
CREATE TABLE aggregates (
  id TEXT PRIMARY KEY, -- Aggregate ID
  type TEXT NOT NULL, -- 'Customer', 'Estimate', 'Review', 'NewsletterSubscriber'
  current_state_json TEXT, -- Current state of the aggregate
  last_event_sequence INTEGER, -- Sequence number of last event
  updated_at TEXT NOT NULL,
  INDEX idx_aggregates_type (type),
  INDEX idx_aggregates_last_sequence (last_event_sequence)
);
```

**Why:** PING can reconstruct aggregate histories much faster by tracking current state and last event sequence.

---

## Producer Metadata (Future)

```sql
ALTER TABLE events ADD COLUMN producer TEXT; -- 'hpp-website', 'hpp-api', 'kit-webhook'
ALTER TABLE events ADD COLUMN service_version TEXT; -- '1.0.0', '2026-07-28'
ALTER TABLE events ADD COLUMN runtime TEXT; -- 'node20', 'edge', 'lambda'
ALTER TABLE events ADD COLUMN deployment_id TEXT; -- Deployment identifier
```

**Why:** Debugging replay mismatches, understanding event provenance.

---

## Cursor-Based Replay Queries

### Find events since a cursor
```sql
SELECT * FROM events
WHERE sequence > ?
ORDER BY sequence ASC
LIMIT 1000;
```

### Find events since a timestamp
```sql
SELECT * FROM events
WHERE timestamp > ?
ORDER BY sequence ASC
LIMIT 1000;
```

### Find events for a specific aggregate
```sql
SELECT e.* FROM events e
JOIN event_aggregates ea ON e.id = ea.event_id
WHERE ea.aggregate_id = ?
ORDER BY e.sequence ASC;
```

---

## Migration Path

### Phase 1: In-Memory (Current)
- `InMemoryEventRepository` with array storage
- No persistence, events lost on restart

### Phase 2: SQLite (Next)
- `SQLiteEventRepository` implementing `EventRepository`
- Append-only schema as designed above
- Idempotency via unique constraints
- Cursor-based replay support

### Phase 3: Postgres/Supabase (Future)
- Same schema, different database
- Better for scaling, multi-region
- Same `EventRepository` interface

### Phase 4: Kafka (Future)
- Events published to Kafka topics
- `KafkaEventRepository` for streaming
- PING consumes from Kafka
- Same `EventRepository` interface

---

## Implementation Notes

### SQLiteEventRepository

```typescript
class SQLiteEventRepository implements EventRepository {
  private db: Database;

  async append(event: HPPEvent): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO events (
        id, type, schema_version, timestamp, received_at, persisted_at,
        payload_json, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.id,
      event.type,
      event.schemaVersion,
      event.timestamp,
      event.receivedAt,
      new Date().toISOString(), // persistedAt
      JSON.stringify(event.data),
      event.metadata ? JSON.stringify(event.metadata) : null
    );
  }

  async appendMany(events: HPPEvent[]): Promise<void> {
    const transaction = this.db.transaction((events: HPPEvent[]) => {
      for (const event of events) {
        this.append(event);
      }
    });
    transaction(events);
  }

  async findById(id: string): Promise<HPPEvent | null> {
    const row = this.db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    return row ? this.mapRowToEvent(row) : null;
  }

  async findSince(cursor: string): Promise<HPPEvent[]> {
    // Treat cursor as sequence number
    const sequence = parseInt(cursor, 10);
    const rows = this.db.prepare(
      'SELECT * FROM events WHERE sequence > ? ORDER BY sequence ASC LIMIT 1000'
    ).all(sequence);
    return rows.map(row => this.mapRowToEvent(row));
  }

  private mapRowToEvent(row: any): HPPEvent {
    return {
      id: row.id,
      type: row.type,
      schemaVersion: row.schema_version,
      timestamp: row.timestamp,
      receivedAt: row.received_at,
      persistedAt: row.persisted_at,
      data: JSON.parse(row.payload_json),
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
    };
  }
}
```

---

## Benefits of This Design

1. **Replay-Ready:** Cursor-based iteration via sequence numbers
2. **Idempotent:** Unique constraints prevent duplicate events
3. **Flexible:** No payload flattening, schema changes don't require migrations
4. **Debuggable:** Multiple timestamps for late-arriving events
5. **Scalable:** Same design works for SQLite, Postgres, Kafka
6. **PING-Friendly:** Append-only, immutable, replayable

---

## Blocking Issues

**PowerShell Execution Policy:** Cannot run `npm install better-sqlite3`

**Resolution Required:** User needs to:
1. Enable PowerShell script execution, OR
2. Run `npm install better-sqlite3 @types/better-sqlite3` manually

---

## Next Steps

1. **User Action:** Run `npm install better-sqlite3 @types/better-sqlite3`
2. **Developer Action:** Implement `SQLiteEventRepository`
3. **Developer Action:** Add database initialization to app startup
4. **Developer Action:** Add idempotency checks
5. **Developer Action:** Test cursor-based replay
6. **Developer Action:** Migrate from InMemoryEventRepository
