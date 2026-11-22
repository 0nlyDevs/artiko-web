import type { Metadata } from "next";
import { SignInForm } from "@/features/auth/sign-in-form";
import { PageTitle } from "@/i18n/locale";

export const metadata: Metadata = { title: "Sign in | Artiko" };

export default function Page() {
  return (
    <>
      <PageTitle k="meta.signIn" />
      <SignInForm />
    </>
  );
}
