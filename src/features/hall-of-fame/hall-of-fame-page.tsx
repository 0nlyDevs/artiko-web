import { connection } from "next/server";
import { Suspense } from "react";
import { CategoryBar, MonthNav, RoomEyebrow } from "@/features/hall-of-fame/hall-nav";
import { HallRoom } from "@/features/hall-of-fame/hall-room";
import { RoomWall, WallSkeleton } from "@/features/hall-of-fame/honour-wall";
import { resolveCategory, resolveMonth } from "@/features/hall-of-fame/room";
import { getHallOfFame, listCategories, unwrap, type Category } from "@/lib/api";
import { currentMonth } from "@/lib/months";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** The Panthéon. The room and its title are drawn at once; the month, the art form and the wall arrive with the request. */
export function HallOfFamePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <HallRoom>
      <Suspense fallback={<WallSkeleton />}>
        <Room searchParams={searchParams} />
      </Suspense>
    </HallRoom>
  );
}

async function Room({ searchParams }: { searchParams: SearchParams }) {
  await connection(); // "this month" is read at request time, never frozen at build
  const params = await searchParams;
  const categories = unwrap(await listCategories());
  const id = resolveCategory(categories, params.category);
  const category = categories.find((c) => c.id === id) ?? { id, label: id };
  const now = currentMonth();
  const month = resolveMonth(params.month, now);
  return (
    <>
      <MonthNav category={id} month={month} canGoNext={month < now} />
      <RoomEyebrow category={category} />
      <CategoryBar categories={categories} category={id} month={month} />
      <Suspense key={`${id}|${month}`} fallback={<WallSkeleton />}>
        <Wall category={category} month={month} now={now} />
      </Suspense>
    </>
  );
}

async function Wall({ category, month, now }: { category: Category; month: string; now: string }) {
  const entries = unwrap(await getHallOfFame({ path: { category: category.id, month } }));
  return <RoomWall entries={entries} category={category} month={month} now={now} />;
}
