/**
 * Phase 1 — v3 migration: rollup tables, app_state, idempotent metrics_history.
 * Verifies the migration applies, is idempotent (init twice on the same DATA_DIR),
 * and that the tables exist with the exact contract columns.
 */
const path = require("path");
const fs = require("fs");
const os = require("os");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cockpit-mig-v3-"));
process.env.DATA_DIR = tmpDir;

const sqlite = require("../src/db/sqlite");

function columnsOf(db, table) {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((c) => c.name)
    .sort();
}

function tableExists(db, table) {
  return !!db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(table);
}

const ROLLUP_COLUMNS = [
  "bucket_start",
  "cpu_min", "cpu_max", "cpu_avg",
  "memory_min", "memory_max", "memory_avg",
  "disk_min", "disk_max", "disk_avg",
  "load_min", "load_max", "load_avg",
  "container_total_min", "container_total_max", "container_total_avg",
  "container_running_min", "container_running_max", "container_running_avg",
  "sample_count",
].sort();

describe("v3 migration", () => {
  let db;

  afterAll(() => {
    if (db) db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("creates the v3 tables with the contract columns", () => {
    db = sqlite.init();

    expect(tableExists(db, "metrics_rollup_hourly")).toBe(true);
    expect(tableExists(db, "metrics_rollup_daily")).toBe(true);
    expect(tableExists(db, "app_state")).toBe(true);
    expect(tableExists(db, "metrics_history")).toBe(true);

    expect(columnsOf(db, "metrics_rollup_hourly")).toEqual(ROLLUP_COLUMNS);
    expect(columnsOf(db, "metrics_rollup_daily")).toEqual(ROLLUP_COLUMNS);
    expect(columnsOf(db, "app_state")).toEqual(["key", "value"].sort());

    const histCols = columnsOf(db, "metrics_history");
    for (const c of [
      "id", "cpu_percent", "memory_percent", "disk_percent",
      "load_1", "container_total", "container_running", "created_at",
    ]) {
      expect(histCols).toContain(c);
    }
  });

  test("records the v3 migration version exactly once", () => {
    const row = db
      .prepare("SELECT COUNT(*) AS n FROM schema_migrations WHERE version = 3")
      .get();
    expect(row.n).toBe(1);
  });

  test("bucket_start is the primary key on both rollup tables", () => {
    for (const t of ["metrics_rollup_hourly", "metrics_rollup_daily"]) {
      const pk = db.prepare(`PRAGMA table_info(${t})`).all().filter((c) => c.pk > 0);
      expect(pk.map((c) => c.name)).toEqual(["bucket_start"]);
    }
  });

  test("is idempotent — re-running runMigrations does not duplicate or throw", () => {
    expect(() => sqlite.runMigrations(db)).not.toThrow();
    const row = db
      .prepare("SELECT COUNT(*) AS n FROM schema_migrations WHERE version = 3")
      .get();
    expect(row.n).toBe(1);
  });
});
