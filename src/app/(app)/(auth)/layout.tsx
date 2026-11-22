import { AuthDoors } from "@/features/auth/auth-doors";

// Sign-in, sign-up and password reset: a video of hands making art beside the form, no app navigation.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <AuthDoors>{children}</AuthDoors>;
}
