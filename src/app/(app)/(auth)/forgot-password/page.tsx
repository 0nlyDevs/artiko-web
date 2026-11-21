import type { Metadata } from "next";
import { ForgotForm } from "@/features/auth/forgot-form";
import { PageTitle } from "@/i18n/locale";

export const metadata: Metadata = { title: "Forgotten password | Artiko" };

export default function Page() {
  return (
    <>
      <PageTitle k="meta.forgot" />
      <ForgotForm />
    </>
  );
}
