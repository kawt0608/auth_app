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
  label: "弱い" | "普通" | "強い";
  percent: number;
  checks: PasswordCheck[];
  improvements: string[];
};

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const checks: PasswordCheck[] = [
    {
      key: "length",
      label: "10文字以上",
      passed: password.length >= 10,
      improvement: "10文字以上にしてください"
    },
    {
      key: "uppercase",
      label: "大文字",
      passed: /[A-Z]/.test(password),
      improvement: "英大文字を1文字以上追加してください"
    },
    {
      key: "lowercase",
      label: "小文字",
      passed: /[a-z]/.test(password),
      improvement: "英小文字を1文字以上追加してください"
    },
    {
      key: "number",
      label: "数字",
      passed: /\d/.test(password),
      improvement: "数字を1文字以上追加してください"
    },
    {
      key: "symbol",
      label: "記号",
      passed: /[^A-Za-z0-9]/.test(password),
      improvement: "記号を1文字以上追加してください"
    }
  ];

  const score = checks.filter((check) => check.passed).length;
  const label = score <= 2 ? "弱い" : score <= 4 ? "普通" : "強い";

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
