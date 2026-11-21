import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getHallOfFame, listCategories, unwrap, type CategoryId } from "@/lib/api";
import { currentMonth, monthLabel, shiftMonth } from "@/lib/months";
import { WorkLabel } from "@/lib/works/work-label";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function HallOfFamePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-7xl">Hall of Fame</h1>
        <p className="max-w-2xl text-xl">
          Each month, the five human-made works with the most votes in every category enter the Hall. Past rooms are
          never taken down.
        </p>
      </div>
      <Suspense fallback={<p>Loading the room.</p>}>
        <Room searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Room({ searchParams }: { searchParams: SearchParams }) {
  await connection(); // "this month" is read at request time, never frozen at build
  const params = await searchParams;
  const categories = unwrap(await listCategories());
  const category = (categories.find((c) => c.id === params.category)?.id ?? "painting") as CategoryId;
  const month = typeof params.month === "string" && MONTH.test(params.month) ? params.month : currentMonth();
  const entries = unwrap(await getHallOfFame({ path: { category, month } }));
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
            className="border-2 border-ink px-3 py-1 aria-[current=page]:bg-ink aria-[current=page]:text-paper"
          >
            {c.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-4">
        <Link href={link(category, shiftMonth(month, -1))} className="underline underline-offset-4">
          Previous month
        </Link>
        <h2 className="font-heading text-5xl">{monthLabel(month)}</h2>
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
