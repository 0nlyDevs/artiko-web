import type { Metadata } from "next";
import { AuthForm } from "@/features/artist-space/auth-form";
import { PageTitle } from "@/i18n/locale";

export const metadata: Metadata = { title: "Create an account | Artiko" };

export default function Page() {
  return (
    <>
      <PageTitle k="meta.signUp" />
      <AuthForm mode="sign-up" />
    </>
  );
}
