import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react';
import { ACADEMY_TUTORIALS, getTutorial } from '../../lib/academy';
import {
  loadAcademyProgress,
  saveAcademyProgress,
  type AcademyProgress,
} from '../../lib/storage';
import { AcademyVisualView } from '../academy/AcademyVisuals';

/**
 * Crosshair Academy — the tutorial area.
 *
 * A list of ten short tutorials and a reading view. Progress ("done" ticks)
 * persists in `crshhx_academy_progress` and nothing else: tutorials never
 * touch crosshairs or settings unless the user applies something themselves.
 */

interface AcademyViewProps {
  /** Deep-link support: open a tutorial directly (used by nav/tests). */
  initialTutorialId?: string | null;
}

export const AcademyView: React.FC<AcademyViewProps> = ({ initialTutorialId = null }) => {
  const [progress, setProgress] = useState<AcademyProgress>(() => loadAcademyProgress());
  const [openId, setOpenId] = useState<string | null>(
    initialTutorialId && getTutorial(initialTutorialId) ? initialTutorialId : null,
  );

  // Scroll back to the top when switching tutorials. The scrolling element is
  // the view's own overflow container, not the window.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [openId]);

  const completedCount = useMemo(
    () => ACADEMY_TUTORIALS.filter((t) => progress[t.id]).length,
    [progress],
  );

  const toggleComplete = (id: string, done: boolean) => {
    const next: AcademyProgress = { ...progress };
    if (done) next[id] = new Date().toISOString();
    else delete next[id];
    setProgress(next);
    saveAcademyProgress(next);
  };

  const open = openId ? getTutorial(openId) : null;

  /* ---------------- List ---------------- */
  if (!open) {
    return (
      <div ref={scrollRef} className="flex-1 p-8 bg-[#121214] text-zinc-100 overflow-y-auto select-none">
        <div className="max-w-3xl space-y-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" style={{ color: 'var(--brand-accent)' }} />
            <h2 className="text-xl font-bold">Crosshair Academy</h2>
          </div>
          <p className="text-zinc-400 text-sm max-w-xl">
            Ten short tutorials. Each one takes a few minutes. Everything is explained in plain
            language — no technical knowledge needed.
          </p>
          <div
            className="text-[11px] font-mono text-zinc-500"
            aria-label="Tutorials completed"
          >
            {completedCount} of {ACADEMY_TUTORIALS.length} completed
          </div>

          <ol className="space-y-2">
            {ACADEMY_TUTORIALS.map((tutorial, i) => {
              const done = Boolean(progress[tutorial.id]);
              return (
                <li key={tutorial.id}>
                  <button
                    onClick={() => setOpenId(tutorial.id)}
                    aria-label={`Open tutorial ${i + 1}: ${tutorial.title}`}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-lg bg-[#18181b] border border-[#26262a] hover:border-zinc-600 text-left transition-colors"
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold shrink-0 border ${
                        done
                          ? 'border-transparent'
                          : 'border-[#3f3f46] text-zinc-400'
                      }`}
                      style={done ? { backgroundColor: 'var(--brand-accent)', color: '#0a0d14' } : undefined}
                    >
                      {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-zinc-200">
                        {tutorial.title}
                      </span>
                      <span className="block text-[11px] text-zinc-500 mt-0.5">
                        {tutorial.steps.length} steps
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    );
  }

  /* ---------------- Reading view ---------------- */
  const index = ACADEMY_TUTORIALS.findIndex((t) => t.id === open.id);
  const nextTutorial = open.next ? getTutorial(open.next) : null;
  const done = Boolean(progress[open.id]);

  return (
    <div ref={scrollRef} className="flex-1 p-8 bg-[#121214] text-zinc-100 overflow-y-auto select-none">
      <div className="max-w-3xl space-y-6">
        <button
          onClick={() => setOpenId(null)}
          className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 hover:text-zinc-300"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          All tutorials
        </button>

        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Tutorial {index + 1} of {ACADEMY_TUTORIALS.length}
          </div>
          <h2 className="text-xl font-bold mt-1">{open.title}</h2>
          <p className="text-zinc-400 text-sm mt-1.5 max-w-xl">{open.intro}</p>
        </div>

        <ol className="space-y-6">
          {open.steps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-lg bg-[#18181b] border border-[#26262a] p-5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold shrink-0"
                  style={{ backgroundColor: 'var(--brand-accent)', color: '#0a0d14' }}
                >
                  {i + 1}
                </span>
                <h3 className="font-bold text-sm text-zinc-200">{step.title}</h3>
              </div>
              <p className="text-[13px] text-zinc-300 leading-relaxed">{step.text}</p>
              {step.visual && <AcademyVisualView visual={step.visual} />}
              {step.tip && (
                <p className="text-[11px] font-mono text-zinc-500 border-l-2 pl-3" style={{ borderColor: 'var(--brand-accent)' }}>
                  Tip: {step.tip}
                </p>
              )}
            </li>
          ))}
        </ol>

        <div className="flex items-center justify-between gap-3 pt-2">
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={done}
              onChange={(e) => toggleComplete(open.id, e.target.checked)}
              aria-label={`Mark "${open.title}" complete`}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
            {done ? 'Completed' : 'Mark as complete'}
          </label>

          {nextTutorial ? (
            <button
              onClick={() => setOpenId(nextTutorial.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono border transition-colors"
              style={{
                borderColor: 'var(--brand-accent)',
                color: 'var(--brand-accent)',
              }}
            >
              Next: {nextTutorial.title}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-[11px] font-mono text-zinc-500">
              That is the last tutorial. Well done.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
