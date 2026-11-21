import { Suspense } from "react";
import type { Key } from "@/i18n/en";
import { T } from "@/i18n/locale";
import { listPractices, unwrap, type Practice } from "@/lib/api";

const STATUS = {
  red: { label: "heritage.red", number: "text-[#9B3F2B]", pill: "bg-[#FBE9E3] text-[#8E3524]", dot: "bg-red" },
  orange: { label: "heritage.orange", number: "text-[#8A4B08]", pill: "bg-[#FCF1DF] text-[#7A4206]", dot: "bg-[#E09A2C]" },
  green: { label: "heritage.green", number: "text-[#1F6B40]", pill: "bg-[#E6F2EA] text-[#1F6B40]", dot: "bg-[#2E8B57]" },
} as const;

export function HeritagePage() {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8">
      <div className="max-w-[66ch]">
        <h1 className="text-[32px] leading-none font-extrabold tracking-[-0.04em]">
          <T k="heritage.title" />
        </h1>
        <p className="mt-2.5 leading-relaxed">
          <T k="heritage.intro" />
        </p>
      </div>
      <Suspense fallback={<IndexSkeleton />}>
        <Practices />
      </Suspense>
    </div>
  );
}

/** Learners per master, as the width of the succession bar (full at one learner per master). */
const succession = (p: Practice) => (p.practitioners ? p.learners / p.practitioners : 0);

async function Practices() {
  const practices = unwrap(await listPractices());
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(["red", "orange", "green"] as const).map((status, i) => (
          <div key={status} className="rise rounded-md bg-surface p-5 sm:p-6" style={{ animationDelay: `${i * 70}ms` }}>
            <p className={`text-[56px] leading-none font-extrabold tracking-[-0.05em] ${STATUS[status].number}`}>
              {practices.filter((p) => p.status === status).length}
            </p>
            <p className="mt-2.5 flex items-center gap-2 font-semibold">
              <span aria-hidden="true" className={`size-2.5 rounded-full ${STATUS[status].dot}`} />
              <T k={STATUS[status].label} />
            </p>
          </div>
        ))}
      </div>

      {/* Phones get one card per practice; the full table starts where it fits. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {practices.map((p, i) => (
          <li key={p.id} className="rise flex flex-col gap-3 rounded-md bg-surface p-4" style={{ animationDelay: `${150 + i * 50}ms` }}>
            <div className="flex items-start justify-between gap-3">
              <span>
                <span className="block font-bold">{p.name}</span>
                <span className="block text-sm text-muted">
                  {p.region} · <T k={`category.${p.category}` as Key} />
                </span>
              </span>
              <span className={`inline-flex h-[28px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-bold ${STATUS[p.status].pill}`}>
                <span aria-hidden="true" className={`size-2 rounded-full ${STATUS[p.status].dot}`} />
                <T k={STATUS[p.status].label} />
              </span>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div><dt className="text-muted"><T k="heritage.masters" /></dt><dd className="font-bold tabular-nums">{p.practitioners}</dd></div>
              <div><dt className="text-muted"><T k="heritage.learners" /></dt><dd className="font-bold tabular-nums">{p.learners}</dd></div>
              <div><dt className="text-muted"><T k="heritage.age" /></dt><dd className="font-bold tabular-nums">{p.median_age}</dd></div>
            </dl>
            <p className="text-sm text-muted"><T k="heritage.successionText" vars={{ n: Math.round(succession(p) * 100) }} /></p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="text-[13px] text-muted">
              <Th k="heritage.practice" />
              <Th k="heritage.form" />
              <Th k="heritage.masters" right />
              <Th k="heritage.learners" right />
              <Th k="heritage.succession" />
              <Th k="heritage.age" right />
              <Th k="heritage.status" />
            </tr>
          </thead>
          <tbody>
            {practices.map((p, i) => (
              <tr key={p.id} className="rise border-t border-line align-middle" style={{ animationDelay: `${150 + i * 50}ms` }}>
                <td className="py-4 pr-4">
                  <span className="block font-bold">{p.name}</span>
                  <span className="block text-sm text-muted">{p.region}</span>
                  {p.description && <span className="mt-1 block max-w-[52ch] text-sm">{p.description}</span>}
                </td>
                <td className="py-4 pr-4">
                  <T k={`category.${p.category}` as Key} />
                </td>
                <td className="py-4 pr-4 text-right tabular-nums">{p.practitioners}</td>
                <td className="py-4 pr-4 text-right tabular-nums">{p.learners}</td>
                <td className="py-4 pr-4">
                  <span className="block h-1.5 w-24 overflow-hidden rounded-full bg-line" aria-hidden="true">
                    <span className="fill-in block h-full bg-ink" style={{ width: `${Math.min(succession(p), 1) * 100}%` }} />
                  </span>
                  <span className="sr-only">
                    <T k="heritage.successionText" vars={{ n: Math.round(succession(p) * 100) }} />
                  </span>
                </td>
                <td className="py-4 pr-4 text-right tabular-nums">{p.median_age}</td>
                <td className="py-4">
                  <span className={`inline-flex h-[30px] items-center gap-2 rounded-full px-3 text-sm font-bold whitespace-nowrap ${STATUS[p.status].pill}`}>
                    <span aria-hidden="true" className={`size-2 rounded-full ${STATUS[p.status].dot}`} />
                    <T k={STATUS[p.status].label} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Th({ k, right }: { k: Key; right?: boolean }) {
  return (
    <th scope="col" className={`pr-4 pb-3 font-semibold whitespace-nowrap ${right ? "text-right" : ""}`}>
      <T k={k} />
    </th>
  );
}

function IndexSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">
        <T k="heritage.loading" />
      </span>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skel h-32" />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skel h-16" />
      ))}
    </div>
  );
}
