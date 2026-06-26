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
        <h1>ログイン</h1>
        <p className="lead">
          Remember me を選ぶと、通常より長いセッション期限でログインします。
        </p>
        <LoginForm />
        <p className="form-footer">
          アカウントがない場合は <Link href="/signup">サインアップ</Link>
          してください。
        </p>
      </section>
    </main>
  );
}
