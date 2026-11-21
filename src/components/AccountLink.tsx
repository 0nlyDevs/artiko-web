"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function AccountLink() {
  const { data } = authClient.useSession();
  return data ? (
    <Link href="/me" className="bg-ink px-4 py-2 text-ground">
      {data.user.name || "My space"}
    </Link>
  ) : (
    <Link href="/sign-in" className="bg-ink px-4 py-2 text-ground">
      Sign in
    </Link>
  );
}
