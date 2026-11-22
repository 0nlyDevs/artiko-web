import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "@/features/auth/reset-form";
import { PageTitle } from "@/i18n/locale";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `New password | ${BRAND}` };

export default function Page() {
  return (
    <>
      <PageTitle k="meta.reset" />
      {/* The link's token is read from the address. */}
      <Suspense>
        <ResetForm />
      </Suspense>
    </>
  );
}
