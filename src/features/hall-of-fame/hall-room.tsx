import Image from "next/image";
import type { ReactNode } from "react";
import { T } from "@/i18n/locale";
import redRoom from "@/kanto/assets/gallery/scene-red-room-1920.webp";
import styles from "./hall-of-fame.module.css";

/**
 * The room of honour of frame R10, before any answer of the API: the scene, the title and the rule of the room.
 * The two data attributes ask the shell for its dark bars and for a page without gutter.
 * `children` are the months, the art forms and the wall; the stylesheet places each of them in the room.
 */
export function HallRoom({ children }: { children: ReactNode }) {
  return (
    <section className={styles.room} data-shell-theme="dark" data-shell-bleed="" aria-labelledby="hall-title">
      <div className={styles.scene} aria-hidden="true">
        {/* The red room of the museum, desaturated and lit in gold: a dedicated photograph can replace it here. */}
        <Image className={styles.sceneImage} src={redRoom} alt="" fill sizes="100vw" />
        <span className={styles.halo} />
      </div>
      <h1 id="hall-title" className={styles.title}>
        <T k="hall.title" />
      </h1>
      {children}
      <p className={styles.rule}>
        <T k="hall.intro" />
      </p>
    </section>
  );
}
