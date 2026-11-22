import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useCallback, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DisposableModelImport } from '@/features/model-import/create-model-import';
import { ModelImportError } from '@/features/model-import/model-import-error';
import { MAX_UPLOAD_BYTES } from '@/features/model-import/limits';
import { paths } from '../../../app/routes';
import { api, resetDemoData } from '../../../lib/api';
import type { Item, UploadProgress } from '../../../lib/api/types';
import { session } from '../../../lib/session/session';
import { formFromItem } from '../contribute-content';
import {
  modelImportSession,
  resetModelImportSessions,
} from './model-import-session';
import { StepMedia } from './StepMedia';
import { StepProvenance } from './StepProvenance';
import { StepReview } from './StepReview';

// The real viewer needs WebGL. This one shows which files it was given.
vi.mock('../../artwork-viewer', () => ({
  ArtworkViewer: ({
    poster,
    model1k,
    model2k,
  }: {
    poster: string;
    model1k: string;
    model2k?: string;
  }) => (
    <section
      aria-label="Visionneuse 3D"
      data-poster={poster}
      data-model1k={model1k}
      data-model2k={model2k ?? ''}
    />
  ),
}));

const CONTRIBUTOR = {
  email: 'visiteur@kanto.demo',
  password: 'kanto-demo-2026',
};

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

/** Text of an element with every kind of space, no-break ones included, as one space. */
function textOf(element: Element): string {
  return element.textContent.replace(/\s+/g, ' ').trim();
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** A pipeline that answers at once, in place of the web worker. */
function fakeImport(
  overrides: Partial<DisposableModelImport> = {},
): () => DisposableModelImport {
  return () => ({
    converter: { convertUsdz: () => Promise.resolve(new ArrayBuffer(8)) },
    optimizer: {
      optimize: (_glb, textureSize) =>
        Promise.resolve(new ArrayBuffer(textureSize === 2048 ? 32 : 16)),
    },
    posterRenderer: {
      render: () => Promise.resolve(new Blob(['poster'], { type: 'image/webp' })),
    },
    dispose: () => undefined,
    ...overrides,
  });
}

function chooseModel(name: string): void {
  fireEvent.change(screen.getByLabelText('Ajouter un modèle 3D'), {
    target: { files: [new File(['scan'], name)] },
  });
}

type WizardStep = 2 | 3 | 4;

/** The part of the wizard this area needs: the item it holds and three of its steps. */
function Wizard({
  initial,
  create,
  seen,
}: {
  initial: Item;
  create?: (() => DisposableModelImport) | undefined;
  seen?: ((item: Item) => void) | undefined;
}) {
  const [item, setItem] = useState(initial);
  const [step, setStep] = useState<WizardStep>(2);
  const onItem = useCallback(
    (updated: Item) => {
      seen?.(updated);
      setItem(updated);
    },
    [seen],
  );
  const goTo = (target: WizardStep): void => {
    window.history.replaceState(null, '', paths.wizard(item.id, target));
    setStep(target);
  };
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void api.items.get(item.id).then(setItem);
        }}
      >
        Relire la fiche
      </button>
      {([2, 3, 4] as const).map((target) => (
        <button
          key={target}
          type="button"
          onClick={() => {
            goTo(target);
          }}
        >
          Aller à l’étape {target}
        </button>
      ))}
      {step === 2 && (
        <StepMedia
          item={item}
          onItem={onItem}
          mode3d={false}
          createModelImport={create}
        />
      )}
      {step === 3 && (
        <StepProvenance
          form={formFromItem(item)}
          onChange={() => undefined}
          flagged={new Set()}
        />
      )}
      {step === 4 && (
        <StepReview
          item={item}
          form={formFromItem(item)}
          errors={[]}
          onEdit={() => undefined}
        />
      )}
    </>
  );
}

function goToStep(step: WizardStep): void {
  fireEvent.click(
    screen.getByRole('button', { name: `Aller à l’étape ${String(step)}` }),
  );
}

