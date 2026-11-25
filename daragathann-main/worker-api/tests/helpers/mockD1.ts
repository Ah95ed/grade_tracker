import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

function toSqliteValues(values: unknown[]): SQLInputValue[] {
  return values.map((v) => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number' || typeof v === 'string' || v instanceof Uint8Array) return v;
    return String(v);
  });
}

class MockD1PreparedStatement implements D1PreparedStatement {
  private boundValues: unknown[] = [];

  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    const clone = new MockD1PreparedStatement(this.db, this.sql);
    clone.boundValues = values;
    return clone;
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const stmt = this.db.prepare(this.sql);
    const row = stmt.get(...toSqliteValues(this.boundValues)) as Record<string, unknown> | undefined;
    if (!row) return null;
    if (colName) {
      return (row[colName] ?? null) as T | null;
    }
    return row as T;
  }

  async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const stmt = this.db.prepare(this.sql);
    const hasReturning = /\bRETURNING\b/i.test(this.sql);
    if (hasReturning) {
      const results = stmt.all(...toSqliteValues(this.boundValues)) as T[];
      return {
        results,
        success: true,
        meta: {
          duration: 0,
          size_after: 0,
          rows_read: results.length,
          rows_written: results.length,
          last_row_id: 0,
          changed_db: true,
          changes: results.length,
        },
      };
    }

    const info = stmt.run(...toSqliteValues(this.boundValues));
    return {
      results: [],
      success: true,
      meta: {
        duration: 0,
        size_after: 0,
        rows_read: 0,
        rows_written: Number(info.changes ?? 0),
        last_row_id: Number(info.lastInsertRowid ?? 0),
        changed_db: Number(info.changes ?? 0) > 0,
        changes: Number(info.changes ?? 0),
      },
    };
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const stmt = this.db.prepare(this.sql);
    const results = stmt.all(...toSqliteValues(this.boundValues)) as T[];
    return {
      results,
      success: true,
      meta: {
        duration: 0,
        size_after: 0,
        rows_read: results.length,
        rows_written: 0,
        last_row_id: 0,
        changed_db: false,
        changes: 0,
      },
    };
  }

  raw<T = unknown[]>(options: { columnNames: true }): Promise<[string[], ...T[]]>;
  raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>;
  async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[] | [string[], ...T[]]> {
    const stmt = this.db.prepare(this.sql);
    const rows = stmt.all(...toSqliteValues(this.boundValues)) as Record<string, unknown>[];
    if (rows.length === 0) {
      return options?.columnNames ? ([[]] as [string[], ...T[]]) : [];
    }
    const cols = Object.keys(rows[0]);
    const data = rows.map((r) => cols.map((c) => r[c])) as unknown as T[];
    if (options?.columnNames) {
      return [cols, ...data];
    }
    return data;
  }

  async executeBatchInternal(): Promise<D1Result<Record<string, unknown>>> {
    return this.run();
  }
}

export class MockD1Database implements D1Database {
  public readonly sqlite: DatabaseSync;

  constructor() {
    this.sqlite = new DatabaseSync(':memory:');
    this.sqlite.exec('PRAGMA foreign_keys = ON;');
  }

  prepare(query: string): D1PreparedStatement {
    return new MockD1PreparedStatement(this.sqlite, query);
  }

  async dump(): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    this.sqlite.exec('BEGIN IMMEDIATE;');
    try {
      for (const stmt of statements) {
        const res = await (stmt as unknown as MockD1PreparedStatement).executeBatchInternal();
        results.push(res as unknown as D1Result<T>);
      }
      this.sqlite.exec('COMMIT;');
      return results;
    } catch (err) {
      this.sqlite.exec('ROLLBACK;');
      throw err;
    }
  }

  async exec(query: string): Promise<D1ExecResult> {
    this.sqlite.exec(query);
    return { count: 1, duration: 0 };
  }

  withSession(): D1DatabaseSession {
    throw new Error('withSession not implemented in MockD1Database');
  }
}

export function createMigratedTestDb(): MockD1Database {
  const db = new MockD1Database();
  const migrationsDir = path.resolve(__dirname, '../../migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.sqlite.exec(sql);
  }
  return db;
}
