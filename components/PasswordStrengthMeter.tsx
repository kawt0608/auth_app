"use client";

import { evaluatePasswordStrength } from "@/lib/password-strength";

type PasswordStrengthMeterProps = {
  password: string;
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = evaluatePasswordStrength(password);
  const level =
    strength.score <= 2 ? "weak" : strength.score <= 4 ? "medium" : "strong";

  return (
    <div className="strength" aria-live="polite">
      <div className="strength__top">
        <span>Strength: {password ? strength.label : "Not entered"}</span>
        <span>
          {strength.score}/{strength.maxScore}
        </span>
      </div>
      <div className="strength__bar" aria-hidden="true">
        <div
          className="strength__fill"
          data-level={level}
          style={{ width: `${strength.percent}%` }}
        />
      </div>
      <ul className="check-grid" aria-label="Password requirements">
        {strength.checks.map((check) => (
          <li
            className="check-pill"
            data-passed={check.passed}
            key={check.key}
          >
            {check.passed ? "OK " : "Missing "}
            {check.label}
          </li>
        ))}
      </ul>
      {password && strength.improvements.length > 0 ? (
        <ul className="hint-list">
          {strength.improvements.map((improvement) => (
            <li key={improvement}>{improvement}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
