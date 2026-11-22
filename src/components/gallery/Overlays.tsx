import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import * as THREE from "three";
import { useT } from "@/i18n/locale";
import { aboutTags, featureKeys, heroLines, stops, works } from "./content";
import { FeatureIcon } from "./Doodles";

// One scene unit is one CSS pixel when the viewport is 755 px tall, the
// height the original camera was framed for; drei scales it from there.
const PX = 400;

const scratch = new THREE.Vector3();

// Scene units (about one viewport is 1300 wide): boxes mount this close to the camera and unmount past the second value.
const MOUNT_RANGE = 1600;
const UNMOUNT_RANGE = 2200;

// Titles that the dictionaries keep in capitals read better in sentence case.
const sentence = (text: string) => (text === text.toUpperCase() ? text.charAt(0) + text.slice(1).toLowerCase() : text);

// Stagger index for a revealed child, read by globals.css.
const at = (i: number) => ({ "--i": i }) as CSSProperties;

type BoxProps = {
  x: [number, number];
  y: [number, number];
  z?: number;
  className?: string;
  children: ReactNode;
};

// A block of wall content. It gets the class is-in while the camera looks at
// it, which plays the reveal animations in globals.css, and loses it once the
// block is well out of frame so the animation replays on the way back.
function Box({ x, y, z = 1, className, children }: BoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useRef(false);
  const cx = (x[0] + x[1]) / 2;
  const cy = (y[0] + y[1]) / 2;
  // drei's Html recomputes a CSS 3D transform for every box on every frame. Only keep the boxes
  // near the camera mounted (with hysteresis), so the number of live DOM layers stays small
  // however long the visit is.
  const [near, setNear] = useState(() => Math.abs(cx) < MOUNT_RANGE);
  const nearRef = useRef(near);
  useFrame(({ camera }) => {
    const distance = Math.abs(camera.position.x - cx);
    if (nearRef.current && distance > UNMOUNT_RANGE) {
      nearRef.current = false;
      shown.current = false;
      setNear(false);
    } else if (!nearRef.current && distance < MOUNT_RANGE) {
      nearRef.current = true;
      setNear(true);
    }
    const el = ref.current;
    if (!el) return;
    scratch.set(cx, cy, z).project(camera);
    const behind = scratch.z > 1;
    if (!shown.current && !behind && Math.abs(scratch.x) < 0.9) {
      shown.current = true;
      el.classList.add("is-in");
    } else if (shown.current && (behind || Math.abs(scratch.x) > 1.5)) {
      shown.current = false;
      el.classList.remove("is-in");
    }
  });
  if (!near) return null;
  return (
    <Html transform distanceFactor={PX} position={[cx, cy, z]} zIndexRange={[20, 10]}>
      <div ref={ref} className={`g-box ${className ?? ""}`} style={{ width: x[1] - x[0], height: y[1] - y[0] }}>
        {children}
      </div>
    </Html>
  );
}

