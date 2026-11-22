import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApiError, type Category, type Exposition } from "@/lib/api";
import { EMPTY_DRAFT, NEW_EXPOSITION, type Draft } from "./draft";
import { addProofs, type ProofItem } from "./file-checks";
import { ProofsStep, type ProofsStepProps } from "./proofs-step";
import { PublishFrame } from "./publish-frame";
import { WorkStep, type WorkStepProps } from "./work-step";

const categories: Category[] = [
  { id: "painting", label: "Painting" },
  { id: "sculpture", label: "Sculpture" },
  { id: "photography", label: "Photography" },
  { id: "music", label: "Music" },
  { id: "dance", label: "Dance" },
  { id: "oral_arts", label: "Oral arts" },
  { id: "crafts", label: "Crafts" },
  { id: "digital", label: "Digital" },
];
const draft: Draft = { ...EMPTY_DRAFT, title: "Hautes Terres, fin du jour", category: "painting" };
const nothing = () => {};

/** The opening tags of the controls with this name, whatever the order of their attributes. */
const controls = (html: string, name: string) => [...html.matchAll(/<(?:input|textarea)[^>]*>/g)].map((match) => match[0]).filter((tag) => tag.includes(`name="${name}"`));
const checked = (html: string, name: string) => controls(html, name).filter((tag) => tag.includes('checked=""')).map((tag) => /value="([^"]*)"/.exec(tag)?.[1]);

function sized(name: string, type: string, size: number): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

const workStep = (props: Partial<WorkStepProps> = {}) =>
  renderToStaticMarkup(
    <WorkStep
      categories={categories}
      draft={draft}
      onDraft={nothing}
      file={sized("vue-de-face.jpg", "image/jpeg", 6.1 * 1024 * 1024)}
      kind="image"
      previewUrl={null}
      pixels={{ width: 4032, height: 5040 }}
      fileError={null}
      missing={{ title: false, category: false }}
      importState={{ status: "idle" }}
      importBlocks={false}
      artistName="Rova Rasoanaivo"
      confirmingCancel={false}
      onAskCancel={nothing}
      onCancel={nothing}
      onChoose={nothing}
      onRemove={nothing}
      onContinue={nothing}
      {...props}
    />,
  );

const proofItems = (...files: File[]): ProofItem[] => addProofs([], files, 1).items;
const twoProofs = proofItems(sized("esquisse-atelier.jpg", "image/jpeg", 2.3 * 1024 * 1024), sized("geste-du-pinceau.mp4", "video/mp4", 14.2 * 1024 * 1024));
const exposition: Exposition = { id: "e1", artist_id: "a1", artist_name: "Rova", title: "Lumières des Hautes Terres", description: "", cover_url: null, works_count: 3, created_at: "2026-10-01T00:00:00Z" };

const proofsStep = (props: Partial<ProofsStepProps> = {}) =>
  renderToStaticMarkup(
    <ProofsStep
      draft={draft}
      onDraft={nothing}
      proofs={twoProofs}
      overflow={0}
      onAddProofs={nothing}
      onRemoveProof={nothing}
      expositions={[exposition]}
      missingExpositionTitle={false}
      sending={false}
      blocked={false}
      failure={undefined}
      onBack={nothing}
      onPublish={nothing}
      {...props}
    />,
  );

