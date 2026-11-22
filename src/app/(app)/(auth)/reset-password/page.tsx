import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "@/features/auth/reset-form";
import { PageTitle } from "@/i18n/locale";

export const metadata: Metadata = { title: "New password | Artiko" };

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
