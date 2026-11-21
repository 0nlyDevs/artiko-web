import { Html } from "@react-three/drei";
import { useState, type ReactNode } from "react";
import { about, contact, featured, features, hero, stops, works } from "./content";
import { Bubble, Bulb, Crown, CurvedArrow, FrameHands, HatchedArrow, Hello, PaintBox, PaletteBrush, ScrollStar, Starburst } from "./Doodles";

// One scene unit is one CSS pixel when the viewport is 755 px tall, the
// height the original camera was framed for; drei scales it from there.
const PX = 400;

type BoxProps = {
  x: [number, number];
  y: [number, number];
  z?: number;
  className?: string;
  children: ReactNode;
};

function Box({ x, y, z = 1, className, children }: BoxProps) {
  const width = x[1] - x[0];
  const height = y[1] - y[0];
  return (
    <Html transform distanceFactor={PX} position={[(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, z]} zIndexRange={[20, 10]}>
      <div className={`g-box ${className ?? ""}`} style={{ width, height }}>
        {children}
      </div>
    </Html>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M6 3 L11 8 L6 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
      <label>
        Name
        <input name="name" autoComplete="name" required />
      </label>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Question
        <textarea name="question" rows={3} />
      </label>
      <div className="g-form-row">
        <label className="g-attach" aria-label="Attach a file">
          <input type="file" hidden />
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M8 13 L14 7 C15.5 5.5 18 5.5 19 7 C20.5 8.5 20.5 10.5 19 12 L11 20 C9 22 6 22 4.5 20 C3 18.5 3 15.5 5 13.5 L12 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </label>
        <button type="submit" className="g-btn g-btn-lg">
          Send Request
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
  const contactX = stops[5].x;

  return (
    <>
      {/* Hero wall */}
      <Box x={[-562, -434]} y={[359, 464]}>
        <Starburst label="WOW" width={128} />
      </Box>
      <Box x={[316, 462]} y={[355, 463]}>
        <Bubble label={hero.bubble} icon width={146} />
      </Box>
      <Box x={[83, 345]} y={[110, 206]} className="g-salt g-descriptor">
        {hero.descriptor}
      </Box>
      <Box x={[78, 230]} y={[48, 92]}>
        <button type="button" className="g-btn g-btn-lg" onClick={() => goTo(featuresX)}>
          {hero.cta}
        </button>
      </Box>
      <Box x={[374, 478]} y={[100, 176]}>
        <CurvedArrow width={104} />
      </Box>
      <Box x={[363, 488]} y={[64, 88]} className="g-small">
        Scroll to Explore
      </Box>

      {/* Features wall */}
      <Box x={[1429, 1509]} y={[384, 464]}>
        <Crown width={80} />
      </Box>
      <Box x={[1429, 2037]} y={[150, 376]}>
        <h2 className="g-title">{features.title}</h2>
        <p className="g-text">{features.intro}</p>
      </Box>
      <Box x={[1429, 1600]} y={[92, 140]}>
        <button type="button" className="g-btn g-btn-lg" onClick={() => goTo(2255)}>
          How it works
        </button>
      </Box>
      <Box x={[1262, 1383]} y={[113, 196]}>
        <HatchedArrow width={121} />
      </Box>
      <Box x={[2043, 2171]} y={[124, 210]}>
        <PaletteBrush width={128} />
      </Box>
      {features.items.map((item, index) => {
        const x0 = 2255 + index * 440;
        return (
          <Box key={item.title} x={[x0, x0 + 380]} y={[114, 390]} className="g-item">
            <span className="g-num">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="g-title">{item.title}</h3>
            <p className="g-text">{item.text}</p>
            <button type="button" className="g-btn-outline" onClick={() => goTo(contactX)}>
              View More <Chevron />
            </button>
          </Box>
        );
      })}
      <Box x={[4740, 5100]} y={[190, 282]} className="g-salt g-more">
        {features.more}
      </Box>
      <Box x={[4830, 5010]} y={[110, 154]}>
        <button type="button" className="g-btn g-btn-lg" onClick={() => goTo(contactX)}>
          All Features
        </button>
      </Box>

      {/* Featured works wall */}
      <Box x={[6610, 6746]} y={[102, 242]}>
        <ScrollStar width={70} />
      </Box>
      <Box x={[7060, 7180]} y={[404, 480]}>
        <Hello label="OMG!" width={110} />
      </Box>
      <Box x={[6804, 7433]} y={[170, 400]}>
        <h2 className="g-title">{featured.title}</h2>
        <p className="g-text">{featured.text}</p>
      </Box>
      <Box x={[6804, 6984]} y={[112, 156]}>
        <button type="button" className="g-btn g-btn-lg" onClick={() => goTo(worksX)}>
          {featured.cta}
        </button>
      </Box>
      <Box x={[7429, 7652]} y={[58, 264]}>
        <FrameHands width={220} />
      </Box>

      {/* Works: one text block beside each frame */}
      {works.map((work, index) => {
        const x0 = 9094 + index * 859.6;
        return (
          <Box key={work.title} x={[x0, x0 + 325]} y={[121, 453]} className="g-case">
            <div>
              <h3 className="g-title">{work.title}</h3>
              <p className="g-meta">{work.meta}</p>
              <p className="g-text">{work.text}</p>
            </div>
            <a className="g-btn-outline" href={work.source} target="_blank" rel="noopener noreferrer">
              View Work <Chevron />
            </a>
          </Box>
        );
      })}

      {/* About wall */}
      <Box x={[14901, 14982]} y={[169, 270]}>
        <Bulb width={81} />
      </Box>
      <Box x={[15034, 15578]} y={[180, 422]}>
        <div className="g-title-row">
          <h2 className="g-title">{about.title}</h2>
          <Hello width={100} />
        </div>
        <p className="g-text">{about.text}</p>
      </Box>
      <Box x={[15034, 15200]} y={[112, 156]}>
        <a className="g-btn-outline g-btn-outline-lg" href="#contact" onClick={(e) => { e.preventDefault(); goTo(contactX); }}>
          {about.cta} <Chevron />
        </a>
      </Box>
      <Box x={[15584, 15733]} y={[89, 190]}>
        <PaintBox width={149} />
      </Box>

      {/* Contact wall */}
      <Box x={[16477, 16667]} y={[127, 188]}>
        <a className="g-btn-ghost" href="#join" onClick={(e) => e.preventDefault()}>
          {contact.cta}
        </a>
      </Box>
      <Box x={[16997, 17094]} y={[367, 435]}>
        <Hello width={97} />
      </Box>
      <Box x={[17126, 17585]} y={[40, 479]}>
        <ContactForm />
      </Box>
    </>
  );
}
