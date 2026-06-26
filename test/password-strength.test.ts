import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluatePasswordStrength,
  isAcceptablePassword
} from "@/lib/password-strength";

test("password strength evaluates all required character classes", () => {
  const weak = evaluatePasswordStrength("abc");
  assert.equal(weak.score, 1);
  assert.equal(weak.label, "Weak");
  assert.ok(weak.improvements.includes("Use at least 10 characters."));

  const strong = evaluatePasswordStrength("Password123!");
  assert.equal(strong.score, 5);
  assert.equal(strong.label, "Strong");
  assert.deepEqual(strong.improvements, []);
});

test("acceptable passwords must be strong enough and bounded", () => {
  assert.equal(isAcceptablePassword("Password123!"), true);
  assert.equal(isAcceptablePassword("password123"), false);
  assert.equal(isAcceptablePassword("A1!".repeat(60)), false);
});
