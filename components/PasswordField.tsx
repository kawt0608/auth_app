"use client";

import { useState } from "react";

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  value?: string;
  onChange?: (value: string) => void;
};

export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  value,
  onChange
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-shell">
        <input
          autoComplete={autoComplete}
          id={id}
          name={name}
          onChange={(event) => onChange?.(event.target.value)}
          required
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-controls={id}
          aria-pressed={visible}
          className="field-toggle"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? "非表示" : "表示"}
        </button>
      </div>
    </div>
  );
}
