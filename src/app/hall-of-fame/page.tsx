import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { WorkLabel } from "@/components/WorkLabel";
import { api, currentMonth, monthLabel, type Category, type HallOfFameEntry } from "@/lib/api";

export const metadata: Metadata = { title: "Hall of Fame" };

export default function HallOfFame({ searchParams }: PageProps<"/hall-of-fame">) {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-5xl font-extrabold tracking-tighter">Hall of Fame</h1>
        <p className="max-w-2xl text-xl">
          Each month, the five human-made works with the most votes in every category enter the Hall.
          Past rooms are never taken down.
        </p>
      </div>
      <Suspense fallback={<p>Loading the room.</p>}>
        <Room searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function shiftMonth(month: string, by: number): string {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + by);
  return d.toISOString().slice(0, 7);
}

async function Room({ searchParams }: { searchParams: PageProps<"/hall-of-fame">["searchParams"] }) {
  await connection(); // "this month" is read at request time, never frozen at build
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : "painting";
  const month =
    typeof params.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
      ? params.month
      : currentMonth();
  const [categories, entries] = await Promise.all([
    api<Category[]>("/categories"),
    api<HallOfFameEntry[]>(`/hall-of-fame/${encodeURIComponent(category)}/${month}`),
  ]);
  const link = (c: string, m: string) => `/hall-of-fame?category=${c}&month=${m}`;
  const [first, ...rest] = entries;
  return (
    <>
      <nav aria-label="Categories" className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={link(c.id, month)}
            aria-current={c.id === category ? "page" : undefined}
            className="border-2 border-ink px-3 py-1 aria-[current=page]:bg-ink aria-[current=page]:text-ground"
          >
            {c.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-4">
        <Link href={link(category, shiftMonth(month, -1))} className="underline underline-offset-4">
          Previous month
        </Link>
        <h2 className="text-3xl font-extrabold tracking-tight">{monthLabel(month)}</h2>
        {month < currentMonth() && (
          <Link href={link(category, shiftMonth(month, 1))} className="underline underline-offset-4">
            Next month
          </Link>
        )}
      </div>
      {first ? (
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
          <WorkLabel work={first.work} rank={1} />
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-1">
            {rest.map((e) => (
              <WorkLabel key={e.work.id} work={e.work} rank={e.rank} />
            ))}
          </div>
        </div>
      ) : (
        <p>No votes in this category for {monthLabel(month)} yet. Visit an artist&apos;s museum to vote.</p>
      )}
    </>
  );
}
