import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUp() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-5xl font-extrabold tracking-tighter">Create an account</h1>
      <p className="max-w-2xl text-xl">To vote for the month&apos;s best works, or to publish your own.</p>
      <AuthForm mode="sign-up" />
    </div>
  );
}
