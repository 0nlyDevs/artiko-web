import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/button/Button';
import { ButtonLink } from '../../components/button-link/ButtonLink';
import { DemoBadge } from '../../components/demo-badge/DemoBadge';
import {
  HallActions,
  HallIntro,
  HallLayout,
  HallSplit,
} from '../../components/hall-layout/HallLayout';
import { StatusBanner } from '../../components/status-banner/StatusBanner';
import { Stepper } from '../../components/stepper/Stepper';
import {
  api,
  errorMessage,
  errorRequestId,
  isApiError,
  useAsync,
} from '../../lib/api';
import type { Item } from '../../lib/api/types';
import { navigate } from '../../lib/router/router';
import type { WizardStep } from '../../app/routes';
import { paths } from '../../app/routes';
import { RequireSession } from '../account/RequireSession';
import { GalleryFade } from '../hanging/GalleryFade';
import { preloadHangingPage } from '../hanging/preload';
import type { DraftForm, Step1Errors } from './contribute-content';
import {
  createInputFromForm,
  emptyForm,
  formFromItem,
  patchFromForm,
  STEP_HEADLINES,
  STEP_LEDES,
  STEP_NEXT_LABEL,
  validateStep1,
  WIZARD_STEPS,
} from './contribute-content';
import { StepArtwork } from './steps/StepArtwork';
import { StepMedia } from './steps/StepMedia';
import { StepProvenance } from './steps/StepProvenance';
import { StepReview } from './steps/StepReview';
import styles from './WizardPage.module.css';

export interface WizardPageProps {
  /** Null while the draft is not created yet (`/contribuer/nouvelle`). */
  itemId: string | null;
  step: WizardStep;
}

const AUTOSAVE_MS = 700;

function nextLabel(step: WizardStep): string {
  switch (step) {
    case 1:
    case 2:
    case 3:
      return STEP_NEXT_LABEL[step];
    default:
      return 'Envoyer en relecture';
  }
}

function readMode3d(): boolean {
  return new URLSearchParams(window.location.search).get('mode') === '3d';
}

interface WizardFrameProps {
  step: WizardStep;
  children: ReactNode;
  onEdit?: ((step: WizardStep) => void) | undefined;
}

/** Hall frame of every step: intro, stepper, then the step itself. */
function WizardFrame({ step, children, onEdit }: WizardFrameProps) {
  return (
    <HallLayout currentPath={paths.contribute}>
      <HallSplit
        aside={
          <HallIntro
            eyebrow={`Déposer une œuvre · Étape ${String(step)} sur 4`}
            lines={STEP_HEADLINES[step]}
            lede={STEP_LEDES[step]}
          >
            <Stepper
              steps={WIZARD_STEPS}
              current={step - 1}
              onEdit={
                onEdit === undefined
                  ? undefined
                  : (index) => {
                      onEdit((index + 1) as WizardStep);
                    }
              }
            />
          </HallIntro>
        }
      >
        {children}
      </HallSplit>
    </HallLayout>
  );
}

