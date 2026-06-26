"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  type ActionState
} from "@/app/actions/auth";
import { PasswordField } from "./PasswordField";

const initialState: ActionState = {};

export function SecuritySettingsForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState
  );

  return (
    <form action={formAction} className="form">
      {state.error ? <div className="error-box">{state.error}</div> : null}
      {state.success ? (
        <div className="success-box">{state.success}</div>
      ) : null}
      <PasswordField
        autoComplete="current-password"
        id="currentPassword"
        label="Current password"
        name="currentPassword"
      />
      <PasswordField
        autoComplete="new-password"
        id="newPassword"
        label="New password"
        name="newPassword"
      />
      <PasswordField
        autoComplete="new-password"
        id="confirmPassword"
        label="Confirm new password"
        name="confirmPassword"
      />
      <button className="primary-button" disabled={pending} type="submit">
        {pending ? "Updating password..." : "Change password"}
      </button>
    </form>
  );
}