describe("step 1, the work (frame R1)", () => {
  it("keeps the ids the form always had for the file and the title", () => {
    const html = workStep();

    expect(controls(html, "file")[0]).toContain('id="file"');
    expect(controls(html, "file")[0]).toContain('type="file"');
    expect(controls(html, "title")[0]).toContain('id="title"');
    expect(controls(html, "title")[0]).toContain('value="Hautes Terres, fin du jour"');
    expect(controls(html, "title")[0]).toContain('maxLength="200"');
    expect(controls(html, "story")[0]).toContain('id="story"');
    expect(controls(html, "story")[0]).toContain('maxLength="5000"');
  });

  it("accepts the same files as before, the two 3D formats included", () => {
    expect(workStep()).toContain('accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm,.glb,.usdz"');
  });

  it("says what the browser read of the file", () => {
    const html = workStep();

    expect(html).toContain("vue-de-face.jpg");
    // The pixel size holds on one line: its spaces do not break.
    expect(html).toContain("Image JPG · 6.1 MB of 20 MB · 4,032\u00a0×\u00a05,040\u00a0px");
    expect(html).toContain("Shown as it is in the room, without cropping.");
    expect(html).toContain(">Replace<");
    expect(html).toContain(">Remove<");
  });

  it("offers the eight art forms as one choice among radio buttons, the chosen one checked", () => {
    const html = workStep();

    expect(controls(html, "category")).toHaveLength(8);
    expect(controls(html, "category").every((tag) => tag.includes('type="radio"'))).toBe(true);
    expect(checked(html, "category")).toEqual(["painting"]);
    expect(html).toContain('role="radiogroup"');
  });

  it("signs the draft with the artist and says it stays on this device", () => {
    expect(workStep()).toContain("Signed Rova Rasoanaivo · draft kept on this device only");
    expect(workStep({ artistName: null })).toContain("draft kept on this device only");
  });

  it("points out what is missing when asked to continue", () => {
    const html = workStep({ file: null, kind: null, pixels: null, fileError: "Choose the file of the work.", missing: { title: true, category: true }, draft: EMPTY_DRAFT });

    expect(html).toContain("Choose the file of the work.");
    expect(html).toContain("Give the work a title.");
    expect(html).toContain("Choose an art form.");
    expect(html).toContain("Drop the file of the work here");
    expect(html).toContain('aria-invalid="true"');
  });

  it("keeps the next step closed while a 3D scan is prepared or refused", () => {
    const running = workStep({ kind: "model", importBlocks: true, importState: { status: "running", steps: ["conversion", "optimization2k", "optimization1k", "poster"], current: "conversion" } });
    const failed = workStep({ kind: "model", importBlocks: true, importState: { status: "failed", code: "unreadable_usdz" } });

    expect(running).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
    expect(running).toContain("Converting the scan: in progress");
    expect(failed).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
    expect(failed).toContain("Unreadable USDZ file.");
    expect(workStep()).not.toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
  });

  it("asks before erasing a draft", () => {
    const html = workStep({ confirmingCancel: true });

    expect(html).toContain("Erase this draft?");
    expect(html).toContain(">Erase<");
    expect(html).toContain(">Keep<");
  });
});

