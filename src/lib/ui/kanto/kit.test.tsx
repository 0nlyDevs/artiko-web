import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BadgeLabel,
  badgeState,
  ButtonLink,
  Cartel,
  CategoryChip,
  CategoryChipGroup,
  DemoBadge,
  DropZone,
  PantheonFrame,
  StatusBanner,
  Stepper,
  Switch,
  Tracker,
  UnderlinedField,
  WorkRow,
  WorkRows,
} from "./index";

// The server renders in English, the reference dictionary.
const html = renderToStaticMarkup;
/** The opening tag of the first element that matches. */
const tag = (markup: string, pattern: RegExp) => markup.match(pattern)?.[0] ?? "";
const attr = (element: string, name: string) => element.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

describe("CategoryChip", () => {
  it("is a link that marks the selected category as the current page", () => {
    const on = html(<CategoryChip href="/explore?category=painting" selected>Painting</CategoryChip>);
    expect(attr(tag(on, /<a[^>]*>/), "href")).toBe("/explore?category=painting");
    expect(attr(tag(on, /<a[^>]*>/), "aria-current")).toBe("page");
    expect(html(<CategoryChip href="/explore">All</CategoryChip>)).not.toContain("aria-current");
  });

  it("is a real radio button in a form", () => {
    const markup = html(
      <CategoryChipGroup role="radiogroup" label="Art form">
        <CategoryChip name="category" value="painting" selected required>Painting</CategoryChip>
        <CategoryChip name="category" value="music">Music</CategoryChip>
      </CategoryChipGroup>,
    );
    expect(markup).toContain('role="radiogroup"');
    expect(markup).toContain('aria-label="Art form"');
    const [first = "", second = "", ...others] = markup.match(/<input[^>]*>/g) ?? [];
    expect(others).toHaveLength(0);
    expect(attr(first, "type")).toBe("radio");
    expect(attr(first, "name")).toBe("category");
    expect(attr(first, "value")).toBe("painting");
    expect(first).toContain("checked");
    expect(attr(second, "value")).toBe("music");
    expect(second).not.toContain("checked");
  });

  it("is a toggle button that says whether it is pressed", () => {
    expect(attr(tag(html(<CategoryChip onClick={() => {}} selected>Painting</CategoryChip>), /<button[^>]*>/), "aria-pressed")).toBe("true");
    expect(attr(tag(html(<CategoryChip onClick={() => {}}>Painting</CategoryChip>), /<button[^>]*>/), "aria-pressed")).toBe("false");
  });
});

describe("Switch", () => {
  it("is a checkbox announced as a switch, named by its label and described by its hint", () => {
    const markup = html(<Switch name="artist" defaultChecked label="I also want to publish my works" hint="You can create your profile later." />);
    const input = tag(markup, /<input[^>]*>/);
    expect(attr(input, "type")).toBe("checkbox");
    expect(attr(input, "role")).toBe("switch");
    expect(attr(input, "name")).toBe("artist");
    expect(input).toContain("checked");
    expect(attr(tag(markup, /<label[^>]*>/), "for")).toBe(attr(input, "id"));
    const hintId = attr(input, "aria-describedby");
    expect(hintId).toBeTruthy();
    expect(markup).toContain(`id="${hintId}"`);
    expect(markup).toContain("You can create your profile later.");
  });
});

