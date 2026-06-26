// Export-surface guard. The Pro/Enterprise overlay (cockpit-pro) receives the
// metricsHistory module via scoped services (extensions/index.js services.metricsHistory)
// and couples to its JS function surface — NOT to the rollup tables, which scoped
// extensions cannot read (createScopedDb blocks unprefixed table access). Renaming or
// dropping any of these four exports silently breaks the overlay. Spec §9.
const metricsHistory = require("../src/system/history");

// The four backward-compatible exports the overlay depends on.
const REQUIRED_EXPORTS = ["init", "recordMetrics", "getHistory", "getHistorySummary"];

describe("metricsHistory export surface (Pro overlay contract)", () => {
  test("exports exactly the required backward-compatible functions (snapshot)", () => {
    const surface = REQUIRED_EXPORTS.filter((k) => typeof metricsHistory[k] === "function").sort();
    expect(surface).toMatchInlineSnapshot(`
[
  "getHistory",
  "getHistorySummary",
  "init",
  "recordMetrics",
]
`);
  });

  test.each(REQUIRED_EXPORTS)("exports %s as a function", (name) => {
    expect(typeof metricsHistory[name]).toBe("function");
  });
});
