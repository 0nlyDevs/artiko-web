import type { Metadata } from "next";
import { Suspense } from "react";
import { api, type Practice } from "@/lib/api";

export const metadata: Metadata = { title: "Living Heritage Index" };

const STATUS = {
  red: { label: "Endangered", className: "bg-red text-ground" },
  orange: { label: "Weakening", className: "bg-orange text-ground" },
  green: { label: "Passed on", className: "bg-green text-ground" },
} as const;

export default function Heritage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-5xl font-extrabold tracking-tighter">Living Heritage Index</h1>
        <p className="max-w-2xl text-xl">
          A red list for arts and skills. A practice is endangered when it has fewer than half as many
          learners as masters, or when its masters&apos; median age is 60 or more.
        </p>
      </div>
      <Suspense fallback={<p>Loading the index.</p>}>
        <Practices />
      </Suspense>
    </div>
  );
}

async function Practices() {
  const practices = await api<Practice[]>("/practices");
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-ink">
            <th scope="col" className="py-3 pr-4">Practice</th>
            <th scope="col" className="py-3 pr-4">Status</th>
            <th scope="col" className="py-3 pr-4 text-right">Masters</th>
            <th scope="col" className="py-3 pr-4 text-right">Learners</th>
            <th scope="col" className="py-3 text-right">Median age</th>
          </tr>
        </thead>
        <tbody>
          {practices.map((p) => (
            <tr key={p.id} className="border-b border-ink/15 align-top">
              <td className="py-4 pr-4">
                <span className="block text-lg font-bold">{p.name}</span>
                <span className="block">{p.region}</span>
                <span className="block max-w-xl text-ink-soft">{p.description}</span>
              </td>
              <td className="py-4 pr-4">
                <span className={`inline-block px-2 py-1 text-sm font-bold ${STATUS[p.status].className}`}>
                  {STATUS[p.status].label}
                </span>
              </td>
              <td className="py-4 pr-4 text-right tabular-nums">{p.practitioners}</td>
              <td className="py-4 pr-4 text-right tabular-nums">{p.learners}</td>
              <td className="py-4 text-right tabular-nums">{p.median_age}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
