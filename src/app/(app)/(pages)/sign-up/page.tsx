import type { Metadata } from "next";
import { AuthForm } from "@/features/artist-space/auth-form";

export const metadata: Metadata = { title: "Create an account | Artiko" };

export default function Page() {
  return <AuthForm mode="sign-up" />;
}
