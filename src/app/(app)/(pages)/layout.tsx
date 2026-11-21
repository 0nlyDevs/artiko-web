import { AppShell } from "@/features/site/app-shell";

// The app pages (explore, museums, Hall of Fame...) share one navigation; the home gallery keeps its own full screen.
export default function PagesLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
