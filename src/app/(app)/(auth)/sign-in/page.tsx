import type { Metadata } from "next";
import { SignInForm } from "@/features/auth/sign-in-form";
import { PageTitle } from "@/i18n/locale";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Sign in | ${BRAND}` };

export default function Page() {
  return (
    <>
      <PageTitle k="meta.signIn" />
      <SignInForm />
    </>
  );
}
