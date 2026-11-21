import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { WorkLabel } from "@/components/WorkLabel";
import { api, currentMonth, monthLabel, type Practice, type Work } from "@/lib/api";

export default function Home() {
  return (
    <>
      <section className="flex flex-col gap-6 pb-24">
        <h1 className="max-w-4xl text-5xl leading-[0.95] font-extrabold tracking-tighter sm:text-7xl">
          Art made by people, and proven.
        </h1>
        <p className="max-w-2xl text-xl">
          Check any artwork to see who made it. Walk each artist&apos;s museum and vote for the
          month&apos;s best human-made work. Learn the arts that are disappearing, from the people who
          still know them.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/scan" className="bg-ink px-5 py-3 font-bold text-ground">
            Check a photo
          </Link>
          <Link href="/explore" className="border-2 border-ink px-5 py-3 font-bold">
            Explore artists
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-8 pb-24">
        <Suspense fallback={<p>Loading this month&apos;s works.</p>}>
          <Leading />
        </Suspense>
      </section>

      <section className="-mx-4 bg-surface px-4 py-16 sm:-mx-8 sm:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight">Arts losing their last masters</h2>
        <Suspense fallback={<p>Loading the index.</p>}>
          <Endangered />
        </Suspense>
      </section>
    </>
  );
}

async function Leading() {
  await connection(); // the month is read at request time, not frozen at build
  const month = currentMonth();
  const works = await api<Work[]>(`/works?month=${month}`);
  const top = works.filter((w) => w.human_proven).sort((a, b) => b.votes - a.votes).slice(0, 6);
  return (
    <>
      <h2 className="text-3xl font-extrabold tracking-tight">Leading the vote in {monthLabel(month)}</h2>
      {top.length ? (
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((w) => (
            <WorkLabel key={w.id} work={w} />
          ))}
        </div>
      ) : (
        <p>No work has been published this month yet. Artists can publish from their space.</p>
      )}
    </>
  );
}

async function Endangered() {
  const red = (await api<Practice[]>("/practices")).filter((p) => p.status === "red");
  return (
    <ul className="mt-6 grid gap-6 sm:grid-cols-3">
      {red.map((p) => (
        <li key={p.id}>
          <p className="text-xl font-bold">{p.name}</p>
          <p>
            {p.region}. {p.learners} learners for {p.practitioners} masters, median age {p.median_age}.
          </p>
        </li>
      ))}
      <li>
        <Link href="/heritage" className="font-bold underline underline-offset-4">
          See the whole index
        </Link>
      </li>
    </ul>
  );
}
