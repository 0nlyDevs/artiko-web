import Link from "next/link";
import { Suspense } from "react";
import { listArtists, listCategories, listWorks, unwrap, type CategoryId } from "@/lib/api";
import { WorkLabel } from "@/lib/works/work-label";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function ExplorePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-16">
      <h1 className="font-heading text-7xl">Explore</h1>
      <Suspense fallback={<p>Loading works.</p>}>
        <Works searchParams={searchParams} />
      </Suspense>
      <section className="flex flex-col gap-6">
        <h2 className="font-heading text-5xl">Artists and their museums</h2>
        <Suspense fallback={<p>Loading artists.</p>}>
          <Artists />
        </Suspense>
      </section>
    </div>
  );
}

async function Works({ searchParams }: { searchParams: SearchParams }) {
  const { category } = await searchParams;
  const categories = unwrap(await listCategories());
  const selected = categories.find((c) => c.id === category)?.id as CategoryId | undefined;
  const works = unwrap(await listWorks({ query: selected ? { category: selected } : {} }));
  return (
    <section className="flex flex-col gap-8">
      <nav aria-label="Categories" className="flex flex-wrap gap-2">
        {[{ id: undefined, label: "All" }, ...categories].map((c) => (
          <Link
            key={c.label}
            href={c.id ? `/explore?category=${c.id}` : "/explore"}
            aria-current={c.id === selected ? "page" : undefined}
            className="border-2 border-ink px-3 py-1 aria-[current=page]:bg-ink aria-[current=page]:text-paper"
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
  const artists = unwrap(await listArtists());
  return (
    <ul className="grid gap-px bg-ink/15 sm:grid-cols-2">
      {artists.map((a) => (
        <li key={a.id} className="bg-wall">
          <Link href={`/artists/${a.id}`} className="block p-5 hover:bg-paper">
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
