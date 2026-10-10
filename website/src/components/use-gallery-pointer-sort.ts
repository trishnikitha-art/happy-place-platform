"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { nearestGalleryIndex, passedGalleryDragThreshold, reorderVisibleGallery, type GalleryRect } from "@/lib/gallery-pointer-sort";

interface SortSession {
  pointerId: number;
  element: HTMLElement;
  projectId: string;
  sourceId: string;
  rects: GalleryRect[];
  sourceIndex: number;
  targetIndex: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  scrollX: number;
  scrollY: number;
  active: boolean;
  src: string;
}

export interface GalleryPointerCommit {
  projectId: string;
  sourceId: string;
  targetId: string;
  visibleOrder: string[];
}

export function useGalleryPointerSort(onCommit: (commit: GalleryPointerCommit) => void) {
  const session = useRef<SortSession | null>(null);
  const animation = useRef<number | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const suppressed = useRef<{ id: string; until: number } | null>(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const [drag, setDrag] = useState<SortSession | null>(null);

  const release = () => {
    const current = session.current;
    session.current = null;
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
    if (current?.element.hasPointerCapture(current.pointerId)) current.element.releasePointerCapture(current.pointerId);
    return current;
  };

  const finish = (commit: boolean) => {
    const current = release();
    setDrag(null);
    if (!current?.active) return;
    suppressed.current = { id: current.sourceId, until: Date.now() + 350 };
    const x = current.x + window.scrollX - current.scrollX;
    const y = current.y + window.scrollY - current.scrollY;
    const insideProject = current.rects.some(rect => x >= rect.left && x <= rect.left + rect.width
      && y >= rect.top - 20 && y <= rect.top + rect.height + 20);
    if (commit && insideProject && current.targetIndex !== current.sourceIndex) {
      commitRef.current({ projectId: current.projectId, sourceId: current.sourceId,
        targetId: current.rects[current.targetIndex].id,
        visibleOrder: reorderVisibleGallery(current.rects.map(rect => rect.id), current.sourceIndex, current.targetIndex) });
      console.info("[GALLERY_POINTER] COMMIT", { projectId: current.projectId, targetIndex: current.targetIndex });
    }
  };

  const frame = () => {
    animation.current = null;
    const current = session.current;
    if (!current?.active) return;
    const dy = current.y < 64 ? -12 : current.y > window.innerHeight - 64 ? 12 : 0;
    if (dy) window.scrollBy(0, dy);
    const target = nearestGalleryIndex(current.rects,
      current.x + window.scrollX - current.scrollX, current.y + window.scrollY - current.scrollY);
    if (target !== current.targetIndex) {
      current.targetIndex = target;
      setDrag({ ...current });
    }
    if (ghostRef.current) ghostRef.current.style.transform = `translate3d(${current.x - current.startX}px, ${current.y - current.startY}px, 0)`;
    if (dy) animation.current = requestAnimationFrame(frame);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>, projectId: string, sourceId: string) => {
    if (event.button !== 0 || !event.isPrimary || session.current) return;
    suppressed.current = null;
    const section = event.currentTarget.closest("[data-archive-grid], .project-gallery-section");
    if (!section) return;
    const rects = Array.from(section.querySelectorAll<HTMLElement>("[data-media-id]")).map(element => {
      const rect = element.getBoundingClientRect();
      return { id: element.dataset.archiveKey || element.dataset.mediaId!, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    });
    const sourceIndex = rects.findIndex(rect => rect.id === sourceId);
    if (sourceIndex < 0) return;
    const element = event.currentTarget;
    session.current = { pointerId: event.pointerId, element, projectId, sourceId, rects, sourceIndex,
      targetIndex: sourceIndex, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
      scrollX: window.scrollX, scrollY: window.scrollY, active: false,
      src: element.querySelector("img")?.currentSrc || element.querySelector("img")?.src || "" };
    element.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const current = session.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.x = event.clientX;
    current.y = event.clientY;
    if (!current.active && passedGalleryDragThreshold(current.x - current.startX, current.y - current.startY)) {
      current.active = true;
      setDrag({ ...current });
      console.info("[GALLERY_POINTER] START", { projectId: current.projectId, sourceIndex: current.sourceIndex });
    }
    if (current.active) {
      event.preventDefault();
      if (animation.current === null) animation.current = requestAnimationFrame(frame);
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (session.current?.pointerId !== event.pointerId) return;
    // Include the final pointer position even when pointerup beats the next RAF.
    session.current.x = event.clientX;
    session.current.y = event.clientY;
    if (session.current.active) frame();
    finish(true);
  };
  const onPointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
    if (session.current?.pointerId === event.pointerId) finish(false);
  };

  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === "Escape" && session.current) { event.preventDefault(); finish(false); } };
    const blur = () => { if (session.current) finish(false); };
    window.addEventListener("keydown", cancel);
    window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", cancel); window.removeEventListener("blur", blur); release(); };
  }, []);

  const cardStyle = (projectId: string, id: string): CSSProperties | undefined => {
    if (!drag || drag.projectId !== projectId) return;
    const index = drag.rects.findIndex(rect => rect.id === id);
    if (index < 0) return;
    if (id === drag.sourceId) {
      const from = drag.rects[drag.sourceIndex];
      const to = drag.rects[drag.targetIndex];
      return { opacity: 0.2, outline: "2px dashed #d99a4e", outlineOffset: "-2px",
        transform: `translate3d(${to.left - from.left}px, ${to.top - from.top}px, 0)` };
    }
    const order = reorderVisibleGallery(drag.rects.map(rect => rect.id), drag.sourceIndex, drag.targetIndex);
    const position = order.indexOf(id);
    const from = drag.rects[index];
    const to = drag.rects[position];
    return { transform: `translate3d(${to.left - from.left}px, ${to.top - from.top}px, 0)`, transition: "transform 140ms ease", position: "relative", zIndex: 1 };
  };

  return { drag, ghostRef, cardStyle, onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
    suppressClick: (id: string) => suppressed.current?.id === id && Date.now() < suppressed.current.until,
    cancel: () => finish(false) };
}