describe("UnderlinedField", () => {
  it("ties the label and the hint to the input", () => {
    const markup = html(<UnderlinedField label="Email address" name="email" type="email" hint="We never show it." />);
    const input = tag(markup, /<input[^>]*>/);
    expect(attr(tag(markup, /<label[^>]*>/), "for")).toBe(attr(input, "id"));
    expect(attr(input, "name")).toBe("email");
    expect(markup).toContain(`id="${attr(input, "aria-describedby")}"`);
    expect(input).not.toContain("aria-invalid");
  });

  it("replaces the hint by the error, marks the field invalid and announces it", () => {
    const markup = html(<UnderlinedField id="pw" label="Password" type="password" hint="10 characters minimum" error="Too short." />);
    const input = tag(markup, /<input[^>]*>/);
    expect(attr(input, "aria-invalid")).toBe("true");
    expect(attr(input, "aria-describedby")).toBe("pw-error");
    expect(markup).toContain('id="pw-error"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Too short.");
    expect(markup).not.toContain("10 characters minimum");
  });

  it("draws a textarea or a select on the same line", () => {
    expect(html(<UnderlinedField as="textarea" label="Story" name="story" rows={4} />)).toContain("<textarea");
    const select = html(
      <UnderlinedField as="select" label="Region" name="region" defaultValue="tana">
        <option value="tana">Antananarivo</option>
      </UnderlinedField>,
    );
    expect(select).toContain("<select");
    expect(select).toContain("Antananarivo");
  });
});

describe("WorkRow", () => {
  it("shows the work on one line with a link that names it", () => {
    const markup = html(
      <WorkRows label="My works">
        <WorkRow title="Hautes Terres, fin du jour" meta="Painting · November 2026" badge={<BadgeLabel state="human" />} aside="14 votes" href="/works/w1" />
      </WorkRows>,
    );
    expect(markup).toMatch(/^<ul[^>]*aria-label="My works"/);
    expect(markup).toContain("<li");
    expect(markup).toContain("Painting · November 2026");
    expect(markup).toContain("14 votes");
    expect(markup).toContain("Human-made");
    const link = tag(markup, /<a[^>]*>/);
    expect(attr(link, "href")).toBe("/works/w1");
    expect(markup).toMatch(/<a[^>]*>View<span class="visually-hidden">, Hautes Terres, fin du jour<\/span><\/a>/);
  });

  it("draws no link without an address", () => {
    expect(html(<WorkRow as="div" title="Untitled" />)).not.toContain("<a");
  });
});

describe("Cartel", () => {
  it("names a work, and becomes a link when it leads to the notice", () => {
    const plain = html(<Cartel eyebrow="01 / 12" title="Hautes Terres, fin du jour" footer="Read the notice">Painting</Cartel>);
    expect(plain).toMatch(/^<div/);
    for (const text of ["01 / 12", "Hautes Terres, fin du jour", "Painting", "Read the notice"]) expect(plain).toContain(text);
    const linked = html(<Cartel variant="honour" title="Hautes Terres, fin du jour" href="/works/w1" />);
    expect(attr(tag(linked, /<a[^>]*>/), "href")).toBe("/works/w1");
  });
});

describe("PantheonFrame", () => {
  it("frames a work", () => {
    const markup = html(
      <PantheonFrame>
        <video src="/media/w1.mp4" aria-label="Hautes Terres" />
      </PantheonFrame>,
    );
    expect(markup).toMatch(/^<figure/);
    expect(markup).toContain("/media/w1.mp4");
    expect(markup).not.toContain("data-empty");
    expect(markup).toContain("frame-gilded");
  });

  it("stays empty with its caption", () => {
    const markup = html(<PantheonFrame caption="No vote this month" />);
    expect(markup).toContain('data-empty="true"');
    expect(markup).toMatch(/<figcaption[^>]*>No vote this month<\/figcaption>/);
  });
});

describe("BadgeLabel", () => {
  it("has a label for each of the three badges", () => {
    expect(html(<BadgeLabel state="human" />)).toContain("Human-made");
    expect(html(<BadgeLabel state="ai" />)).toContain("AI-assisted");
    expect(html(<BadgeLabel state="none" />)).toContain("No proof of process yet");
    expect(html(<BadgeLabel state="human">Proven</BadgeLabel>)).toContain(">Proven<");
  });

  it("reads the badge from the two fields of a work", () => {
    expect(badgeState({ human_proven: true, ai_declared: false })).toBe("human");
    expect(badgeState({ human_proven: true, ai_declared: true })).toBe("human");
    expect(badgeState({ human_proven: false, ai_declared: true })).toBe("ai");
    expect(badgeState({ human_proven: false, ai_declared: false })).toBe("none");
  });
});

describe("KANTO pieces redrawn for the app", () => {
  it("ButtonLink is a link of the app", () => {
    const markup = html(<ButtonLink href="/me?tab=publish" withArrow>Publish a work</ButtonLink>);
    expect(attr(tag(markup, /<a[^>]*>/), "href")).toBe("/me?tab=publish");
    expect(markup).toContain("Publish a work");
    expect(markup).toContain("<svg");
  });

  it("DropZone names its file input and speaks the active language", () => {
    const markup = html(<DropZone title="Drop your file here" accept="image/*" name="media" onFiles={() => {}} />);
    const input = tag(markup, /<input[^>]*>/);
    expect(attr(input, "type")).toBe("file");
    expect(attr(input, "aria-label")).toBe("Drop your file here");
    expect(attr(input, "name")).toBe("media");
    expect(input).not.toContain("multiple");
    expect(markup).toContain("browse your device");
  });

  it("DropZone shows the progress of an upload", () => {
    const markup = html(<DropZone title="Drop your file here" busy={{ label: "Sending…", progress: 0.4 }} onFiles={() => {}} />);
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="40"');
    expect(markup).not.toContain("browse your device");
  });

  it("StatusBanner announces an error and gives its reference", () => {
    const markup = html(<StatusBanner tone="error" reference="case-42">Probable copy.</StatusBanner>);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Reference: case-42");
    expect(html(<StatusBanner>Saved.</StatusBanner>)).toContain('role="status"');
  });

  it("Stepper marks the current step and offers to edit a completed one", () => {
    const markup = html(<Stepper steps={[{ id: "work", label: "The work" }, { id: "proofs", label: "Proofs" }]} current={1} onEdit={() => {}} />);
    expect(markup).toContain('aria-label="Steps"');
    expect(markup).toContain('aria-label="Edit the step The work"');
    expect(markup).toMatch(/<li[^>]*aria-current="step"[^>]*>.*Proofs/);
  });

  it("Tracker reads the state of each step", () => {
    const markup = html(<Tracker steps={[{ id: "a", title: "Received", state: "done" }, { id: "b", title: "Hung", state: "upcoming" }]} />);
    expect(markup).toContain("Received");
    expect(markup).toContain("done");
    expect(markup).toContain("to come");
  });

  it("DemoBadge says what the screen gives it", () => {
    expect(html(<DemoBadge>Demonstration data</DemoBadge>)).toContain("Demonstration data");
  });
});
