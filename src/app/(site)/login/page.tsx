import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser, isStaff } from "@/server/auth";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(isStaff(user) ? "/admin" : "/account");
  return (
    <div className="mx-auto max-w-sm px-4 py-14">
      <div className="card p-6 shadow-[0_20px_60px_#2d132a14]">
        <h1 className="h-display text-3xl">Welcome to BLUSH</h1>
        <p className="mb-5 mt-1 text-sm text-muted">Log in or create an account with your mobile number to manage your appointments.</p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
