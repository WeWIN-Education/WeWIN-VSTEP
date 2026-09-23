"use client";

import { memo, useEffect, useRef, type CSSProperties } from "react";
import { CHARACTER_STATES, characterHands, characterSource, type CharacterState, type CharacterVariant } from "./character-states";
import { createCharacterRenderer } from "./character-renderer";
import styles from "./battle-character.module.css";

export const BattleCharacter = memo(function BattleCharacter({ variant = "hero", state = "idle", facing = "right", paused = false, replay = 0, rank = 5 }: {
  variant?: CharacterVariant;
  state?: CharacterState;
  facing?: "left" | "right";
  paused?: boolean;
  replay?: number;
  rank?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createCharacterRenderer>>(null);
  const loaded = useRef(false);
  const updateMotion = useRef<(() => void) | null>(null);
  const isPaused = useRef(paused);
  const source = characterSource(variant, state);
  const label = CHARACTER_STATES.find((item) => item.state === state)!.label;

  useEffect(() => {
    isPaused.current = paused;
    updateMotion.current?.();
  }, [paused]);

  useEffect(() => {
    const element = root.current!;
    const surface = canvas.current!;
    const renderer = createCharacterRenderer(surface);
    rendererRef.current = renderer;
    const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    delete element.dataset.ready;
    const update = () => {
      const inactive = isPaused.current || motionQuery.matches || document.hidden || !visible;
      element.dataset.still = String(inactive);
      element.dataset.reduced = String(motionQuery.matches);
      renderer?.setRunning(!inactive && loaded.current);
    };
    updateMotion.current = update;
    update();
    const lost = (event: Event) => {
      event.preventDefault();
      delete element.dataset.ready;
      renderer?.setRunning(false);
      loaded.current = false;
    };
    surface.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", update);
    motionQuery.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(element);
    const resize = new ResizeObserver(() => renderer?.draw());
    resize.observe(surface);
    return () => {
      loaded.current = false;
      rendererRef.current = null;
      updateMotion.current = null;
      observer.disconnect();
      resize.disconnect();
      surface.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", update);
      motionQuery.removeEventListener("change", update);
      renderer?.dispose();
    };
  }, []);

  useEffect(() => {
    const element = root.current!;
    loaded.current = false;
    delete element.dataset.ready;
    updateMotion.current?.();
    const image = new window.Image();
    image.onload = () => {
      const renderer = rendererRef.current;
      if (renderer?.load(image, CHARACTER_STATES.findIndex(item => item.state === state), characterHands(variant, state))) {
        element.dataset.ready = "true";
      }
      loaded.current = true;
      updateMotion.current?.();
    };
    image.src = source;
    return () => { image.onload = null; };
  }, [source, state, variant, replay]);

  return (
    <div ref={root} className={styles.character} data-state={state} data-variant={variant} data-paused={paused} data-rank={rank} role="img" aria-label={`${variant === "hero" ? "Anh hùng" : "Đối thủ"}: ${label}`} style={{ "--direction": facing === "left" ? -1 : 1 } as CSSProperties}>
      <div className={styles.shadow} aria-hidden="true" />
      <div className={styles.action} aria-hidden="true">
        <div className={styles.aura} />
        <div className={styles.art}>
          {/* Static fallback remains available for reduced motion or unavailable WebGL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.fallback} src={source} alt="" width={768} height={768} draggable={false} />
          <canvas ref={canvas} className={styles.canvas} width={768} height={768} />
        </div>
        <div className={styles.shield} />
        <div className={styles.impact} />
        <div className={styles.sparkles}>{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}</div>
      </div>
    </div>
  );
});