/** `/contribuer/nouvelle`: step 1 on a local draft, created on the first "Continuer". */
function NewDraftWizard({ mode3d }: { mode3d: boolean }) {
  const [form, setForm] = useState<DraftForm>(() =>
    emptyForm(mode3d ? 'sculpture' : null),
  );
  const [errors, setErrors] = useState<Step1Errors>({});
  const [creating, setCreating] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);

  const update = (patch: Partial<DraftForm>): void => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors({});
  };

  const create = async (): Promise<void> => {
    const found = validateStep1(form);
    if (found.banner !== undefined || form.medium === null) {
      setErrors(found);
      return;
    }
    setCreating(true);
    setFailure(null);
    try {
      const item = await api.items.create(
        createInputFromForm(form, form.medium),
      );
      navigate(
        mode3d
          ? `${paths.wizard(item.id, 2)}?mode=3d`
          : paths.wizard(item.id, 2),
      );
    } catch (error) {
      setFailure(error);
      setCreating(false);
    }
  };

  return (
    <WizardFrame step={1}>
      {failure !== null && (
        <StatusBanner
          tone="error"
          className={styles.banner}
          requestId={errorRequestId(failure)}
        >
          {errorMessage(failure)}
        </StatusBanner>
      )}
      <StepArtwork
        form={form}
        errors={errors}
        onChange={update}
        mode3d={mode3d}
      />
      <HallActions>
        <Button
          variant="ghost"
          onClick={() => {
            navigate(paths.contribute);
          }}
        >
          Annuler
        </Button>
        <Button
          withArrow
          loading={creating}
          onClick={() => {
            void create();
          }}
        >
          {STEP_NEXT_LABEL[1]}
        </Button>
      </HallActions>
    </WizardFrame>
  );
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** `/contribuer/:id/etape/:n`: the four steps on a stored draft with autosave. */
function ItemWizard({
  itemId,
  step,
  mode3d,
}: {
  itemId: string;
  step: WizardStep;
  mode3d: boolean;
}) {
  const state = useAsync(`wizard:${itemId}`, () => api.items.get(itemId));
  const { setData } = state;
  const [form, setForm] = useState<DraftForm | null>(null);
  const [errors, setErrors] = useState<Step1Errors>({});
  const [save, setSave] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<
    { field: string; reason: string }[]
  >([]);
  const [submitFailure, setSubmitFailure] = useState<unknown>(null);
  // Id of the work just sent, while the screen fades to the gallery.
  const [sentId, setSentId] = useState<string | null>(null);
  const dirty = useRef(false);

  // The form starts from the stored item once, then owns its values.
  if (state.data !== null && form === null) {
    setForm(formFromItem(state.data));
  }

  // Autosave after a pause in typing.
  useEffect(() => {
    if (form === null || !dirty.current) {
      return;
    }
    setSave('saving');
    const timer = window.setTimeout(() => {
      api.items.update(itemId, patchFromForm(form)).then(
        (item) => {
          setData(item);
          setSave('saved');
        },
        (error: unknown) => {
          setSave('error');
          setSaveError(error);
        },
      );
    }, AUTOSAVE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [form, itemId, setData]);

  const update = (patch: Partial<DraftForm>): void => {
    dirty.current = true;
    setForm((current) =>
      current === null ? current : { ...current, ...patch },
    );
    setErrors({});
    setSubmitErrors([]);
  };

  const flush = async (): Promise<Item | null> => {
    if (form === null) {
      return null;
    }
    const item = await api.items.update(itemId, patchFromForm(form));
    setData(item);
    setSave('saved');
    return item;
  };

  const goTo = (target: WizardStep): void => {
    navigate(paths.wizard(itemId, target));
  };

  const next = async (): Promise<void> => {
    if (form === null) {
      return;
    }
    if (step === 1) {
      const found = validateStep1(form);
      if (found.banner !== undefined) {
        setErrors(found);
        return;
      }
    }
    try {
      await flush();
    } catch (error) {
      setSave('error');
      setSaveError(error);
      return;
    }
    if (step < 4) {
      goTo((step + 1) as WizardStep);
    }
  };

  const submit = async (): Promise<void> => {
    setSubmitting(true);
    setSubmitFailure(null);
    setSubmitErrors([]);
    try {
      await flush();
      const item = await api.items.submit(itemId);
      // The send succeeded: the screen fades slowly to gallery black, then
      // the hanging ceremony opens. The button keeps its loading state.
      preloadHangingPage();
      setSentId(item.id);
    } catch (error) {
      if (isApiError(error) && error.code === 'VALIDATION_FAILED') {
        setSubmitErrors([...error.details]);
      } else {
        setSubmitFailure(error);
      }
      setSubmitting(false);
    }
  };

  if (state.status === 'error') {
    const notFound = isApiError(state.error) && state.error.status === 404;
    return (
      <HallLayout width="narrow" currentPath={paths.contribute}>
        <HallIntro
          eyebrow="Déposer une œuvre"
          lines={
            notFound
              ? ['Cette fiche', 'est introuvable.']
              : ['La fiche', 'n’a pas pu', 'être ouverte.']
          }
          lede={
            notFound
              ? 'Elle a peut-être été retirée, ou le lien est incomplet.'
              : errorMessage(state.error)
          }
          compact
        />
        {notFound ? (
          <ButtonLink to={paths.space} variant="secondary">
            Retour à mon espace
          </ButtonLink>
        ) : (
          <Button variant="secondary" onClick={state.reload}>
            Réessayer
          </Button>
        )}
      </HallLayout>
    );
  }

  const item = state.data;
  if (item === null || form === null) {
    return (
      <WizardFrame step={step}>
        <p className="visually-hidden" role="status">
          Chargement de la fiche…
        </p>
      </WizardFrame>
    );
  }

  const locked =
    item.publication === 'published' || item.review.state === 'approved';
  if (locked) {
    return (
      <WizardFrame step={step}>
        <StatusBanner className={styles.banner}>
          Cette œuvre est publiée dans le musée. Ses informations se modifient
          depuis votre espace, avec une nouvelle relecture.
        </StatusBanner>
        <ButtonLink to={paths.space} variant="secondary">
          Aller à mon espace
        </ButtonLink>
      </WizardFrame>
    );
  }

  const note =
    save === 'saving'
      ? 'Enregistrement…'
      : save === 'error'
        ? 'Brouillon non enregistré'
        : 'Brouillon enregistré automatiquement';
  const flagged = new Set(submitErrors.map((error) => error.field));

  return (
    <WizardFrame step={step} onEdit={goTo}>
      {item.review.state === 'pending' && (
        <StatusBanner className={styles.banner}>
          Cette œuvre est en relecture. Les modifications que vous enregistrez
          seront vues par l’équipe de conservation.
        </StatusBanner>
      )}
      {item.review.state === 'changes_requested' &&
        item.review.requestedChanges !== null && (
          <StatusBanner tone="warning" className={styles.banner}>
            Corrections demandées : {item.review.requestedChanges}
          </StatusBanner>
        )}
      {save === 'error' && (
        <StatusBanner
          tone="error"
          className={styles.banner}
          requestId={errorRequestId(saveError)}
        >
          {errorMessage(saveError)}
        </StatusBanner>
      )}
      {submitFailure !== null && (
        <StatusBanner
          tone="error"
          className={styles.banner}
          requestId={errorRequestId(submitFailure)}
        >
          L’envoi a échoué. Votre brouillon est conservé —{' '}
          {errorMessage(submitFailure)}
        </StatusBanner>
      )}
      {step === 1 && (
        <StepArtwork
          form={form}
          errors={errors}
          onChange={update}
          mode3d={mode3d}
        />
      )}
      {step === 2 && <StepMedia item={item} onItem={setData} mode3d={mode3d} />}
      {step === 3 && (
        <StepProvenance form={form} onChange={update} flagged={flagged} />
      )}
      {step === 4 && (
        <StepReview
          item={item}
          form={form}
          errors={submitErrors}
          onEdit={goTo}
        />
      )}
      <HallActions note={note}>
        {step === 1 ? (
          <Button
            variant="ghost"
            onClick={() => {
              navigate(paths.contribute);
            }}
          >
            Annuler
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={() => {
              goTo((step - 1) as WizardStep);
            }}
          >
            ← Retour
          </Button>
        )}
        {step < 4 ? (
          <Button
            withArrow
            onClick={() => {
              void next();
            }}
          >
            {nextLabel(step)}
          </Button>
        ) : (
          <Button
            withArrow
            loading={submitting}
            onClick={() => {
              void submit();
            }}
          >
            Envoyer en relecture
          </Button>
        )}
      </HallActions>
      <DemoBadge />
      {sentId !== null && (
        <GalleryFade
          onDone={() => {
            navigate(paths.hanging(sentId), { replace: true });
          }}
        />
      )}
    </WizardFrame>
  );
}

/** The contribution wizard, Figma 129:62 and B1–B4. */
export function WizardPage({ itemId, step }: WizardPageProps) {
  const mode3d = readMode3d();
  return (
    <RequireSession>
      {itemId === null ? (
        <NewDraftWizard mode3d={mode3d} />
      ) : (
        <ItemWizard itemId={itemId} step={step} mode3d={mode3d} />
      )}
    </RequireSession>
  );
}
