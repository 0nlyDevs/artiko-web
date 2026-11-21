import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getHallOfFame, listCategories, unwrap, type CategoryId, type HallOfFameEntry } from "@/lib/api";
import { HallEmpty, HallNav } from "@/features/hall-of-fame/hall-nav";
import { T } from "@/i18n/locale";
import { currentMonth } from "@/lib/months";
import { HeartFilled } from "@/lib/ui/icons";
import { WorkMedia } from "@/lib/works/work-tile";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function HallOfFamePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
      <Suspense fallback={<PodiumSkeleton />}>
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
  const now = currentMonth();
  const month = typeof params.month === "string" && MONTH.test(params.month) && params.month <= now ? params.month : now;
  return (
    <>
      <HallNav categories={categories} category={category} month={month} canGoNext={month < now} />
      <Suspense key={`${category}|${month}`} fallback={<PodiumSkeleton />}>
        <Podium category={category} month={month} />
      </Suspense>
    </>
  );
}

async function Podium({ category, month }: { category: CategoryId; month: string }) {
  const entries = unwrap(await getHallOfFame({ path: { category, month } }));
  const [first, ...rest] = entries;
  if (!first) return <HallEmpty month={month} />;
  return (
    <div className="mt-4 flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
      <Link href={`/works/${first.work.id}`} className="rise flex flex-col gap-4 md:max-w-[520px] md:flex-1">
        <span className="relative block aspect-[4/5] overflow-hidden rounded-md bg-surface">
          <WorkMedia work={first.work} sizes="(min-width: 768px) 520px, 100vw" priority />
        </span>
        <span className="flex items-start gap-4">
          <span className="text-[72px] leading-[0.8] font-extrabold tracking-[-0.06em] sm:text-[88px]">1</span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-2xl font-extrabold tracking-[-0.03em]">{first.work.title}</span>
            <span className="text-muted">{first.work.artist_name}</span>
          </span>
          <Votes entry={first} />
        </span>
      </Link>
      {rest.length > 0 && (
        <ol className="flex flex-col gap-1 md:flex-1">
          {rest.map((e, i) => (
            <li key={e.work.id} className="rise" style={{ animationDelay: `${120 + i * 70}ms` }}>
              <Link href={`/works/${e.work.id}`} className="flex items-center gap-4 rounded-md p-3 transition-colors hover:bg-surface">
                <span className="w-9 text-[32px] font-extrabold tracking-[-0.05em]">{e.rank}</span>
                <span className="relative block h-[90px] w-[72px] shrink-0 overflow-hidden rounded bg-surface">
                  <WorkMedia work={e.work} sizes="72px" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[17px] font-bold">{e.work.title}</span>
                  <span className="truncate text-sm text-muted">{e.work.artist_name}</span>
                </span>
                <Votes entry={e} />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Votes({ entry }: { entry: HallOfFameEntry }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 font-bold tabular-nums">
      <HeartFilled size={20} className="text-red" />
      {entry.votes}
    </span>
  );
}

function PodiumSkeleton() {
  return (
    <div aria-busy="true" className="mt-4 flex flex-col gap-8 md:flex-row md:gap-10">
      <span className="sr-only">
        <T k="hall.loading" />
      </span>
      <div className="skel aspect-[4/5] md:max-w-[520px] md:flex-1" />
      <div className="flex flex-col gap-3 md:flex-1">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skel h-[114px]" />
        ))}
      </div>
    </div>
  );
}
