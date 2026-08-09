import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {
  initialProfileSubmissionState,
  profileSubmissionReducer,
} from "../lib/profile/submission-state";

test("profile save has an explicit pending and success state", () => {
  const saving = profileSubmissionReducer(
    { phase: "idle", message: "" },
    { type: "save" },
  );
  assert.equal(saving.phase, "saving");
  assert.match(saving.message, /Saving privately/);

  const saved = profileSubmissionReducer(saving, { type: "saved" });
  assert.equal(saved.phase, "success");
  assert.match(saved.message, /is saved/);
});

test("profile save failure is retryable and does not imply that form data changed", () => {
  const failed = profileSubmissionReducer(
    { phase: "saving", message: "Saving privately…" },
    { type: "failed", message: "The connection was interrupted. Your changes are still here." },
  );
  assert.deepEqual(failed, {
    phase: "error",
    message: "The connection was interrupted. Your changes are still here.",
  });
  const retrying = profileSubmissionReducer(failed, { type: "save" });
  assert.equal(retrying.phase, "saving");
});

test("duplicate save transitions remain pending", () => {
  const saving = { phase: "saving", message: "Saving privately…" } as const;
  assert.equal(profileSubmissionReducer(saving, { type: "save" }), saving);
  assert.equal(initialProfileSubmissionState.phase, "loading");
});

test("Style in your own words uses high-contrast editable text", () => {
  const source = fs.readFileSync("app/profile/profile-form.tsx", "utf8");
  assert.match(source, /Style in your own words/);
  assert.match(source, /bg-\[#fffaf3\]/);
  assert.match(source, /text-\[#2f4039\]/);
  assert.match(source, /placeholder:text-\[#74696b\]/);
});
