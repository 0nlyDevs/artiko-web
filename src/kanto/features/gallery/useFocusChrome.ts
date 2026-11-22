import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import { gsap } from '../../lib/motion/gsap';

/*
 * The chrome around a focused work, by data-anim hook:
 *
 *   focus-out   steps back while a work is in focus (logo, room label, bars)
 *   focus-wall  the wall text, which also steps back under the open notice
 *   focus-in    the controls of the focus ("Retour à la salle", the caption)
 *   focus-veil  the veil that darkens the room around the work
 *
 * The rooms decide what can be used through `inert`; this hook only plays
 * the fades. Each change starts from where the last one stopped, so a quick
 * round trip never leaves a control hidden.
 *
 * The hooks sit on the glass pills themselves, never on a wrapper around
 * them: a faded ancestor cuts a pill off from the picture it blurs, and it
 * would flash as a flat rectangle for the time of the fade.
 */

interface FocusChromeOptions {
  /** A work is in focus. */
  focused: boolean;
  /** The notice panel is open beside the room. */
  noticeOpen: boolean;
  reducedMotion: boolean;
}

/**
 * Wall-clock limit of a fade. GSAP smooths long frames, so on a machine
 * that renders the WebGL room at a few frames per second a fade could
 * otherwise leave the controls of the focus invisible for seconds.
 */
const FADE_DEADLINE_MS = 1400;

export function useFocusChrome(
  rootRef: RefObject<HTMLElement | null>,
  { focused, noticeOpen, reducedMotion }: FocusChromeOptions,
): void {
  // Nothing to undo until a work has been in focus or the notice opened.
  const touchedRef = useRef(false);

  // The room records how the visitor last acted. A click on a work moves the
  // keyboard to "Retour à la salle"; the stylesheet keeps the focus ring for
  // visitors who use the keyboard, and shows it at their first key.
  useEffect(() => {
    const root = rootRef.current;
    if (root === null) {
      return undefined;
    }
    const mark = (input: 'pointer' | 'keyboard') => (): void => {
      if (root.dataset['input'] !== input) {
        root.dataset['input'] = input;
      }
    };
    const pointer = mark('pointer');
    const keyboard = mark('keyboard');
    window.addEventListener('pointerdown', pointer, true);
    window.addEventListener('keydown', keyboard, true);
    return () => {
      window.removeEventListener('pointerdown', pointer, true);
      window.removeEventListener('keydown', keyboard, true);
    };
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null || (!touchedRef.current && !focused && !noticeOpen)) {
      return undefined;
    }
    touchedRef.current = true;

    const q = gsap.utils.selector(root);
    const controls = focused && !noticeOpen;
    const tl = gsap.timeline();

    const fade = (
      selector: string,
      visible: boolean,
      duration: number,
      delay = 0,
    ): void => {
      tl.to(
        q(selector),
        {
          opacity: visible ? 1 : 0,
          duration: reducedMotion ? 0.2 : duration,
          ease: reducedMotion ? 'none' : 'power2.out',
        },
        reducedMotion ? 0 : delay,
      );
    };

    fade('[data-anim="focus-out"]', !focused, focused ? 0.3 : 0.5);
    fade(
      '[data-anim="focus-wall"]',
      !focused && !noticeOpen,
      focused || noticeOpen ? 0.3 : 0.5,
    );
    fade('[data-anim="focus-veil"]', controls, controls ? 0.9 : 0.5);
    if (controls && !reducedMotion) {
      // The controls arrive once the camera is on its way, and keep no
      // transform once in place.
      tl.fromTo(
        q('[data-anim="focus-in"]'),
        { y: 10 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power3.out',
          clearProps: 'transform',
        },
        0.25,
      );
    } else {
      fade('[data-anim="focus-in"]', controls, 0.2);
    }

    const deadline = window.setTimeout(() => {
      tl.progress(1);
    }, FADE_DEADLINE_MS);
    return () => {
      window.clearTimeout(deadline);
      tl.kill();
    };
  }, [rootRef, focused, noticeOpen, reducedMotion]);
}
