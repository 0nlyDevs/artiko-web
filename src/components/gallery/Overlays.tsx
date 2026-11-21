import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import * as THREE from "three";
import { about, contact, featured, features, hero, stops, works } from "./content";
import { Bubble, Bulb, Crown, CurvedArrow, FeatureIcon, FrameHands, HatchedArrow, Hello, PaintBox, PaletteBrush, ScrollStar, Starburst } from "./Doodles";

// One scene unit is one CSS pixel when the viewport is 755 px tall, the
// height the original camera was framed for; drei scales it from there.
const PX = 400;

const scratch = new THREE.Vector3();

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
  useFrame(({ camera }) => {
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
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = () => {
    if (!audio.current) {
      audio.current = new Audio("/museum/assets/satie-excerpt.mp3");
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
      {playing ? "Pause" : "Listen"}
    </button>
  );
}

function ContactForm() {
  const [sent, setSent] = useState(false);
  const onSubmit = (event: { preventDefault(): void }) => {
    event.preventDefault();
    setSent(true);
  };
  return (
    <form className="g-form" onSubmit={onSubmit}>
      <label className="r" style={at(0)}>
        Name
        <input name="name" autoComplete="name" required />
      </label>
      <label className="r" style={at(1)}>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="r" style={at(2)}>
        Message
        <textarea name="message" rows={3} />
      </label>
      <div className="g-form-row r" style={at(3)}>
        <label className="g-attach" aria-label="Attach a file">
          <input type="file" hidden />
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M8 13 L14 7 C15.5 5.5 18 5.5 19 7 C20.5 8.5 20.5 10.5 19 12 L11 20 C9 22 6 22 4.5 20 C3 18.5 3 15.5 5 13.5 L12 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </label>
        <button type="submit" className="g-cta g-cta-tall">
          <span className="g-cta-label">Send</span>
          <span className="g-cta-dot">
            <Arrow />
          </span>
        </button>
      </div>
      <p className="g-form-note" role="status">
        {sent ? "Message ready. Sending opens when the ARTIKO API goes live." : ""}
      </p>
    </form>
  );
}

export function Overlays({ goTo }: { goTo: (x: number) => void }) {
  const featuresX = stops[1].x;
  const worksX = 8835;
  const contactX = Infinity;

  return (
    <>
      {/* Hero wall */}
      <Box x={[-562, -434]} y={[359, 464]} className="g-doodle g-pop">
        <Starburst label="WOW" width={128} />
      </Box>
      <Box x={[316, 462]} y={[355, 463]} className="g-doodle g-float">
        <Bubble label={hero.bubble} icon width={146} />
      </Box>
      <Box x={[83, 365]} y={[106, 226]} className="g-descriptor">
        <Line>{hero.descriptor}</Line>
      </Box>
      <Box x={[78, 250]} y={[48, 98]}>
        <div className="r" style={at(1)}>
          <Cta onClick={() => goTo(featuresX)}>{hero.cta}</Cta>
        </div>
      </Box>
      <Box x={[374, 478]} y={[100, 176]} className="g-doodle g-nudge">
        <CurvedArrow width={104} />
      </Box>
      <Box x={[363, 488]} y={[64, 88]} className="g-small">
        <span className="r g-scroll-hint" style={at(2)}>
          Scroll to explore
        </span>
      </Box>

      {/* Features wall */}
      <Box x={[1429, 1509]} y={[384, 464]} className="g-doodle g-pop">
        <Crown width={80} />
      </Box>
      <Box x={[1429, 2037]} y={[150, 376]}>
        <h2 className="g-title g-title-xl">
          <Line>{features.title}</Line>
        </h2>
        <p className="g-text r" style={at(3)}>
          {features.intro}
        </p>
      </Box>
      <Box x={[1262, 1383]} y={[113, 196]} className="g-doodle g-nudge">
        <HatchedArrow width={121} />
      </Box>
      <Box x={[2043, 2171]} y={[124, 210]} className="g-doodle g-wobble">
        <PaletteBrush width={128} />
      </Box>
      {features.items.map((item, index) => {
        const x0 = 2255 + index * 440;
        const flip = index % 2 === 1;
        return (
          <Box key={item.key} x={[x0, x0 + 380]} y={[96, 420]} className={`g-feature ${flip ? "is-flip" : ""}`}>
            <div className="g-feature-art r" style={at(0)}>
              <FeatureIcon name={item.key} width={124} />
            </div>
            <div className="g-feature-copy">
              <span className="g-num r" style={at(1)}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="g-title">
                <Line i={1}>{item.title}</Line>
              </h3>
              <p className="g-text r" style={at(2)}>
                {item.text}
              </p>
            </div>
          </Box>
        );
      })}
      <Box x={[4720, 5120]} y={[200, 300]} className="g-salt g-more">
        <Line>{features.more}</Line>
      </Box>
      <Box x={[4830, 5020]} y={[110, 160]}>
        <div className="r" style={at(2)}>
          <Cta onClick={() => goTo(contactX)}>{features.cta}</Cta>
        </div>
      </Box>

      {/* Hall of Fame wall */}
      <Box x={[6610, 6746]} y={[102, 242]} className="g-doodle g-wobble">
        <ScrollStar width={70} />
      </Box>
      <Box x={[7060, 7180]} y={[404, 480]} className="g-doodle g-pop">
        <Hello label="WINNERS" width={110} />
      </Box>
      <Box x={[6804, 7433]} y={[176, 400]}>
        <h2 className="g-title g-title-xl">
          <Line>{featured.title}</Line>
        </h2>
        <p className="g-text g-lead r" style={at(2)}>
          {featured.text}
        </p>
      </Box>
      <Box x={[6804, 7004]} y={[112, 162]}>
        <div className="r" style={at(3)}>
          <Cta onClick={() => goTo(worksX)}>{featured.cta}</Cta>
        </div>
      </Box>
      <Box x={[7429, 7652]} y={[58, 264]} className="g-doodle">
        <FrameHands width={220} />
      </Box>

      {/* Art forms: one block beside each frame */}
      {works.map((work, index) => {
        const x0 = 9094 + index * 859.6;
        return (
          <Box key={work.title} x={[x0, x0 + 325]} y={[121, 453]} className="g-case">
            <div>
              <span className="g-chip r" style={at(0)}>
                {work.kind}
              </span>
              <h3 className="g-title">
                <Line i={1}>{work.title}</Line>
              </h3>
              <p className="g-meta r" style={at(2)}>
                {work.meta}
              </p>
              <p className="g-text r" style={at(3)}>
                {work.text}
              </p>
            </div>
            <div className="g-case-actions r" style={at(4)}>
              {work.card === "music" && <ListenButton />}
              <a className="g-link" href={work.source} target="_blank" rel="noopener noreferrer">
                Source <Arrow diagonal />
              </a>
            </div>
          </Box>
        );
      })}

      {/* About wall */}
      <Box x={[14901, 14982]} y={[169, 270]} className="g-doodle g-glow">
        <Bulb width={81} />
      </Box>
      <Box x={[15034, 15578]} y={[176, 422]}>
        <div className="g-title-row">
          <h2 className="g-title g-title-xl">
            <Line>{about.title}</Line>
          </h2>
          <div className="g-doodle-inline">
            <Hello width={100} />
          </div>
        </div>
        <p className="g-text g-lead r" style={at(2)}>
          {about.text}
        </p>
        <ul className="g-tags">
          {about.tags.map((tag, i) => (
            <li key={tag} className="r" style={at(3 + i * 0.5)}>
              {tag}
            </li>
          ))}
        </ul>
      </Box>
      <Box x={[15034, 15234]} y={[100, 150]}>
        <div className="r" style={at(6)}>
          <Cta onClick={() => goTo(contactX)}>{contact.cta}</Cta>
        </div>
      </Box>
      <Box x={[15584, 15733]} y={[89, 190]} className="g-doodle g-wobble">
        <PaintBox width={149} />
      </Box>

      {/* Contact wall */}
      <Box x={[16467, 16677]} y={[127, 188]}>
        <div className="r" style={at(1)}>
          <Cta light onClick={() => goTo(contactX)}>
            {contact.cta}
          </Cta>
        </div>
      </Box>
      <Box x={[16997, 17094]} y={[367, 435]} className="g-doodle g-float">
        <Hello width={97} />
      </Box>
      <Box x={[17126, 17585]} y={[60, 479]}>
        <ContactForm />
      </Box>
    </>
  );
}
