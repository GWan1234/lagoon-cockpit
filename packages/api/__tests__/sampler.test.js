const path = require("path");
const fs = require("fs");
const os = require("os");
const Database = require("better-sqlite3");

const metricsHistory = require("../src/system/history");

function freshDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cockpit-sampler-"));
  const db = new Database(path.join(dir, "test.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return { db, dir };
}

describe("recordMetrics NaN sanitization", () => {
  let db, dir;
  beforeEach(() => {
    ({ db, dir } = freshDb());
    metricsHistory.init(db);
  });
  afterEach(() => {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("non-finite load_1 (NaN) is coerced to NULL, not bound as NaN", () => {
    metricsHistory.recordMetrics(
      { cpuPercent: 12.5, memory: { percent: 40 }, disk: { percent: 55 }, load: { load1: NaN } },
      { total: 3, running: 2 },
    );
    const row = db
      .prepare("SELECT cpu_percent, memory_percent, disk_percent, load_1, container_total, container_running FROM metrics_history")
      .get();
    expect(row.load_1).toBeNull();
    expect(row.cpu_percent).toBe(12.5);
    expect(row.memory_percent).toBe(40);
    expect(row.disk_percent).toBe(55);
    expect(row.container_total).toBe(3);
    expect(row.container_running).toBe(2);
  });

  test("Infinity and -Infinity metrics are coerced to NULL", () => {
    metricsHistory.recordMetrics(
      { cpuPercent: Infinity, memory: { percent: -Infinity }, disk: { percent: 55 }, load: { load1: 0.7 } },
      { total: 1, running: 1 },
    );
    const row = db.prepare("SELECT cpu_percent, memory_percent, disk_percent FROM metrics_history").get();
    expect(row.cpu_percent).toBeNull();
    expect(row.memory_percent).toBeNull();
    expect(row.disk_percent).toBe(55);
  });

  test("finite numbers pass through unchanged", () => {
    metricsHistory.recordMetrics(
      { cpuPercent: 0, memory: { percent: 99.99 }, disk: { percent: 100 }, load: { load1: 1.23 } },
      { total: 0, running: 0 },
    );
    const row = db.prepare("SELECT cpu_percent, memory_percent, disk_percent, load_1 FROM metrics_history").get();
    expect(row.cpu_percent).toBe(0);
    expect(row.memory_percent).toBe(99.99);
    expect(row.disk_percent).toBe(100);
    expect(row.load_1).toBe(1.23);
  });
});
