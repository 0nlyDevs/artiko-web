import { connection } from "next/server";
import { Suspense } from "react";
import { CategoryBar, MonthNav, RoomEyebrow } from "@/features/hall-of-fame/hall-nav";
import { HallRoom } from "@/features/hall-of-fame/hall-room";
import { RoomAside, RoomWall, WallSkeleton } from "@/features/hall-of-fame/honour-wall";
import { readRoom } from "@/features/hall-of-fame/room";
import { getHallOfFame, listCategories, unwrap, type Category, type HallOfFameEntry } from "@/lib/api";
import { currentMonth } from "@/lib/months";
import styles from "./hall-of-fame.module.css";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Ranking = { ranking: Promise<HallOfFameEntry[]>; category: Category; month: string; now: string };

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

/**
 * The months, the wall, then the bottom bar: the markup follows the order of the frame, so the keyboard does too.
 * The ranking is read once, for the wall and for the right of the bar; the art forms do not wait for it.
 */
async function Room({ searchParams }: { searchParams: SearchParams }) {
  await connection(); // "this month" is read at request time, never frozen at build
  const params = await searchParams;
  const categories = unwrap(await listCategories());
  const now = currentMonth();
  const { category, month, canGoNext } = readRoom(categories, params, now);
  const room = { ranking: getHallOfFame({ path: { category: category.id, month } }).then(unwrap), category, month, now };
  const key = `${category.id}|${month}`;
  return (
    <>
      <MonthNav category={category.id} month={month} canGoNext={canGoNext} />
      <RoomEyebrow category={category} />
      <Suspense key={key} fallback={<WallSkeleton />}>
        <Wall {...room} />
      </Suspense>
      <div className={styles.bar}>
        <CategoryBar categories={categories} category={category.id} month={month} />
        <Suspense key={key} fallback={null}>
          <Aside {...room} />
        </Suspense>
      </div>
    </>
  );
}

async function Wall({ ranking, category, month, now }: Ranking) {
  return <RoomWall entries={await ranking} category={category} month={month} now={now} />;
}

/** The right of the bar. A ranking that does not come is the wall's to report: the bar keeps its art forms. */
async function Aside({ ranking, category, month, now }: Ranking) {
  const entries = await ranking.catch(() => null);
  return entries && <RoomAside entries={entries} category={category} month={month} now={now} />;
}
