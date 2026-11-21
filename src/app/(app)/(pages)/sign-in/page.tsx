import type { Metadata } from "next";
import { AuthForm } from "@/features/artist-space/auth-form";
import { PageTitle } from "@/i18n/locale";

export const metadata: Metadata = { title: "Sign in | Artiko" };

export default function Page() {
  return (
    <>
      <PageTitle k="meta.signIn" />
      <AuthForm mode="sign-in" />
    </>
  );
}
