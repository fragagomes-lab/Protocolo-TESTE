/**
 * Dependency-free unit tests for the shared clinical-photo report rules.
 * Runs with Node's built-in test runner (no api-server, web, or mobile app
 * needed): `pnpm --filter @workspace/api-client-react run test:unit`
 *
 * Invariants pinned here:
 *   1. The header (cover) photo is always included in the report.
 *   2. Excluding a photo from the report also clears its header flag.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  type PhotoReportFlags,
  setPhotoIncludedInReport,
  setPhotoAsHeader,
  isPhotoReportFlagsValid,
  normalizePhotoReportFlags,
} from "./photo-report-rules.ts";

const flags = (
  includeInPdf: boolean,
  isHeaderPhoto: boolean,
): PhotoReportFlags => ({ includeInPdf, isHeaderPhoto });

// --- setPhotoIncludedInReport -----------------------------------------------

test("excluding a header photo clears its header flag (rule #2)", () => {
  assert.deepEqual(
    setPhotoIncludedInReport(flags(true, true), false),
    flags(false, false),
  );
});

test("excluding a non-header photo just excludes it", () => {
  assert.deepEqual(
    setPhotoIncludedInReport(flags(true, false), false),
    flags(false, false),
  );
});

test("including a photo preserves its header flag", () => {
  assert.deepEqual(
    setPhotoIncludedInReport(flags(true, true), true),
    flags(true, true),
  );
  assert.deepEqual(
    setPhotoIncludedInReport(flags(false, false), true),
    flags(true, false),
  );
});

test("re-including an (invalid) excluded header photo keeps the header flag", () => {
  // Recovering the invalid state via inclusion restores validity.
  assert.deepEqual(
    setPhotoIncludedInReport(flags(false, true), true),
    flags(true, true),
  );
});

test("excluding is idempotent", () => {
  const once = setPhotoIncludedInReport(flags(true, true), false);
  assert.deepEqual(setPhotoIncludedInReport(once, false), once);
});

// --- setPhotoAsHeader ---------------------------------------------------------

test("marking as header forces inclusion (rule #1)", () => {
  assert.deepEqual(setPhotoAsHeader(flags(false, false), true), flags(true, true));
  assert.deepEqual(setPhotoAsHeader(flags(true, false), true), flags(true, true));
});

test("un-marking header preserves the include flag", () => {
  assert.deepEqual(setPhotoAsHeader(flags(true, true), false), flags(true, false));
  assert.deepEqual(
    setPhotoAsHeader(flags(false, false), false),
    flags(false, false),
  );
});

test("un-marking header on an (invalid) excluded header photo leaves it excluded", () => {
  assert.deepEqual(setPhotoAsHeader(flags(false, true), false), flags(false, false));
});

test("marking header is idempotent", () => {
  const once = setPhotoAsHeader(flags(false, false), true);
  assert.deepEqual(setPhotoAsHeader(once, true), once);
});

// --- isPhotoReportFlagsValid --------------------------------------------------

test("only header+excluded is invalid", () => {
  assert.equal(isPhotoReportFlagsValid(flags(true, true)), true);
  assert.equal(isPhotoReportFlagsValid(flags(true, false)), true);
  assert.equal(isPhotoReportFlagsValid(flags(false, false)), true);
  assert.equal(isPhotoReportFlagsValid(flags(false, true)), false);
});

// --- normalizePhotoReportFlags ------------------------------------------------

test("normalize coerces the invalid header+excluded state by dropping the header flag", () => {
  assert.deepEqual(normalizePhotoReportFlags(flags(false, true)), flags(false, false));
});

test("normalize leaves all valid states untouched", () => {
  for (const f of [flags(true, true), flags(true, false), flags(false, false)]) {
    assert.deepEqual(normalizePhotoReportFlags(f), f);
  }
});

test("normalize output is always valid (exhaustive)", () => {
  for (const includeInPdf of [true, false]) {
    for (const isHeaderPhoto of [true, false]) {
      const out = normalizePhotoReportFlags(flags(includeInPdf, isHeaderPhoto));
      assert.equal(isPhotoReportFlagsValid(out), true);
    }
  }
});

// --- transitions always yield valid states ------------------------------------

test("every transition from every state yields a valid state (exhaustive)", () => {
  for (const includeInPdf of [true, false]) {
    for (const isHeaderPhoto of [true, false]) {
      const start = flags(includeInPdf, isHeaderPhoto);
      for (const choice of [true, false]) {
        assert.equal(
          isPhotoReportFlagsValid(setPhotoIncludedInReport(start, choice)),
          true,
        );
        assert.equal(
          isPhotoReportFlagsValid(setPhotoAsHeader(start, choice)),
          true,
        );
      }
    }
  }
});
