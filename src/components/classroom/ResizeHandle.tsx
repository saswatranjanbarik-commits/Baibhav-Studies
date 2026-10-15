/**
 * ResizeHandle (v1.5) — a draggable divider between two class-room windows.
 *
 * Works with mouse, touch and pen (pointer events). While dragging, a
 * transparent cover sits over the page so the video frame can't "swallow"
 * the pointer. Keyboard: focus it and use the arrow keys. Double-click /
 * double-tap resets to the default size.
 */
import React, { useRef, useState } from 'react';
import { clampRatio } from '../../lib/classroomLayout';

interface Props {
  /** 'row' = windows side by side (vertical bar); 'column' = stacked (horizontal bar). */
  direction: 'row' | 'column';
  /** The element that holds both windows; the ratio is measured against it. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  ratio: number;
  onChange: (ratio: number) => void;
  onReset: () => void;
  label: string;
}

export default function ResizeHandle({ direction, containerRef, ratio, onChange, onReset, label }: Props) {
  const [dragging, setDragging] = useState(false);
  const lastTap = useRef(0);
  const isRow = direction === 'row';

  const ratioAt = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return ratio;
    return clampRatio(isRow ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastTap.current < 300) { onReset(); lastTap.current = 0; return; }
    lastTap.current = now;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) onChange(ratioAt(e));
  };
  const stop = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.03;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { onChange(clampRatio(ratio - step)); e.preventDefault(); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { onChange(clampRatio(ratio + step)); e.preventDefault(); }
    if (e.key === 'Home' || e.key === 'Enter') { onReset(); e.preventDefault(); }
  };

  return (
    <div
      role="separator"
      aria-orientation={isRow ? 'vertical' : 'horizontal'}
      aria-label={label}
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={20}
      aria-valuemax={85}
      tabIndex={0}
      title={`${label} — drag to resize, double-click to reset`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={onKeyDown}
      style={{ touchAction: 'none' }}
      className={`group relative shrink-0 flex items-center justify-center bg-slate-700 hover:bg-indigo-500 focus:bg-indigo-500 focus:outline-none transition-colors
        ${isRow ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize'} ${dragging ? 'bg-indigo-500' : ''}`}
    >
      {/* grip dots */}
      <span className={`rounded-full bg-slate-400 group-hover:bg-white ${isRow ? 'w-1 h-8' : 'h-1 w-8'}`} />
      {/* wider invisible touch target */}
      <span className={`absolute ${isRow ? 'inset-y-0 -inset-x-2' : 'inset-x-0 -inset-y-2'}`} />
      {/* cover the video while dragging so the frame doesn't steal the pointer */}
      {dragging && <span className={`fixed inset-0 z-50 ${isRow ? 'cursor-col-resize' : 'cursor-row-resize'}`} />}
    </div>
  );
}
