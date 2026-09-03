import assert from "node:assert/strict";
import test from "node:test";
import { safeInternalPath } from "../lib/security/paths";

test("accepts only same-origin relative redirect paths", () => {
  assert.equal(safeInternalPath("/closet?category=Dress"), "/closet?category=Dress");
  assert.equal(safeInternalPath("//attacker.example/path"), "/today");
  assert.equal(safeInternalPath("https://attacker.example/path"), "/today");
  assert.equal(safeInternalPath("/\\attacker.example"), "/today");
});
