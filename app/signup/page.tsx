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
        <h1>サインアップ</h1>
        <p className="lead">
          パスワードはサーバー側でも検証し、bcryptでハッシュ化して保存します。
        </p>
        <SignupForm />
        <p className="form-footer">
          すでに登録済みの場合は <Link href="/login">ログイン</Link>
          してください。
        </p>
      </section>
    </main>
  );
}
