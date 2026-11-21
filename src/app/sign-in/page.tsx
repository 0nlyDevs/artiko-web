import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default function SignIn() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-5xl font-extrabold tracking-tighter">Sign in</h1>
      <AuthForm mode="sign-in" />
    </div>
  );
}