function modelRows(): string[] {
  const list = screen.queryByRole('list', { name: 'Autres médias' });
  if (list === null) {
    return [];
  }
  return within(list)
    .getAllByRole('listitem')
    .map((row) => row.querySelector('span:nth-of-type(2)')?.textContent ?? '');
}

function storedModelRows(item: Item): string[] {
  return item.media
    .filter((media) => media.kind === 'model')
    .map((media) => media.name);
}

/** The weights listed under the viewer, by label. */
function sizesShown(): Record<string, string> | null {
  const terms = [...document.querySelectorAll('dl dt')];
  if (terms.length === 0) {
    return null;
  }
  return Object.fromEntries(
    terms.map((term) => [
      term.textContent,
      term.nextElementSibling?.textContent ?? '',
    ]),
  );
}

/** The one live region of the import in the media step. */
function announcer(): HTMLElement {
  const region = document.querySelector<HTMLElement>('p[role="status"]');
  if (region === null) {
    throw new Error('The import live region is not rendered');
  }
  return region;
}

function progressPanel(): HTMLElement | null {
  return screen.queryByRole('group', { name: 'Préparation du modèle 3D' });
}

function modelButton(): HTMLElement {
  return screen.getByRole('button', { name: /\+ Modèle 3D/ });
}

describe('StepMedia, scan import', () => {
  let item: Item;

  beforeEach(async () => {
    resetModelImportSessions();
    resetDemoData();
    session.reset();
    await session.signIn(CONTRIBUTOR);
    item = await api.items.create({
      title: 'Vase',
      author: '',
      medium: 'sculpture',
      details: {},
      rights: {},
    });
    window.history.replaceState(null, '', paths.wizard(item.id, 2));
    // jsdom has no object URLs. Each one names its file, so a test tells
    // which file reached the viewer.
    URL.createObjectURL = vi.fn(
      (file: Blob) => `blob:kanto-test/${(file as File).name}`,
    );
    URL.revokeObjectURL = vi.fn();
    // An object URL of this page can be read; a test replaces this for a dead one.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('glb'))),
    );
  });

  afterEach(() => {
    resetModelImportSessions();
    vi.unstubAllGlobals();
    session.reset();
    resetDemoData();
  });

  it('prepares a USDZ scan in the browser and attaches its three files to the item', async () => {
    const attach = vi.spyOn(api.items, 'attachModel');
    const seen = vi.fn<(updated: Item) => void>();
    render(<Wizard initial={item} create={fakeImport()} seen={seen} />);

    chooseModel('vase.usdz');

    const viewer = await screen.findByLabelText('Visionneuse 3D', undefined, {
      timeout: 4000,
    });
    expect(attach).toHaveBeenCalledTimes(1);
    const [id, model] = attach.mock.calls[0] ?? [];
    expect(id).toBe(item.id);
    expect(model?.sourceName).toBe('vase.usdz');
    expect([model?.model1k.name, model?.model1k.size]).toEqual([
      'vase-1k.glb',
      16,
    ]);
    expect([model?.model2k.name, model?.model2k.size]).toEqual([
      'vase-2k.glb',
      32,
    ]);
    expect([
      model?.poster.name,
      model?.poster.type,
      model?.poster.size,
    ]).toEqual(['vase-poster.webp', 'image/webp', 6]);

    // The viewer loads the standard model, offers the HD one and waits on the poster.
    expect(viewer.dataset).toMatchObject({
      model1k: 'blob:kanto-test/vase-1k.glb',
      model2k: 'blob:kanto-test/vase-2k.glb',
      poster: 'blob:kanto-test/vase-poster.webp',
    });
    expect(modelRows()).toEqual(['vase.usdz']);
    expect(sizesShown()).toEqual({
      'Modèle standard': '16 o',
      'Modèle HD': '32 o',
      'Image d’attente': '6 o',
    });
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0]?.[0].model3d.status).toBe('ready');
  });

  it('lists the steps of a USDZ file and marks each one done as the preparation moves on', async () => {
    const conversion = deferred<ArrayBuffer>();
    const hd = deferred<ArrayBuffer>();
    render(
      <Wizard
        initial={item}
        create={fakeImport({
          converter: { convertUsdz: () => conversion.promise },
          optimizer: {
            optimize: (_glb, textureSize) =>
              textureSize === 2048
                ? hd.promise
                : Promise.resolve(new ArrayBuffer(16)),
          },
        })}
      />,
    );

    chooseModel('vase.usdz');

    await waitFor(() => {
      expect(progressPanel()).not.toBeNull();
    });
    const panel = within(progressPanel() as HTMLElement);
    expect(await panel.findByText('Conversion du scan : en cours')).toBeTruthy();
    expect(panel.getByText('Optimisation du modèle HD : en attente')).toBeTruthy();
    expect(panel.getByText('vase.usdz')).toBeTruthy();

    conversion.resolve(new ArrayBuffer(8));

    expect(await panel.findByText('Conversion du scan : terminé')).toBeTruthy();
    expect(panel.getByText('Optimisation du modèle HD : en cours')).toBeTruthy();
    expect(
      panel.getByText('Optimisation du modèle standard : en attente'),
    ).toBeTruthy();
    hd.resolve(new ArrayBuffer(32));
  });

  it('announces one sentence per change, not the whole panel, and the upload once', async () => {
    const conversion = deferred<ArrayBuffer>();
    const hd = deferred<ArrayBuffer>();
    const standard = deferred<ArrayBuffer>();
    const poster = deferred<Blob>();
    const received = deferred<undefined>();
    const stored = api.items.attachModel;
    vi.spyOn(api.items, 'attachModel').mockImplementation(
      async (id, model, onProgress) => {
        onProgress?.({ loaded: 2, total: 5 });
        await received.promise;
        return stored(id, model);
      },
    );
    render(
      <Wizard
        initial={item}
        create={fakeImport({
          converter: { convertUsdz: () => conversion.promise },
          optimizer: {
            optimize: (_glb, textureSize) =>
              textureSize === 2048 ? hd.promise : standard.promise,
          },
          posterRenderer: { render: () => poster.promise },
        })}
      />,
    );
    const said = (): string => textOf(announcer());

    chooseModel('vase.usdz');
    await waitFor(() => {
      expect(said()).toBe('Conversion du scan : en cours');
    });
    // The panel and its cancel button are outside any live region.
    const panel = progressPanel() as HTMLElement;
    expect(panel.closest('[role="status"], [aria-live]')).toBeNull();
    expect(announcer().contains(panel)).toBe(false);

    conversion.resolve(new ArrayBuffer(8));
    await waitFor(() => {
      expect(said()).toBe('Optimisation du modèle HD : en cours');
    });
    hd.resolve(new ArrayBuffer(32));
    await waitFor(() => {
      expect(said()).toBe('Optimisation du modèle standard : en cours');
    });
    standard.resolve(new ArrayBuffer(16));
    await waitFor(() => {
      expect(said()).toBe('Création de l’image d’attente : en cours');
    });
    poster.resolve(new Blob(['poster'], { type: 'image/webp' }));

    // The percentage is shown next to the file name, and is not announced.
    expect(await screen.findByText('Envoi du modèle 3D… 40 %')).toBeTruthy();
    expect(said()).toBe('Envoi du modèle 3D…');

    received.resolve(undefined);
    await waitFor(
      () => {
        expect(said()).toBe('Modèle 3D ajouté : vase.usdz.');
      },
      { timeout: 4000 },
    );
    expect(screen.queryByText(/Envoi du modèle 3D…/)).toBeNull();
  });

  it('says in French why a scan cannot be used and attaches nothing', async () => {
    const attach = vi.spyOn(api.items, 'attachModel');
    const seen = vi.fn();
    render(
      <Wizard
        initial={item}
        seen={seen}
        create={fakeImport({
          converter: {
            convertUsdz: () => Promise.reject(new ModelImportError('no_mesh')),
          },
        })}
      />,
    );

    chooseModel('vide.usdz');

    const refusal = await screen.findByRole('alert');
    expect(refusal.textContent).toContain('vide.usdz');
    expect(refusal.textContent).toContain('Aucun objet 3D dans ce fichier.');
    expect(
      within(refusal).getByRole('button', { name: 'Choisir un autre fichier' }),
    ).toBeTruthy();
    expect(attach).not.toHaveBeenCalled();
    expect(seen).not.toHaveBeenCalled();
  });

  it('refuses to attach a variant heavier than the upload limit', async () => {
    const attach = vi.spyOn(api.items, 'attachModel');
    const seen = vi.fn();
    render(
      <Wizard
        initial={item}
        seen={seen}
        create={fakeImport({
          optimizer: {
            optimize: (_glb, textureSize) =>
              Promise.resolve(
                new ArrayBuffer(
                  textureSize === 2048 ? MAX_UPLOAD_BYTES + 1 : 16,
                ),
              ),
          },
        })}
      />,
    );

    chooseModel('grand.glb');

    const refusal = await screen.findByRole('alert');
    expect(textOf(refusal)).toMatch(
      /Au-delà de la limite de 20 Mo : Modèle HD\./,
    );
    // Longer than the simulated upload lasts: nothing left, nothing arrived.
    await pause(1000);
    expect(attach).not.toHaveBeenCalled();
    expect(seen).not.toHaveBeenCalled();
    expect((await api.items.get(item.id)).model3d.status).toBe('missing');
  });

  it('tells a browser that cannot prepare a scan what still works, without offering another scan', async () => {
    const seen = vi.fn();
    // No pipeline injected: jsdom has neither Worker nor OffscreenCanvas.
    render(<Wizard initial={item} seen={seen} />);

    chooseModel('vase.usdz');

    const refusal = await screen.findByRole('alert');
    expect(refusal.textContent).toContain(
      'Ce navigateur ne peut pas préparer un scan 3D. Vous pouvez ajouter un fichier .gltf, ou continuer avec vos images, sons et vidéos.',
    );
    expect(
      within(refusal).queryByRole('button', {
        name: 'Choisir un autre fichier',
      }),
    ).toBeNull();
    expect(seen).not.toHaveBeenCalled();

    fireEvent.click(within(refusal).getByRole('button', { name: 'Fermer' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.activeElement).toBe(modelButton());
  });

  it('cancels a preparation: the panel goes, the focus returns to the model button and it is said', async () => {
    const attach = vi.spyOn(api.items, 'attachModel');
    const conversion = deferred<ArrayBuffer>();
    const dispose = vi.fn();
    render(
      <Wizard
        initial={item}
        create={fakeImport({
          converter: { convertUsdz: () => conversion.promise },
          dispose,
        })}
      />,
    );
    chooseModel('vase.usdz');
    const cancel = await screen.findByRole('button', {
      name: 'Annuler la préparation',
    });
    cancel.focus();

    fireEvent.click(cancel);

    expect(progressPanel()).toBeNull();
    expect(dispose).toHaveBeenCalled();
    expect(announcer().textContent).toBe('Préparation annulée.');
    expect(announcer().className).not.toContain('visually-hidden');
    expect(document.activeElement).toBe(modelButton());

    // The pipeline answering late changes nothing.
    conversion.resolve(new ArrayBuffer(8));
    await pause(1000);
    expect(attach).not.toHaveBeenCalled();
    expect(modelRows()).toEqual([]);
    expect((await api.items.get(item.id)).model3d.status).toBe('missing');
  });

  it('sends a .gltf as it is, without preparation, in a browser that cannot prepare scans', async () => {
    const attach = vi.spyOn(api.items, 'attachModel');
    const upload = vi.spyOn(api.items, 'uploadMedia');
    render(<Wizard initial={item} />);

    chooseModel('triangle.gltf');

    const viewer = await screen.findByLabelText('Visionneuse 3D', undefined, {
      timeout: 4000,
    });
    expect(upload).toHaveBeenCalledTimes(1);
    const [id, file, options] = upload.mock.calls[0] ?? [];
    expect(id).toBe(item.id);
    expect(file?.name).toBe('triangle.gltf');
    expect(options?.kind).toBe('model');
    expect(attach).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(modelRows()).toEqual(['triangle.gltf']);
    expect(viewer.dataset).toMatchObject({
      model1k: 'blob:kanto-test/triangle.gltf',
      model2k: '',
    });
    // No weights: they belong to a prepared scan.
    expect(sizesShown()).toBeNull();
  });

  it('keeps one model when a .gltf follows a scan: one row, and no weights of the other file', async () => {
    render(<Wizard initial={item} create={fakeImport()} />);
    chooseModel('vase.usdz');
    await screen.findByLabelText('Visionneuse 3D', undefined, { timeout: 4000 });
    expect(sizesShown()).not.toBeNull();

    chooseModel('triangle.gltf');

    await waitFor(
      () => {
        expect(modelRows()).toEqual(['triangle.gltf']);
      },
      { timeout: 4000 },
    );
    expect(sizesShown()).toBeNull();
    expect(screen.getByLabelText('Visionneuse 3D').dataset['model1k']).toBe(
      'blob:kanto-test/triangle.gltf',
    );
    const stored = await api.items.get(item.id);
    expect(storedModelRows(stored)).toEqual(['triangle.gltf']);
    expect(stored.model3d.status).toBe('ready');
  });

  it('gives up the scan being prepared when a .gltf is chosen instead', async () => {
    const attach = vi.spyOn(api.items, 'attachModel');
    const conversion = deferred<ArrayBuffer>();
    render(
      <Wizard
        initial={item}
        create={fakeImport({
          converter: { convertUsdz: () => conversion.promise },
        })}
      />,
    );
    chooseModel('vase.usdz');
    await waitFor(() => {
      expect(progressPanel()).not.toBeNull();
    });

    chooseModel('triangle.gltf');

    expect(progressPanel()).toBeNull();
    await waitFor(
      () => {
        expect(modelRows()).toEqual(['triangle.gltf']);
      },
      { timeout: 4000 },
    );
    conversion.resolve(new ArrayBuffer(8));
    await pause(1000);
    expect(attach).not.toHaveBeenCalled();
    expect(modelRows()).toEqual(['triangle.gltf']);
  });

  it('removes the refusal of a scan once a .gltf is accepted', async () => {
    render(<Wizard initial={item} />);
    chooseModel('vase.usdz');
    await screen.findByRole('alert');

    chooseModel('triangle.gltf');

    await screen.findByLabelText('Visionneuse 3D', undefined, { timeout: 4000 });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('refuses a file that is neither a scan nor a .gltf, and uploads nothing', async () => {
    const upload = vi.spyOn(api.items, 'uploadMedia');
    const attach = vi.spyOn(api.items, 'attachModel');
    render(<Wizard initial={item} create={fakeImport()} />);

    chooseModel('scan.obj');

    const refusal = await screen.findByRole('alert');
    expect(refusal.textContent).toContain('scan.obj');
    expect(refusal.textContent).toContain(
      'Choisissez un fichier .usdz, .glb ou .gltf.',
    );
    await pause(1000);
    expect(upload).not.toHaveBeenCalled();
    expect(attach).not.toHaveBeenCalled();
    expect(modelRows()).toEqual([]);
    expect(screen.queryByText(/Conversion hors ligne/)).toBeNull();
    expect((await api.items.get(item.id)).model3d.status).toBe('missing');
  });

  it('removes the viewer, the weights and the import state with the model', async () => {
    render(<Wizard initial={item} create={fakeImport()} />);
    chooseModel('vase.usdz');
    await screen.findByLabelText('Visionneuse 3D', undefined, { timeout: 4000 });

    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('Visionneuse 3D')).toBeNull();
    });
    expect(modelRows()).toEqual([]);
    expect(sizesShown()).toBeNull();
    await waitFor(() => {
      expect(modelImportSession(item.id).getState()).toEqual({ phase: 'idle' });
    });
    expect(announcer().textContent).toBe('');
    expect((await api.items.get(item.id)).model3d.status).toBe('missing');
  });

  it('stops showing the weights of its scan once the item holds another model', async () => {
    render(<Wizard initial={item} create={fakeImport()} />);
    chooseModel('vase.usdz');
    await screen.findByLabelText('Visionneuse 3D', undefined, { timeout: 4000 });
    expect(sizesShown()).not.toBeNull();

    // The model is replaced from elsewhere, as a scan sent from the phone would do.
    await api.items.attachModel(item.id, {
      sourceName: 'autre.glb',
      model1k: new File(['1k'], 'autre-1k.glb'),
      model2k: new File(['2k'], 'autre-2k.glb'),
      poster: new File(['poster'], 'autre-poster.webp'),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Relire la fiche' }));

    await waitFor(
      () => {
        expect(modelRows()).toEqual(['autre.glb']);
      },
      { timeout: 4000 },
    );
    expect(sizesShown()).toBeNull();
    expect(announcer().textContent).toBe('');
    expect(
      (await screen.findByLabelText('Visionneuse 3D')).dataset['model1k'],
    ).toBe('blob:kanto-test/autre-1k.glb');
  });

  it('keeps the replacement being prepared when the previous model is removed', async () => {
    const conversion = deferred<ArrayBuffer>();
    let conversions = 0;
    render(
      <Wizard
        initial={item}
        create={fakeImport({
          converter: {
            convertUsdz: () => {
              conversions += 1;
              return conversions === 1
                ? Promise.resolve(new ArrayBuffer(8))
                : conversion.promise;
            },
          },
        })}
      />,
    );
    chooseModel('premier.usdz');
    await screen.findByLabelText('Visionneuse 3D', undefined, { timeout: 4000 });
    chooseModel('second.usdz');
    await waitFor(() => {
      expect(progressPanel()).not.toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));

    await waitFor(() => {
      expect(modelRows()).toEqual([]);
    });
    expect(progressPanel()).not.toBeNull();

    conversion.resolve(new ArrayBuffer(8));

    await waitFor(
      () => {
        expect(modelRows()).toEqual(['second.usdz']);
      },
      { timeout: 4000 },
    );
    expect(sizesShown()).not.toBeNull();
    expect(storedModelRows(await api.items.get(item.id))).toEqual([
      'second.usdz',
    ]);
  });

  it('offers to send the prepared files again when the upload fails, without preparing them again', async () => {
    const attach = vi
      .spyOn(api.items, 'attachModel')
      .mockRejectedValueOnce(new TypeError('network error'));
    const optimize = vi.fn((_glb: ArrayBuffer, textureSize: number) =>
      Promise.resolve(new ArrayBuffer(textureSize === 2048 ? 32 : 16)),
    );
    render(
      <Wizard initial={item} create={fakeImport({ optimizer: { optimize } })} />,
    );

    chooseModel('vase.usdz');

    const failure = await screen.findByRole('alert');
    expect(failure.textContent).toContain('vase.usdz');
    expect(failure.textContent).toContain(
      'Le modèle 3D n’a pas pu être envoyé. Connexion perdue. Vérifiez votre réseau puis réessayez.',
    );
    expect(modelRows()).toEqual([]);

    fireEvent.click(
      within(failure).getByRole('button', { name: 'Réessayer l’envoi' }),
    );

    await screen.findByLabelText('Visionneuse 3D', undefined, { timeout: 4000 });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(attach).toHaveBeenCalledTimes(2);
    expect(attach.mock.calls[1]?.[1].model1k).toBe(
      attach.mock.calls[0]?.[1].model1k,
    );
    expect(optimize).toHaveBeenCalledTimes(2);
    expect(modelRows()).toEqual(['vase.usdz']);
    expect(sizesShown()).not.toBeNull();
  });

  it('keeps preparing and attaches the scan when the contributor leaves the media step', async () => {
    const conversion = deferred<ArrayBuffer>();
    const seen = vi.fn<(updated: Item) => void>();
    render(
      <Wizard
        initial={item}
        seen={seen}
        create={fakeImport({
          converter: { convertUsdz: () => conversion.promise },
        })}
      />,
    );
    chooseModel('vase.usdz');
    await waitFor(() => {
      expect(progressPanel()).not.toBeNull();
    });

    goToStep(3);

    expect(screen.queryByLabelText('Ajouter un modèle 3D')).toBeNull();
    expect(
      screen.getByText(
        'Modèle 3D en préparation : vase.usdz. Vous pouvez continuer, gardez cet onglet ouvert.',
      ),
    ).toBeTruthy();

    goToStep(4);

    // The last step advises to wait, and its recap says where the model stands.
    expect(
      screen.getByText(
        'Modèle 3D en préparation : vase.usdz. Attendez qu’il soit ajouté avant d’envoyer l’œuvre en relecture.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('Aucune photographie · modèle 3D en préparation'),
    ).toBeTruthy();

    conversion.resolve(new ArrayBuffer(8));

    expect(
      await screen.findByText(
        'Modèle 3D ajouté à l’œuvre : vase.usdz.',
        undefined,
        { timeout: 4000 },
      ),
    ).toBeTruthy();
    expect(screen.getByText('Aucune photographie · modèle 3D')).toBeTruthy();
    expect(seen).toHaveBeenCalledTimes(1);
    const stored = await api.items.get(item.id);
    expect(stored.model3d.status).toBe('ready');
    expect(storedModelRows(stored)).toEqual(['vase.usdz']);

    goToStep(2);

    expect(await screen.findByLabelText('Visionneuse 3D')).toBeTruthy();
    expect(modelRows()).toEqual(['vase.usdz']);
    expect(sizesShown()).not.toBeNull();
  });

  it('says on the other steps why the model was not added, with a way back to the media step', async () => {
    const conversion = deferred<ArrayBuffer>();
    render(
      <Wizard
        initial={item}
        create={fakeImport({
          converter: { convertUsdz: () => conversion.promise },
        })}
      />,
    );
    chooseModel('vide.usdz');
    await waitFor(() => {
      expect(progressPanel()).not.toBeNull();
    });
    goToStep(3);

    conversion.reject(new ModelImportError('no_mesh'));

    expect(
      await screen.findByText(
        'Le modèle 3D n’a pas été ajouté (vide.usdz). Aucun objet 3D dans ce fichier.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Revenir aux médias' }),
    ).toHaveAttribute('href', paths.wizard(item.id, 2));

    goToStep(2);

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Aucun objet 3D dans ce fichier.',
    );
  });

  it('gives up the upload of a scan when another one is chosen, and never lists the first', async () => {
    const seen = vi.fn<(updated: Item) => void>();
    render(<Wizard initial={item} create={fakeImport()} seen={seen} />);
    chooseModel('premier.usdz');
    await screen.findByText(/Envoi du modèle 3D… \d+ %/);

    chooseModel('second.usdz');

    await waitFor(
      () => {
        expect(modelRows()).toEqual(['second.usdz']);
      },
      { timeout: 4000 },
    );
    expect(seen.mock.calls.map(([updated]) => storedModelRows(updated))).toEqual(
      [['second.usdz']],
    );
    expect(storedModelRows(await api.items.get(item.id))).toEqual([
      'second.usdz',
    ]);
  });

  it('sends one model at a time: a late answer for an abandoned scan never wins', async () => {
    const gates = [deferred<undefined>(), deferred<undefined>()];
    const signals: (AbortSignal | undefined)[] = [];
    const reports: (((progress: UploadProgress) => void) | undefined)[] = [];
    const stored = api.items.attachModel;
    // An upload that cannot be stopped once it left, as on a real network.
    const attach = vi
      .spyOn(api.items, 'attachModel')
      .mockImplementation(async (id, model, onProgress, signal) => {
        const gate = gates[signals.length];
        signals.push(signal);
        reports.push(onProgress);
        if (reports.length === 1) {
          onProgress?.({ loaded: 1, total: 1 });
        }
        await gate?.promise;
        return stored(id, model);
      });
    render(<Wizard initial={item} create={fakeImport()} />);
    chooseModel('premier.usdz');
    expect(await screen.findByText('Envoi du modèle 3D… 100 %')).toBeTruthy();

    chooseModel('second.usdz');

    // The second upload starts from zero and waits for the first to settle.
    expect(await screen.findByText('Envoi du modèle 3D… 0 %')).toBeTruthy();
    expect(screen.getByText('second.usdz')).toBeTruthy();
    expect(signals[0]?.aborted).toBe(true);
    // The first upload still reports: its progress is not the second one's.
    reports[0]?.({ loaded: 1, total: 2 });
    await pause(100);
    expect(attach).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Envoi du modèle 3D… 0 %')).toBeTruthy();
    expect(screen.getByText('second.usdz')).toBeTruthy();
    expect(screen.queryByText('premier.usdz')).toBeNull();

    gates[0]?.resolve(undefined);

    await waitFor(
      () => {
        expect(attach).toHaveBeenCalledTimes(2);
      },
      { timeout: 4000 },
    );
    // What the server stored meanwhile is listed, but the import is still the
    // second scan on its way: nothing says "added", no weights are shown.
    await waitFor(() => {
      expect(modelRows()).toEqual(['premier.usdz']);
    });
    expect(textOf(announcer())).toBe('Envoi du modèle 3D…');
    expect(screen.getByText('Envoi du modèle 3D… 0 %')).toBeTruthy();
    expect(sizesShown()).toBeNull();
    reports[1]?.({ loaded: 1, total: 1 });
    expect(await screen.findByText('Envoi du modèle 3D… 100 %')).toBeTruthy();

    gates[1]?.resolve(undefined);

    await waitFor(
      () => {
        expect(modelRows()).toEqual(['second.usdz']);
      },
      { timeout: 4000 },
    );
    expect(screen.queryByText(/Envoi du modèle 3D…/)).toBeNull();
    expect(announcer().textContent).toBe('Modèle 3D ajouté : second.usdz.');
    expect(screen.getByLabelText('Visionneuse 3D').dataset['model1k']).toBe(
      'blob:kanto-test/second-1k.glb',
    );
    expect(sizesShown()).not.toBeNull();
    expect(storedModelRows(await api.items.get(item.id))).toEqual([
      'second.usdz',
    ]);
  });

  it('does not mount a viewer on a file of an earlier session, and asks to import it again', async () => {
    const attached = await api.items.attachModel(item.id, {
      sourceName: 'vase.usdz',
      model1k: new File(['1k'], 'vase-1k.glb'),
      model2k: new File(['2k'], 'vase-2k.glb'),
      poster: new File(['poster'], 'vase-poster.webp'),
    });
    // After a reload the object URLs of the draft point to nothing.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    render(<Wizard initial={attached} />);

    expect(
      await screen.findByText(
        /Le fichier de ce modèle 3D n’était conservé que le temps d’une session/,
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Visionneuse 3D')).toBeNull();
    expect(document.querySelector('img[src^="blob:"]')).toBeNull();
    expect(modelRows()).toEqual(['vase.usdz']);
    expect(
      screen.getByRole('button', { name: 'Importer de nouveau' }),
    ).toBeTruthy();

    goToStep(4);

    expect(
      await screen.findByText(
        'Aucune photographie · modèle 3D à importer de nouveau',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/Le fichier du modèle 3D n’est plus disponible/),
    ).toBeTruthy();
  });
});
