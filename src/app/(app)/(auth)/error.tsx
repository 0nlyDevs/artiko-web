"use client";

import { AccountError } from "@/features/auth/account-error";

// The account pages had no error screen of their own. `retry` fetches and renders the page again.
export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return <AccountError retry={retry} />;
}
