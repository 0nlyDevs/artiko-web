import type { Key } from "@/i18n/en";
import { T } from "@/i18n/locale";
import { statusCounts, STATUSES, successionPercent, successionWidth, type PracticeStatus } from "@/features/heritage/heritage-logic";
import type { Practice } from "@/lib/api";
import { StatusBanner } from "@/lib/ui/kanto";
import { CategoryLabel } from "@/lib/works/category-label";
import styles from "./heritage.module.css";

const LABEL: Record<PracticeStatus, Key> = { red: "heritage.red", orange: "heritage.orange", green: "heritage.green" };

/** Eyebrow, title and the rule of the red list: drawn at once, before the API answers. */
export function HeritageHead() {
  return (
    <header className={styles.lead}>
      <p className={styles.eyebrow}>
        <T k="heritage.eyebrow" />
      </p>
      <h1 className={styles.headline}>
        <span>
          <T k="heritage.headline1" />
        </span>
        <span className={styles.accent}>
          <T k="heritage.headline2" />
        </span>
      </h1>
      <p className={styles.intro}>
        <T k="heritage.intro" />
      </p>
    </header>
  );
}

/** The status the API gives a practice, as a label. */
function StatusTag({ status }: { status: PracticeStatus }) {
  return (
    <span className={`${styles.status} ${styles[status]}`} data-status={status}>
      <T k={LABEL[status]} />
    </span>
  );
}

function SuccessionBar({ practice }: { practice: Practice }) {
  return (
    <span className={styles.bar} aria-hidden="true">
      <span className={`fill-in ${styles.barFill}`} style={{ width: successionWidth(practice) }} />
    </span>
  );
}

/** The whole index: three counters, then one card per practice on a phone and the table where it fits. */
export function HeritageIndex({ practices }: { practices: Practice[] }) {
  if (!practices.length)
    return (
      <StatusBanner className={styles.wide}>
        <T k="heritage.empty" />
      </StatusBanner>
    );
  const counts = statusCounts(practices);
  return (
    <>
      <dl className={styles.counters}>
        {STATUSES.map((status, i) => (
          <div key={status} className={`rise ${styles.counter}`} style={{ animationDelay: `${i * 70}ms` }}>
            <dt>
              <StatusTag status={status} />
            </dt>
            <dd className={`${styles.figure} ${styles[`${status}Figure`]}`}>{counts[status]}</dd>
          </div>
        ))}
      </dl>

      {/* Phones get one card per practice; the full table starts where it fits. */}
      <ul className={styles.cards}>
        {practices.map((p, i) => (
          <li key={p.id} className={`rise ${styles.card}`} style={{ animationDelay: `${150 + i * 50}ms` }}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>
                <span className={styles.name}>{p.name}</span>
                <span className={styles.region}>
                  {p.region} · <CategoryLabel category={{ id: p.category }} />
                </span>
              </span>
              <StatusTag status={p.status} />
            </div>
            {p.description && <p className={styles.description}>{p.description}</p>}
            <dl className={styles.facts}>
              <div>
                <dt>
                  <T k="heritage.masters" />
                </dt>
                <dd>{p.practitioners}</dd>
              </div>
              <div>
                <dt>
                  <T k="heritage.learners" />
                </dt>
                <dd>{p.learners}</dd>
              </div>
              <div>
                <dt>
                  <T k="heritage.age" />
                </dt>
                <dd>{p.median_age}</dd>
              </div>
            </dl>
            <p className={styles.successionLine}>
              <SuccessionBar practice={p} />
              <T k="heritage.successionText" vars={{ n: successionPercent(p) }} />
            </p>
          </li>
        ))}
      </ul>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
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
              <tr key={p.id} className="rise" style={{ animationDelay: `${150 + i * 50}ms` }}>
                <td>
                  <span className={styles.name}>{p.name}</span>
                  <span className={styles.region}>{p.region}</span>
                  {p.description && <span className={styles.description}>{p.description}</span>}
                </td>
                <td>
                  <CategoryLabel category={{ id: p.category }} />
                </td>
                <td className={styles.number}>{p.practitioners}</td>
                <td className={styles.number}>{p.learners}</td>
                <td>
                  <SuccessionBar practice={p} />
                  <span className="visually-hidden">
                    <T k="heritage.successionText" vars={{ n: successionPercent(p) }} />
                  </span>
                </td>
                <td className={styles.number}>{p.median_age}</td>
                <td>
                  <StatusTag status={p.status} />
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
    <th scope="col" className={right ? styles.number : undefined}>
      <T k={k} />
    </th>
  );
}

export function IndexSkeleton() {
  return (
    <>
      <div aria-busy="true" className={styles.counters}>
        <span className="visually-hidden">
          <T k="heritage.loading" />
        </span>
        {[0, 1, 2].map((i) => (
          <div key={i} aria-hidden="true" className={`skel ${styles.skelCounter}`} />
        ))}
      </div>
      <div aria-hidden="true" className={styles.skelRows}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`skel ${styles.skelRow}`} />
        ))}
      </div>
    </>
  );
}
