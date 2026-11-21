import { Suspense } from "react";
import { T } from "@/i18n/locale";
import { listPractices, unwrap } from "@/lib/api";

const STATUS = {
  red: { label: "heritage.red", className: "bg-red text-ink" },
  orange: { label: "heritage.orange", className: "bg-[#d99a2b] text-ink" },
  green: { label: "heritage.green", className: "bg-[#2c6e48] text-paper" },
} as const;

export function HeritagePage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-7xl">
          <T k="heritage.title" />
        </h1>
        <p className="max-w-2xl text-xl">
          <T k="heritage.intro" />
        </p>
      </div>
      <Suspense
        fallback={
          <p>
            <T k="heritage.loading" />
          </p>
        }
      >
        <Practices />
      </Suspense>
    </div>
  );
}

async function Practices() {
  const practices = unwrap(await listPractices());
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-ink">
            <th scope="col" className="py-3 pr-4">
              <T k="heritage.practice" />
            </th>
            <th scope="col" className="py-3 pr-4">
              <T k="heritage.status" />
            </th>
            <th scope="col" className="py-3 pr-4 text-right">
              <T k="heritage.masters" />
            </th>
            <th scope="col" className="py-3 pr-4 text-right">
              <T k="heritage.learners" />
            </th>
            <th scope="col" className="py-3 text-right">
              <T k="heritage.age" />
            </th>
          </tr>
        </thead>
        <tbody>
          {practices.map((p) => (
            <tr key={p.id} className="border-b border-ink/15 align-top">
              <td className="py-4 pr-4">
                <span className="block text-lg font-bold">{p.name}</span>
                <span className="block">{p.region}</span>
                <span className="block max-w-xl text-text">{p.description}</span>
              </td>
              <td className="py-4 pr-4">
                <span className={`inline-block px-2 py-1 text-sm font-bold ${STATUS[p.status].className}`}>
                  <T k={STATUS[p.status].label} />
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
