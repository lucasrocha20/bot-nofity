import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "processed_orders.db");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS processed_orders (
    order_id TEXT PRIMARY KEY,
    processed_at TEXT NOT NULL
  )
`);

const isProcessedStmt = db.prepare(
  "SELECT 1 FROM processed_orders WHERE order_id = ?"
);
const markProcessedStmt = db.prepare(
  "INSERT OR IGNORE INTO processed_orders (order_id, processed_at) VALUES (?, ?)"
);

export function isProcessed(orderId: string): boolean {
  return isProcessedStmt.get(orderId) !== undefined;
}

export function markProcessed(orderId: string): void {
  markProcessedStmt.run(orderId, new Date().toISOString());
}
