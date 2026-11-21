import { SiteHeader } from "@/features/site/site-header";

// The app pages (explore, museums, Hall of Fame...) share a header; the home gallery keeps its own full screen.
export default function PagesLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8">{children}</main>
      <footer className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 sm:px-8">
          <p className="font-heading text-3xl">Made by people. Kept by people.</p>
          <p className="text-paper/80">
            No work on Artiko may be used to train AI. Every file keeps its fingerprint and date.
          </p>
        </div>
      </footer>
    </div>
  );
}