describe("step 2, proofs and publication (frame R2)", () => {
  it("counts the valid proofs and says each was imported, with its weight", () => {
    const html = proofsStep();

    expect(html).toContain("Proofs of process · 2 of 5");
    expect(html).toContain("esquisse-atelier.jpg");
    expect(html).toContain("Imported · 2.3 MB");
    expect(html).toContain("Imported · 14.2 MB");
    expect(html).toContain("3 more possible");
  });

  it("presents the badge as a forecast once two proofs are in and no AI is declared", () => {
    const html = proofsStep();

    expect(html).toContain('data-forecast="expected"');
    expect(html).toContain("Human-made badge expected: 2 proofs for 2 required");
    expect(html).toContain("This is a forecast: the badge is given at publication.");
  });

  it("warns under two proofs that the work will not receive votes", () => {
    const html = proofsStep({ proofs: twoProofs.slice(0, 1) });

    expect(html).toContain('data-forecast="short"');
    expect(html).toContain("Human-made badge: 1 of the 2 proofs required");
    expect(html).toContain("without the badge the work cannot receive votes");
  });

  it("offers no AI declaration: every work is checked and an AI-generated one is refused", () => {
    const html = proofsStep({ draft: { ...draft, aiDeclared: true } });

    expect(html).not.toContain('name="ai_declared"');
    expect(html).not.toContain('data-forecast="ai"');
    expect(html).toContain("Only works made by humans enter KANTO.");
  });

  it("shows a refused file with its reason, without counting it among the five", () => {
    const proofs = proofItems(sized("a.jpg", "image/jpeg", 10), sized("b.jpg", "image/jpeg", 10), sized("heavy.mp4", "video/mp4", 62 * 1024 * 1024), sized("scan-dos.tiff", "image/tiff", 10));

    const html = proofsStep({ proofs });

    expect(html).toContain("Proofs of process · 2 of 5");
    expect(html).toContain("Too heavy: 62 MB. 20 MB at most per proof.");
    expect(html).toContain("Type not accepted: image, sound or video only.");
    expect(html).toContain("3 more possible");
    expect(html.match(/>Replace</g)).toHaveLength(2);
  });

  it("closes the add tile at five proofs and says when files were left out", () => {
    const five = proofItems(...[1, 2, 3, 4, 5].map((n) => sized(`p${n}.jpg`, "image/jpeg", 10)));

    const html = proofsStep({ proofs: five, overflow: 2 });

    expect(html).toContain("Proofs of process · 5 of 5");
    expect(html).not.toContain("more possible");
    expect(html).toContain("2 files were not added: 5 proofs at most.");
  });

  it("shows the two settings on their default values: private proofs, no exposition", () => {
    const html = proofsStep();

    expect(html).toContain("Visible to you only");
    expect(checked(html, "proof_visibility")).toEqual(["reviewers"]);
    expect(checked(html, "exposition")).toEqual([""]);
    expect(html).toContain("Lumières des Hautes Terres");
    expect(html).toContain("New exposition…");
  });

  it("asks for the title and the description of a new exposition, created when publishing", () => {
    const html = proofsStep({ draft: { ...draft, exposition: NEW_EXPOSITION }, missingExpositionTitle: true });

    expect(controls(html, "expo_title")[0]).toContain('maxLength="200"');
    expect(controls(html, "expo_description")[0]).toContain('maxLength="2000"');
    expect(html).toContain("Give the exposition a title.");
    expect(html).toContain("It is created when you publish.");
  });

  it("says the publication is final and sends everything with one button", () => {
    const html = proofsStep();

    expect(html).toContain("Final publication, no going back");
    expect(html.match(/type="submit"/g)).toHaveLength(1);
    expect(html).toContain("Publish the work");
  });

  it("shows the progress on the button while sending, with the form locked", () => {
    const html = proofsStep({ sending: true });

    expect(html).toContain("Publishing");
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""[^>]*aria-busy="true"/);
    expect(html).toContain('aria-busy="true"');
  });

  it.each([
    [new ApiError(409, "duplicate_work", "dup"), "This exact file is already published on KANTO."],
    [new ApiError(413, "file_too_large", "big"), "A file is over the size limit."],
    [new ApiError(422, "invalid_request", "bad"), "Something sent was not valid. Check what you entered, then try again."],
    [new ApiError(403, "not_an_artist", "no"), "Create your artist profile first."],
    [new ApiError(429, "rate_limited", "slow", null, 30), "Too many attempts: try again in 30 seconds."],
    [null, "The work was not published. Check your connection and try again."],
  ])("says a refusal under the button and keeps what was typed (%#)", (failure, sentence) => {
    const html = proofsStep({ failure });

    expect(html).toMatch(new RegExp(`role="alert"[^>]*>.*${sentence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    expect(html).toContain("esquisse-atelier.jpg");
    expect(html.indexOf(sentence)).toBeGreaterThan(html.indexOf('type="submit"'));
  });
});

describe("the two steps as states of one address", () => {
  it("names the step and lets the first one be edited from the second", () => {
    const first = renderToStaticMarkup(
      <PublishFrame step={1}>
        <p>fields</p>
      </PublishFrame>,
    );
    const second = renderToStaticMarkup(
      <PublishFrame step={2} onEdit={nothing}>
        <p>fields</p>
      </PublishFrame>,
    );

    expect(first).toContain("Publish a work · 1 of 2");
    expect(first).toMatch(/<h1[^>]*>Entrust your work <span[^>]*>to the museum\.<\/span><\/h1>/);
    expect(first).not.toContain("Edit the step");
    expect(second).toContain("Publish a work · 2 of 2");
    expect(second).toContain('aria-label="Edit the step The work"');
  });
});