function Line({ children, i = 0 }: { children: ReactNode; i?: number }) {
  return (
    <span className="ln" style={at(i)}>
      <span>{children}</span>
    </span>
  );
}

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d={diagonal ? "M4 12 L12 4 M6 4 H12 V10" : "M3 8 H13 M9 4 L13 8 L9 12"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Cta({ children, onClick, light = false }: { children: ReactNode; onClick: () => void; light?: boolean }) {
  return (
    <button type="button" className={`g-cta ${light ? "g-cta-light" : ""}`} onClick={onClick}>
      <span className="g-cta-label">{children}</span>
      <span className="g-cta-dot">
        <Arrow />
      </span>
    </button>
  );
}

function ListenButton() {
  const { t } = useT();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = () => {
    if (!audio.current) {
      audio.current = new Audio("/gallery/satie-excerpt.mp3");
      audio.current.addEventListener("ended", () => setPlaying(false));
    }
    if (playing) {
      audio.current.pause();
      setPlaying(false);
    } else {
      void audio.current.play().then(() => setPlaying(true));
    }
  };
  return (
    <button type="button" className={`g-pill ${playing ? "is-playing" : ""}`} onClick={toggle} aria-pressed={playing}>
      <span className="g-eq" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      {playing ? t("pause") : t("listen")}
    </button>
  );
}

function ContactForm() {
  const { t } = useT();
  const [sent, setSent] = useState(false);
  const onSubmit = (event: { preventDefault(): void }) => {
    event.preventDefault();
    setSent(true);
  };
  return (
    <form className="g-form" onSubmit={onSubmit}>
      <label className="r" style={at(0)}>
        {t("form.name")}
        <input name="name" autoComplete="name" required />
      </label>
      <label className="r" style={at(1)}>
        {t("form.email")}
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="r" style={at(2)}>
        {t("form.message")}
        <textarea name="message" rows={3} />
      </label>
      <div className="g-form-row r" style={at(3)}>
        <label className="g-attach" aria-label={t("form.attach")}>
          <input type="file" hidden />
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M8 13 L14 7 C15.5 5.5 18 5.5 19 7 C20.5 8.5 20.5 10.5 19 12 L11 20 C9 22 6 22 4.5 20 C3 18.5 3 15.5 5 13.5 L12 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </label>
        <button type="submit" className="g-cta g-cta-tall">
          <span className="g-cta-label">{t("form.send")}</span>
          <span className="g-cta-dot">
            <Arrow />
          </span>
        </button>
      </div>
      <p className="g-form-note" role="status">
        {sent ? t("form.sent") : ""}
      </p>
    </form>
  );
}

export function Overlays({ goTo }: { goTo: (x: number) => void }) {
  const { t } = useT();
  const featuresX = stops[1].x;
  const worksX = 8835;
  const contactX = Infinity;

  return (
    <>
      {/* Hero wall: one serif statement, a line of explanation and the way in */}
      <Box x={[-540, 30]} y={[120, 470]} className="g-hero">
        <h1 className="g-title g-title-hero">
          <Line>{sentence(heroLines.map((k) => t(k)).join(" "))}</Line>
        </h1>
        <p className="g-lead r" style={at(2)}>
          {t("hero.descriptor")}
        </p>
        <div className="g-hero-actions r" style={at(3)}>
          <Cta onClick={() => goTo(featuresX)}>{t("hero.cta")}</Cta>
          <span className="g-small g-scroll-hint">{t("hero.scroll")}</span>
        </div>
      </Box>

      {/* Features wall */}
      <Box x={[1429, 2037]} y={[150, 376]}>
        <h2 className="g-title g-title-xl">
          <Line>{t("features.title")}</Line>
        </h2>
        <p className="g-text r" style={at(3)}>
          {t("features.intro")}
        </p>
      </Box>
      {featureKeys.map((key, index) => {
        const x0 = 2255 + index * 440;
        const flip = index % 2 === 1;
        return (
          <Box key={key} x={[x0, x0 + 380]} y={[96, 420]} className={`g-feature ${flip ? "is-flip" : ""}`}>
            <div className="g-feature-art r" style={at(0)}>
              <FeatureIcon name={key} width={124} />
            </div>
            <div className="g-feature-copy">
              <span className="g-num r" style={at(1)}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="g-title">
                <Line i={1}>{t(`features.${key}.title`)}</Line>
              </h3>
              <p className="g-text r" style={at(2)}>
                {t(`features.${key}.text`)}
              </p>
            </div>
          </Box>
        );
      })}
      <Box x={[4720, 5120]} y={[200, 300]} className="g-salt g-more">
        <Line>{t("features.more")}</Line>
      </Box>
      <Box x={[4830, 5020]} y={[110, 160]}>
        <div className="r" style={at(2)}>
          <Cta onClick={() => goTo(contactX)}>{t("features.cta")}</Cta>
        </div>
      </Box>

      {/* Hall of Fame wall */}
      <Box x={[6804, 7433]} y={[176, 400]}>
        <h2 className="g-title g-title-xl">
          <Line>{t("featured.title")}</Line>
        </h2>
        <p className="g-text g-lead r" style={at(2)}>
          {t("featured.text")}
        </p>
      </Box>
      <Box x={[6804, 7004]} y={[112, 162]}>
        <div className="r" style={at(3)}>
          <Cta onClick={() => goTo(worksX)}>{t("featured.cta")}</Cta>
        </div>
      </Box>

      {/* Art forms: one block beside each frame */}
      {works.map((work, index) => {
        const x0 = 9094 + index * 859.6;
        return (
          <Box key={work.id} x={[x0, x0 + 325]} y={[121, 453]} className="g-case">
            <div>
              <span className="g-chip r" style={at(0)}>
                {t(work.kind)}
              </span>
              <h3 className="g-title">
                <Line i={1}>{t(`work.${work.id}.title`)}</Line>
              </h3>
              <p className="g-meta r" style={at(2)}>
                {t(`work.${work.id}.meta`)}
              </p>
              <p className="g-text r" style={at(3)}>
                {t(`work.${work.id}.text`)}
              </p>
            </div>
            <div className="g-case-actions r" style={at(4)}>
              {work.card === "music" && <ListenButton />}
              <a className="g-link" href={work.source} target="_blank" rel="noopener noreferrer">
                {t("source")} <Arrow diagonal />
              </a>
            </div>
          </Box>
        );
      })}

      {/* About wall */}
      <Box x={[15034, 15578]} y={[196, 476]}>
        <div className="g-title-row">
          <h2 className="g-title g-title-xl">
            <Line>{t("about.title")}</Line>
          </h2>
        </div>
        <p className="g-text g-lead r" style={at(2)}>
          {t("about.text")}
        </p>
        <ul className="g-tags">
          {aboutTags.map((tag, i) => (
            <li key={tag} className="r" style={at(3 + i * 0.5)}>
              {t(tag)}
            </li>
          ))}
        </ul>
      </Box>
      <Box x={[15034, 15234]} y={[100, 150]}>
        <div className="r" style={at(6)}>
          <Cta onClick={() => goTo(contactX)}>{t("contact.cta")}</Cta>
        </div>
      </Box>

      {/* Contact wall */}
      <Box x={[16460, 16990]} y={[210, 330]} className="g-hero">
        <h2 className="g-title g-title-xl">
          <Line>{t("stop.contact")}</Line>
        </h2>
      </Box>
      <Box x={[16467, 16677]} y={[127, 188]}>
        <div className="r" style={at(1)}>
          <Cta light onClick={() => goTo(contactX)}>
            {t("contact.cta")}
          </Cta>
        </div>
      </Box>
      <Box x={[17126, 17585]} y={[60, 479]}>
        <ContactForm />
      </Box>
    </>
  );
}
