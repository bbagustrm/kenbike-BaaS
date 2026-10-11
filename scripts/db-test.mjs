#!/usr/bin/env node
// Runner tes database tanpa Docker: menjalankan supabase/tests/*.test.sql ke
// project Supabase yang di-link (`supabase link`) lewat `supabase db query`.
// Setiap file dibungkus BEGIN ... ROLLBACK sehingga tidak meninggalkan data.
//
// Pemakaian: bun run db:test [filter]

import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TESTS_DIR = "supabase/tests";
const filter = process.argv[2];

const helpers = readFileSync(join(TESTS_DIR, "_helpers.sql"), "utf8");
const files = readdirSync(TESTS_DIR)
  .filter((f) => f.endsWith(".test.sql") && (!filter || f.includes(filter)))
  .sort();

if (files.length === 0) {
  console.error("Tidak ada file tes yang cocok.");
  process.exit(1);
}

const workDir = mkdtempSync(join(tmpdir(), "kenbike-db-test-"));
let failed = 0;
let total = 0;

try {
  for (const file of files) {
    const sql = [
      "begin;",
      helpers,
      readFileSync(join(TESTS_DIR, file), "utf8"),
      "reset role;",
      "select ok, name, detail from _results order by n;",
      "rollback;",
    ].join("\n");

    const path = join(workDir, file);
    writeFileSync(path, sql);

    const res = spawnSync(
      "bunx",
      ["supabase", "db", "query", "--linked", "-o", "json", "-f", path],
      {
        encoding: "utf8",
        shell: process.platform === "win32",
      },
    );

    console.log(`\n▶ ${file}`);
    const out = res.stdout ?? "";
    const start = out.indexOf("{");
    if (res.status !== 0 || start === -1) {
      console.log(`  ✗ gagal dijalankan\n${res.stderr || out}`);
      failed++;
      total++;
      continue;
    }

    const rows = JSON.parse(out.slice(start)).rows ?? [];
    for (const row of rows) {
      total++;
      if (row.ok) {
        console.log(`  ✓ ${row.name}`);
      } else {
        failed++;
        console.log(`  ✗ ${row.name}${row.detail ? `\n      ${row.detail}` : ""}`);
      }
    }
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

console.log(`\n${total - failed}/${total} lulus`);
process.exit(failed > 0 ? 1 : 0);
