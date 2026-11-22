import type { Metadata } from "next";
import { SignUpForm } from "@/features/auth/sign-up-form";
import { PageTitle } from "@/i18n/locale";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Create an account | ${BRAND}` };

export default function Page() {
  return (
    <>
      <PageTitle k="meta.signUp" />
      <SignUpForm />
    </>
  );
}
