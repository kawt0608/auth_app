import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentSession } from "@/lib/auth";

export default async function LoginPage() {
  const current = await getCurrentSession();

  if (current) {
    redirect("/dashboard");
  }

  return (
    <main className="narrow-page">
      <section className="panel auth-panel">
        <p className="eyebrow">Login</p>
        <h1>Sign in</h1>
        <p className="lead">
          Use a regular two-hour session, or enable Remember me for a longer
          session lifetime.
        </p>
        <LoginForm />
        <p className="form-footer">
          No account yet? <Link href="/signup">Create one</Link>.
        </p>
      </section>
    </main>
  );
}
