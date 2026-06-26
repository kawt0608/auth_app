export type PasswordCheckKey =
  | "length"
  | "uppercase"
  | "lowercase"
  | "number"
  | "symbol";

export type PasswordCheck = {
  key: PasswordCheckKey;
  label: string;
  passed: boolean;
  improvement: string;
};

export type PasswordStrength = {
  score: number;
  maxScore: number;
  label: "Weak" | "Medium" | "Strong";
  percent: number;
  checks: PasswordCheck[];
  improvements: string[];
};

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const checks: PasswordCheck[] = [
    {
      key: "length",
      label: "At least 10 characters",
      passed: password.length >= 10,
      improvement: "Use at least 10 characters."
    },
    {
      key: "uppercase",
      label: "Uppercase letter",
      passed: /[A-Z]/.test(password),
      improvement: "Add at least one uppercase letter."
    },
    {
      key: "lowercase",
      label: "Lowercase letter",
      passed: /[a-z]/.test(password),
      improvement: "Add at least one lowercase letter."
    },
    {
      key: "number",
      label: "Number",
      passed: /\d/.test(password),
      improvement: "Add at least one number."
    },
    {
      key: "symbol",
      label: "Symbol",
      passed: /[^A-Za-z0-9]/.test(password),
      improvement: "Add at least one symbol."
    }
  ];

  const score = checks.filter((check) => check.passed).length;
  const label = score <= 2 ? "Weak" : score <= 4 ? "Medium" : "Strong";

  return {
    score,
    maxScore: checks.length,
    label,
    percent: Math.round((score / checks.length) * 100),
    checks,
    improvements: checks
      .filter((check) => !check.passed)
      .map((check) => check.improvement)
  };
}

export function isAcceptablePassword(password: string) {
  const strength = evaluatePasswordStrength(password);

  return strength.score >= 4 && password.length <= 128;
}
