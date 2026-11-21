import { connection } from "next/server";
import { Suspense } from "react";
import { getHallOfFame, listCategories, unwrap, type CategoryId } from "@/lib/api";
import { HallEmpty, HallNav } from "@/features/hall-of-fame/hall-nav";
import { T } from "@/i18n/locale";
import { currentMonth } from "@/lib/months";
import { WorkLabel } from "@/lib/works/work-label";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function HallOfFamePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-7xl">
          <T k="hall.title" />
        </h1>
        <p className="max-w-2xl text-xl">
          <T k="hall.intro" />
        </p>
      </div>
      <Suspense
        fallback={
          <p>
            <T k="hall.loading" />
          </p>
        }
      >
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
  const [first, ...rest] = entries;
  return (
    <>
      <HallNav categories={categories} category={category} month={month} canGoNext={month < currentMonth()} />
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
        <HallEmpty month={month} />
      )}
    </>
  );
}
