"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "@/app/actions/auth";
import { PasswordField } from "./PasswordField";

const initialState: ActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="form">
      {state.error ? <div className="error-box">{state.error}</div> : null}
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
        autoComplete="current-password"
        id="password"
        label="Password"
        name="password"
      />
      <label className="checkbox">
        <input name="rememberMe" type="checkbox" />
        Keep me signed in
      </label>
      <button className="primary-button" disabled={pending} type="submit">
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
