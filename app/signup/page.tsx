import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/SignupForm";
import { getCurrentSession } from "@/lib/auth";

export default async function SignupPage() {
  const current = await getCurrentSession();

  if (current) {
    redirect("/dashboard");
  }

  return (
    <main className="narrow-page">
      <section className="panel auth-panel">
        <p className="eyebrow">Sign up</p>
        <h1>Create account</h1>
        <p className="lead">
          Passwords are validated on the server and stored as bcrypt hashes.
        </p>
        <SignupForm />
        <p className="form-footer">
          Already registered? <Link href="/login">Sign in</Link>.
        </p>
      </section>
    </main>
  );
}
