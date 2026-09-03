import assert from "node:assert/strict";
import test from "node:test";
import { requiredResponseText } from "../lib/ai/response-text";

test("accepts and trims a visible AI response", () => {
  assert.equal(requiredResponseText({ output_text: "  Try the navy dress.  " }), "Try the navy dress.");
});

test("rejects empty or missing AI response text", () => {
  assert.equal(requiredResponseText({ output_text: "   ", status: "completed" }), null);
  assert.equal(requiredResponseText({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" } }), null);
});
