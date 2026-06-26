"use client";

import { useActionState, useState } from "react";
import { signupAction, type ActionState } from "@/app/actions/auth";
import { PasswordField } from "./PasswordField";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

const initialState: ActionState = {};

export function SignupForm() {
  const [password, setPassword] = useState("");
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="form">
      {state.error ? <div className="error-box">{state.error}</div> : null}
      <div className="field">
        <label htmlFor="name">Name</label>
        <input
          autoComplete="name"
          id="name"
          name="name"
          required
          type="text"
        />
      </div>
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          autoComplete="email"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <PasswordField
        autoComplete="new-password"
        id="password"
        label="Password"
        name="password"
        onChange={setPassword}
        value={password}
      />
      <PasswordField
        autoComplete="new-password"
        id="confirmPassword"
        label="Confirm password"
        name="confirmPassword"
      />
      <PasswordStrengthMeter password={password} />
      <button className="primary-button" disabled={pending} type="submit">
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
