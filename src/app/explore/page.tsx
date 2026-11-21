import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { WorkLabel } from "@/components/WorkLabel";
import { api, type Artist, type Category, type Work } from "@/lib/api";

export const metadata: Metadata = { title: "Explore" };

export default function Explore({ searchParams }: PageProps<"/explore">) {
  return (
    <div className="flex flex-col gap-16">
      <h1 className="text-5xl font-extrabold tracking-tighter">Explore</h1>
      <Suspense fallback={<p>Loading works.</p>}>
        <Works searchParams={searchParams} />
      </Suspense>
      <section className="flex flex-col gap-6">
        <h2 className="text-3xl font-extrabold tracking-tight">Artists and their museums</h2>
        <Suspense fallback={<p>Loading artists.</p>}>
          <Artists />
        </Suspense>
      </section>
    </div>
  );
}

async function Works({ searchParams }: { searchParams: PageProps<"/explore">["searchParams"] }) {
  const { category } = await searchParams;
  const selected = typeof category === "string" ? category : undefined;
  const [categories, works] = await Promise.all([
    api<Category[]>("/categories"),
    api<Work[]>(selected ? `/works?category=${encodeURIComponent(selected)}` : "/works"),
  ]);
  return (
    <section className="flex flex-col gap-8">
      <nav aria-label="Categories" className="flex flex-wrap gap-2">
        {[{ id: undefined, label: "All" }, ...categories].map((c) => (
          <Link
            key={c.label}
            href={c.id ? `/explore?category=${c.id}` : "/explore"}
            aria-current={c.id === selected ? "page" : undefined}
            className="border-2 border-ink px-3 py-1 aria-[current=page]:bg-ink aria-[current=page]:text-ground"
          >
            {c.label}
          </Link>
        ))}
      </nav>
      {works.length ? (
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((w) => (
            <WorkLabel key={w.id} work={w} />
          ))}
        </div>
      ) : (
        <p>Nothing published in this category yet.</p>
      )}
    </section>
  );
}

async function Artists() {
  const artists = await api<Artist[]>("/artists");
  return (
    <ul className="grid gap-px bg-ink/15 sm:grid-cols-2">
      {artists.map((a) => (
        <li key={a.id} className="bg-ground">
          <Link href={`/artists/${a.id}`} className="block p-5 hover:bg-surface">
            <span className="block text-xl font-bold">{a.display_name}</span>
            <span>
              {a.region ? `${a.region}. ` : ""}
              {a.bio}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
