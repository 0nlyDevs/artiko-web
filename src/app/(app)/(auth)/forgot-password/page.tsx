import type { Metadata } from "next";
import { ForgotForm } from "@/features/auth/forgot-form";
import { PageTitle } from "@/i18n/locale";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Forgotten password | ${BRAND}` };

export default function Page() {
  return (
    <>
      <PageTitle k="meta.forgot" />
      <ForgotForm />
    </>
  );
}
