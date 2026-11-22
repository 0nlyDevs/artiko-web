import { AuthDoors } from "@/features/auth/auth-doors";

// Sign-in, sign-up and password reset in the KANTO direction (Figma frame R9): a headline and a framed clip of
// hands making art beside the form, no app navigation.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <AuthDoors>{children}</AuthDoors>;
}
