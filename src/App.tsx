import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import CARD_IMAGE_URLS from './imageMap';
// CSV data via Vite-managed URLs (no query strings) so builds fingerprint and refresh on deploy
const aspectsCsvUrl = new URL('./assets/data/aspects.csv', import.meta.url).href;
const cardsCsvUrl = new URL('./assets/data/cards.csv', import.meta.url).href;
// Optional remote override for codes; otherwise use local Vite asset
const __CODES_BASE = ((import.meta as any)?.env?.VITE_CODES_URL) as string | undefined;
const codesCsvUrl = __CODES_BASE || new URL('./assets/data/unlock_codes.csv', import.meta.url).href;

/** ------------------------
 * Card Data
 * ---------------------- */
type SpellType = "Holy" | "Light" | "Dark" | "Astral" | "Shadow";

type Aspect = {
  slug: string;
  name: string;
  isBasic?: boolean;
  isDark?: boolean;
  isSpecial?: boolean;
  order?: number;
};

type Card = {
  id: string;
  name: string;
  type: SpellType;
  rank: number;
  maxCopies: number;
  aspect: Aspect["slug"];
};

// All card and aspect data is sourced from CSV files in src/assets/data

// Optional rules/effect text was used in tooltips; removed with tooltip feature.

// Image sheets removed: each card uses its own file by id under src/assets/cards/

//

// Unlock codes are now sourced from CSV (see src/assets/data/unlock_codes.csv)

/** ------------------------
 * CSV loading (optional)
 * ---------------------- */
type CsvRow = Record<string, string>;
function parseCSV(raw: string): CsvRow[] {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n").filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map(h => h.trim());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = splitCsvLine(lines[i]);
    const row: CsvRow = {};
    headers.forEach((h, idx) => { row[h] = (parts[idx] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
}
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else cur += ch;
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"') { inQuotes = true; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function toBool(v: string | undefined): boolean | undefined {
  if (!v) return undefined;
  const t = v.trim().toLowerCase();
  if (["true","1","yes","y"].includes(t)) return true;
  if (["false","0","no","n"].includes(t)) return false;
  return undefined;
}

function toNum(v: string | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function loadDataFromCsv() {
  const [aspectsRaw, cardsRaw, codesRaw] = await Promise.all([
    fetch(aspectsCsvUrl).then(r => r.ok ? r.text() : ''),
    fetch(cardsCsvUrl).then(r => r.ok ? r.text() : ''),
    fetch(codesCsvUrl).then(r => r.ok ? r.text() : ''),
  ]);

  const aspects: Aspect[] | undefined = aspectsRaw
    ? parseCSV(aspectsRaw).map(r => ({
        slug: r.slug,
        name: r.name,
        isBasic: toBool(r.isBasic),
        isDark: toBool(r.isDark),
        isSpecial: toBool(r.isSpecial),
        order: toNum(r.order),
      })).filter(a => a.slug && a.name)
    : undefined;

  // Build a robust mapping from various aspect representations -> slug
  const aspectSlugByKey: Record<string, string> = aspects
    ? aspects.reduce((acc, a) => {
        const slug = (a.slug || '').trim().toLowerCase();
        const name = (a.name || '').trim().toLowerCase();
        const nameNoPrefix = name.replace(/^aspect of\s+/i, '').toLowerCase();
        const nameSpacedToSlug = name.replace(/\s+/g, '-').toLowerCase();
        const nameNoPrefixSlug = nameNoPrefix.replace(/\s+/g, '-').toLowerCase();
        acc[slug] = a.slug;
        acc[name] = a.slug;
        acc[nameNoPrefix] = a.slug;
        acc[nameSpacedToSlug] = a.slug;
        acc[nameNoPrefixSlug] = a.slug;
        return acc;
      }, {} as Record<string, string>)
    : {};

  const cards: Card[] | undefined = cardsRaw
    ? parseCSV(cardsRaw).map(r => {
        const rawAspect = (r.aspect || '').trim();
        const normalizedAspect = aspectSlugByKey[rawAspect.toLowerCase()] || (rawAspect as Aspect['slug']);
        return {
          id: r.id,
          name: r.name,
          type: (r.type as SpellType),
          rank: Number(r.rank || 0),
          maxCopies: Number(r.maxCopies || 0),
          aspect: normalizedAspect,
        } as Card;
      }).filter(c => c.id && c.name && c.aspect)
    : undefined;

  const codes: Record<string, string> | undefined = codesRaw
    ? Object.fromEntries(
        parseCSV(codesRaw)
          .map(r => [
            (r.code || '').trim().toUpperCase(),
            (r.slug || '').trim().toLowerCase(),
          ])
          .filter(([code, slug]) => code && slug)
      )
    : undefined;

  return { aspects, cards, codes } as { aspects?: Aspect[]; cards?: Card[]; codes?: Record<string,string> };
}

const TYPE_ORDER: Record<SpellType, number> = { Holy: 5, Light: 4, Astral: 3, Shadow: 2, Dark: 1 };

/** ------------------------
 * Small UI helpers
 * ---------------------- */
function Pill({ children }: { children: React.ReactNode }) {
  return <span className="px-2 py-1 rounded-full text-xs bg-slate-200 dark:bg-slate-700 dark:text-slate-100">{children}</span>;
}

// Tooltip removed in favor of click-to-open preview modal

function AspectCard({
  aspect,
  unlocked,
  selected,
  disabled = false,
  onToggle,
}: {
  aspect: Aspect;
  unlocked: boolean;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={() => {
        console.log('[AspectCard.click]', { slug: aspect.slug, selected, disabled, unlocked });
        onToggle();
      }}
      disabled={!unlocked || disabled}
      className={[
        "rounded-2xl p-4 w-full text-center border transition shadow-sm focus:outline-none relative",
        selected
          ? [
              // Light mode selected style
              "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500 ring-offset-2 ring-offset-white shadow-md z-10",
              // Dark mode selected style — darker panel, indigo accents, correct offset
              "dark:bg-slate-800 dark:border-indigo-400 dark:ring-indigo-400 dark:ring-offset-slate-900",
            ].join(' ')
          : "border-slate-400 bg-slate-200 hover:bg-slate-300 hover:shadow-md dark:bg-slate-800 dark:border-slate-600",
        (!unlocked || disabled) ? "opacity-40 cursor-not-allowed pointer-events-none" : "hover:border-slate-500",
      ].join(" ")}
    >
      <div className="flex flex-col items-center gap-1">
        {unlocked ? (
          <>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {aspect.isBasic ? "Basics" : aspect.isSpecial ? "Special" : aspect.isDark ? "Dark Art" : "Aspect"}
            </div>
            <div className="text-base font-semibold">{aspect.name}</div>
          </>
        ) : (
          <div className="text-base font-semibold">Locked</div>
        )}
        <div className="flex items-center gap-2 mt-1">          
          {selected && <Pill>(Selected)</Pill>}
        </div>
      </div>
    </button>
  );
}

function UnlockModal({
  onRedeem,
  onClose,
}: {
  onRedeem: (code: string) => { ok: boolean; unlockedName?: string; status?: 'ok' | 'invalid' | 'used' };
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [lastUnlocked, setLastUnlocked] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      tabIndex={-1}
    >
      <div
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-3 min-h-[180px] border border-slate-200 dark:border-slate-700"
        style={{ borderRadius: '1rem', padding: '1.5rem', maxWidth: 480, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-center text-black dark:text-slate-100">Unlock an Aspect</h2>
        {lastUnlocked && (
          <div className="text-sm text-center font-medium text-slate-900 dark:text-slate-100">
            {lastUnlocked === 'Invalid Code' || lastUnlocked === 'Code Already Used'
              ? lastUnlocked
              : `Unlocked: ${lastUnlocked}`}
          </div>
        )}
        <p className="text-xl text-center text-black dark:text-slate-100">
          Enter your code to reveal an Aspect’s spells.
        </p>
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code"
          className="w-full h-[60px] border rounded-xl p-6 text-2xl uppercase bg-white text-black placeholder:text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400 dark:border-slate-700"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const res = onRedeem(code);
              if (res?.ok) {
                setLastUnlocked(res.unlockedName || null);
              } else {
                setLastUnlocked(res?.status === 'used' ? 'Code Already Used' : 'Invalid Code');
              }
              setCode("");
              setTimeout(() => inputRef.current?.focus(), 0);
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => {
              console.log("[UI] Redeem clicked");
              const res = onRedeem(code);
              if (res?.ok) {
                setLastUnlocked(res.unlockedName || null);
              } else {
                setLastUnlocked(res?.status === 'used' ? 'Code Already Used' : 'Invalid Code');
              }
              setCode("");
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="flex-1 rounded-xl bg-indigo-600 text-white py-2 font-medium hover:bg-indigo-700"
          >
            Unlock
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 py-2 font-medium hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CardRow({
  card,
  qty,
  onChange,
  locked,
  onPreview,
  remainingSlots,
  remainingTypeSlots,
  onCapAttempt,
}: {
  card: Card;
  qty: number;
  onChange: (n: number) => void;
  locked: boolean;
  onPreview?: (card: Card) => void;
  remainingSlots: number;
  remainingTypeSlots: number;
  onCapAttempt?: (t: SpellType) => void;
}) {
  const countsTowardPages = card.type !== 'Astral' && card.type !== 'Shadow';
  const noRoomTotal = countsTowardPages && remainingSlots <= 0;
  const noRoomType = countsTowardPages && remainingTypeSlots <= 0;
  const addDisabled = !locked && (noRoomTotal || qty >= card.maxCopies);
  return (
    <div className="flex items-center gap-3 py-2 px-4 md:px-6 lg:px-8">
      {/* Left: name button */}
      <div className="shrink-0 font-medium text-left">
        {locked ? (
          <span className="text-slate-500">{"<Locked>"}</span>
        ) : (
          <button
            type="button"
            className="inline-flex items-center rounded px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-sm dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            onClick={() => { console.log('[CardRow.preview]', { id: card.id, name: card.name }); onPreview?.(card); }}
          >
            {card.name}
          </button>
        )}
      </div>
      {/* Center: type/rank/max — stacked on mobile, grouped with spacing on md+ */}
      <div className="flex-1 leading-tight text-center md:text-left md:pl-2">
        {/* Mobile: stacked */}
        <div className="md:hidden text-left pl-2">
          <div className="text-base text-slate-600 dark:text-slate-300">
            {(() => {
              const PARALLEL_IDS = new Set<string>([
                'energy_supernova_converter','energy_will_power','energy_fears_grasp','energy_rage_unleashed',
                'madness_twisted_space','madness_shattered_time','madness_splintered_mind','madness_unhinged_reality','madness_chaotic_power','madness_eclipsed_soul',
              ]);
              const mark = !locked && PARALLEL_IDS.has(card.id) ? ' (Parallel)' : '';
              return locked ? '?' : `${card.type}${mark} · R${card.rank}`;
            })()}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-300 mt-1">Max {card.maxCopies}</div>
        </div>
        {/* Desktop: single line with spacing between left (type/rank) and right (Max) */}
        <div className="hidden md:flex items-baseline justify-start gap-6">
          <span className="text-base text-slate-600 dark:text-slate-300">
            {(() => {
              const PARALLEL_IDS = new Set<string>([
                'energy_supernova_converter','energy_will_power','energy_fears_grasp','energy_rage_unleashed',
                'madness_twisted_space','madness_shattered_time','madness_splintered_mind','madness_unhinged_reality','madness_chaotic_power','madness_eclipsed_soul',
              ]);
              const mark = !locked && PARALLEL_IDS.has(card.id) ? ' (Parallel)' : '';
              return locked ? '?' : `${card.type}${mark} · R${card.rank}`;
            })()}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-300">Max {card.maxCopies}</span>
        </div>
      </div>

      {/* Right controls pinned to the far right */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <button
          onClick={() => { if (qty <= 0) return; const n = Math.max(0, qty - 1); console.log('[CardRow.qty-]', { id: card.id, from: qty, to: n }); onChange(n); }}
          disabled={qty <= 0}
          className={["px-2 py-1 rounded shadow-sm text-base md:text-lg font-bold text-slate-900 dark:text-slate-900 leading-none", qty <= 0 ? "bg-slate-100 opacity-50 cursor-not-allowed" : "bg-slate-100"].join(' ')}
        >
          -
        </button>
        <div className="w-8 text-center">{qty}</div>
        <button
          onClick={() => {
            if (locked) return;
            if (noRoomType) { onCapAttempt?.(card.type); return; }
            if (addDisabled) return;
            const n = Math.min(card.maxCopies, qty + 1);
            console.log('[CardRow.qty+]', { id: card.id, from: qty, to: n });
            onChange(n);
          }}
          disabled={locked || noRoomTotal || qty >= card.maxCopies}
          className={["px-2 py-1 rounded shadow-sm text-base md:text-lg font-bold text-slate-900 dark:text-slate-900 leading-none", locked || addDisabled || qty >= card.maxCopies ? "bg-slate-100 opacity-50 cursor-not-allowed" : "bg-slate-100"].join(' ')}
        >
          +
        </button>
        <button
          onClick={() => {
            if (locked) return;
            if (!countsTowardPages) {
              console.log('[CardRow.max]', { id: card.id, to: card.maxCopies });
              onChange(card.maxCopies);
              return;
            }
            const roomTotal = Math.max(0, remainingSlots);
            const roomType = Math.max(0, remainingTypeSlots);
            const room = Math.min(roomTotal, roomType);
            if (room <= 0) { if (roomType <= 0) onCapAttempt?.(card.type); return; }
            const target = Math.min(card.maxCopies, qty + room);
            console.log('[CardRow.max]', { id: card.id, from: qty, room, to: target });
            onChange(target);
          }}
          disabled={locked || noRoomTotal}
          className={["px-2 py-1 rounded shadow-sm", (locked || noRoomTotal) ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"].join(' ')}
          title={`Set to Max (${card.maxCopies})`}
        >
          MAX
        </button>
      </div>
    </div>
  );
}

function CardPreviewModal({ card, aspectLabel, onClose }: { card: Card; aspectLabel: string; onClose: () => void }) {
  // Resolve URL from statically imported map; fallback to message on error
  const [errored, setErrored] = useState(false);
  const url = CARD_IMAGE_URLS[card.id];

  if (import.meta.url && (import.meta as any).env?.DEV) {
    console.debug('[CardPreview]', card.id, '→', url);
  }

  const target = (typeof document !== 'undefined' && document.getElementById('root')) || document.body;
  const overlayRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // Focus the overlay so onKeyDown captures ESC; also attach a document fallback
    overlayRef.current?.focus();
    const onDocKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onDocKey);
    return () => document.removeEventListener('keydown', onDocKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ position: 'fixed', inset: 0 as any, zIndex: 2147483647, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)' }}
      data-test="card-preview-modal"
      ref={overlayRef}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      tabIndex={-1}
    >
      <div
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-2xl p-4 flex flex-col gap-3 pointer-events-auto border border-slate-200 dark:border-slate-700"
        style={{ borderRadius: '1rem', maxWidth: '42rem', width: '100%', padding: '1rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{card.name}</h3>
            <div className="text-sm text-slate-800 dark:text-slate-200">[{card.type}] · R{card.rank} · {aspectLabel}</div>
          </div>
          <button
            type="button"
            aria-label="Close preview"
            className="rounded-lg px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:border-slate-700"
            onClick={() => { console.log('[CardPreview.close]', { id: card.id }); onClose(); }}
          >
            Close
          </button>
        </div>

        <div className="flex items-center justify-center p-2 text-center">
          {!errored && url ? (
            <img
              src={url}
              alt={`${card.name} card`}
              className="max-w-full max-h-[70vh] rounded-md shadow-md object-contain"
              onError={() => setErrored(true)}
            />
          ) : (
            <div className="text-sm text-slate-900 dark:text-slate-100 text-center">
              No image available for this card.
              <br />
              <span className="text-xs text-slate-600 dark:text-slate-300">id: {card.id}</span>
              {url ? (
                <>
                  <br />
                  <span className="text-xs text-slate-600 dark:text-slate-300">url: {url}</span>
                </>
              ) : (
                <>
                  <br />
                  <span className="text-xs text-slate-600 dark:text-slate-300">expected: src/assets/cards/{card.id}.png</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    target
  );
}

function DeckExport({ entries, aspects, cards, hasAstral, hasShadow }: { entries: { cardId: string; qty: number }[]; aspects: Aspect[]; cards: Card[]; hasAstral: boolean; hasShadow: boolean }) {
  const groups = useMemo(() => {
    const nameByAspect: Record<string, string> = Object.fromEntries(
      aspects.map((a) => [a.slug, a.name] as const)
    );

    const expanded = entries
      .filter((e) => e.qty > 0)
      .map((e) => {
        const c = cards.find((x) => x.id === e.cardId)!;
        return { qty: e.qty, card: c, aspectName: nameByAspect[c.aspect] || c.aspect };
      });

    // Build groups by type in order Holy > Light > Dark > Astral > Shadow
    const typeOrder: SpellType[] = ["Holy", "Light", "Dark", "Astral", "Shadow"];
    const result: { type: SpellType; lines: string[] }[] = [];

    for (const t of typeOrder) {
      const items = expanded
        .filter((x) => x.card.type === t)
        .sort((A, B) => {
          const aspectCmp = A.aspectName.localeCompare(B.aspectName);
          if (aspectCmp !== 0) return aspectCmp; // A→Z
          if (A.card.rank !== B.card.rank) return A.card.rank - B.card.rank; // 1→3
          return A.card.name.localeCompare(B.card.name); // A→Z
        });
      // Always include each type, even if empty, to stabilize layout
      result.push({
        type: t,
        lines: items.map(({ qty, card, aspectName }) => {
          const PARALLEL_IDS = new Set<string>([
            'energy_supernova_converter','energy_will_power','energy_fears_grasp','energy_rage_unleashed',
            'madness_twisted_space','madness_shattered_time','madness_splintered_mind','madness_unhinged_reality','madness_chaotic_power','madness_eclipsed_soul',
          ]);
          const name = (aspectName || '').replace(/^Aspect of\s+/i, '');
          const tag = PARALLEL_IDS.has(card.id) ? ' (Parallel)' : '';
          return `(R${card.rank}) {${name}} ${card.name}${tag} —\u00A0x${qty}`;
        }),
      });
    }

    return result;
  }, [entries]);

  return (
    <div className="rounded-xl p-3 text-sm font-mono text-left bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
      {(() => {
        // Helper to fetch lines for a given type
        const byType: Record<SpellType, string[]> = {
          Holy: [], Light: [], Dark: [], Astral: [], Shadow: []
        };
        for (const g of groups) byType[g.type] = g.lines;

        const renderCol = (label: SpellType, preBreaks: number = 0) => (
          <div>
            {preBreaks > 0 && (
              <>
                {Array.from({ length: preBreaks }).map((_, i) => (
                  <br key={`pre-${label}-${i}`} />
                ))}
              </>
            )}
            <div className="font-bold underline mb-2 text-center" style={{ fontSize: 'calc(1em + 2pt)' }}>
              [{label}]
            </div>
            <div className="space-y-1 text-center">
              {byType[label].length === 0 ? (
                <div className="text-slate-400">&nbsp;</div>
              ) : (
                byType[label].map((line, i) => <div key={`${label}-${i}`}>{line}</div>)
              )}
            </div>
          </div>
        );

        return (
          <div className="grid grid-cols-13 gap-6">
            {/* Row 1: spacer · HOLY(3) · spacer · LIGHT(3) · spacer · DARK(3) · spacer */}
            <div />
            <div className="col-span-3">{renderCol('Holy')}</div>
            <div />
            <div className="col-span-3">{renderCol('Light')}</div>
            <div />
            <div className="col-span-3">{renderCol('Dark')}</div>
            <div />

            {/* Row 2 aligned: spacer · (Astral under Holy, if unlocked) · spacer · placeholder under Light · spacer · (Shadow under Dark, if unlocked) · spacer */}
            <div />
            <div className="col-span-3">{hasAstral ? renderCol('Astral', 2) : null}</div>
            <div />
            <div className="col-span-3" />
            <div />
            <div className="col-span-3">{hasShadow ? renderCol('Shadow', 2) : null}</div>
            <div />
          </div>
        );
      })()}
    </div>
  );
}

/** ------------------------
 * Main App
 * ---------------------- */
export default function App() {
  // Data from CSVs
  const [aspects, setAspects] = useState<Aspect[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [codes, setCodes] = useState<Record<string,string>>({});

  // Load CSVs once on mount
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await loadDataFromCsv();
        if (!mounted) return;
        setAspects(data.aspects ?? []);
        setCards(data.cards ?? []);
        setCodes(data.codes ?? {});
      } catch (e) {
        console.error('[CSV] Failed to load CSV data', e);
      }
    })();
    return () => { mounted = false; };
  }, []);
  // Unlocks (basics visible by default)
  const [unlocks, setUnlocks] = useState<string[]>(["focus", "study"]);
  const [showUnlock, setShowUnlock] = useState(false);
  // Special: if enabled via code, treat Lost as a Basic
  const [lostAsBasic, setLostAsBasic] = useState(false);

  // Selection
  const [basicsSelected, setBasicsSelected] = useState<string[]>(["focus"]); // Basics are free
  const [chosenAspects, setChosenAspects] = useState<string[]>([]); // Non-basics

  // Entries: cardId → qty
  const [entries, setEntries] = useState<Record<string, number>>({});
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  const [capAttempt, setCapAttempt] = useState<SpellType | null>(null);
  const capTimer = React.useRef<number | null>(null);
  const showCapAttempt = (t: SpellType) => {
    if (capTimer.current) window.clearTimeout(capTimer.current!);
    setCapAttempt(t);
    capTimer.current = window.setTimeout(() => setCapAttempt(null), 1500);
  };
  const [overrideAll, setOverrideAll] = useState(false);
  // Rank filter: show only cards with rank <= cap
  const [rankCap, setRankCap] = useState<number>(1);

  // No persistence — removed cookies/localStorage

  // Reset all persisted state and in-memory selections
  function resetAll() {
    if (typeof window !== 'undefined' && !window.confirm('Reset unlocks, selections, and deck?')) return;
    setUnlocks(["focus", "study"]);
    setBasicsSelected(["focus"]);
    setChosenAspects([]);
    setEntries({});
    setLostAsBasic(false);
  }
  React.useEffect(() => {
    if (previewCard) {
      const url = CARD_IMAGE_URLS[previewCard.id];
      console.log('[App.preview-open]', { id: previewCard.id, url });
    } else {
      console.log('[App.preview-close]');
    }
  }, [previewCard]);

  // Derived
  const nameByAspect = useMemo(
    () => Object.fromEntries(aspects.map((a) => [a.slug, a.name] as const)),
    [aspects]
  );
  const selectedAspectSlugs = overrideAll
    ? aspects.map(a => a.slug)
    : [...basicsSelected, ...chosenAspects];

  // Min rank per aspect and eligibility against current cap
  const MIN_RANK_BY_ASPECT = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cards) {
      const cur = map[c.aspect];
      map[c.aspect] = cur == null ? c.rank : Math.min(cur, c.rank);
    }
    return map;
  }, [cards]);
  const aspectEligible = React.useCallback((slug: string) => {
    const min = MIN_RANK_BY_ASPECT[slug];
    return Number.isFinite(min) && (min as number) <= rankCap;
  }, [MIN_RANK_BY_ASPECT, rankCap]);

  const isBasicAspect = React.useCallback((slug: string) => {
    const a = aspects.find(x => x.slug === slug);
    return Boolean(a?.isBasic) || (lostAsBasic && slug === 'lost');
  }, [aspects, lostAsBasic]);

  // Derived from data
  const DARK_SLUGS = useMemo(() => aspects.filter(a => a.isDark).map(a => a.slug) as ReadonlyArray<string>, [aspects]);
  const ASPECT_INDEX = useMemo(() => {
    const ordered = aspects.map((a, i) => ({ a, i })).sort((A, B) => {
      const ao = A.a.order; const bo = B.a.order;
      if (ao != null && bo != null) return ao - bo;
      if (ao != null) return -1; if (bo != null) return 1;
      return A.i - B.i;
    });
    return Object.fromEntries(ordered.map((x, i) => [x.a.slug, i] as const));
  }, [aspects]);

  const allDarkTrioSelected = overrideAll ? false : (() => {
    const nonSpecial = chosenAspects.filter((s) => !aspects.find(a => a.slug === s)?.isSpecial && aspectEligible(s));
    if (nonSpecial.length !== 3) return false;
    const set = new Set(nonSpecial);
    return (DARK_SLUGS as readonly string[]).every((s) => set.has(s));
  })();

  function redeem(code: string): { ok: boolean; unlockedName?: string; status?: 'ok' | 'invalid' | 'used' } {
    const key = code.trim().toUpperCase();
    const keyUnderscored = key.replace(/\s+/g, '_');
    // Override is disabled by default. It only works in DEV builds
    // AND when an explicit VITE_OVERRIDE_CODE is provided at build time.
    const OVERRIDE_CODE = (import.meta as any).env?.VITE_OVERRIDE_CODE as string | undefined;
    const OVERRIDE_ENABLED = Boolean((import.meta as any).env?.DEV && OVERRIDE_CODE);
    if (OVERRIDE_ENABLED && (key === OVERRIDE_CODE!.toUpperCase() || keyUnderscored === OVERRIDE_CODE!.toUpperCase())) {
      const next = !overrideAll;
      setOverrideAll(next);
      console.log('[Redeem][Override]', { enabled: next });
      return { ok: true, unlockedName: 'Override Mode', status: 'ok' };
    }
    // Special code: make Lost a Basic aspect
    if (key === 'ENDLESS SECRETS' || keyUnderscored === 'ENDLESS_SECRETS') {
      if (lostAsBasic) {
        return { ok: false, status: 'used' };
      }
      setLostAsBasic(true);
      // move Lost from chosen to basics selection so it doesn't count toward caps
      setChosenAspects(prev => prev.filter(s => s !== 'lost'));
      setBasicsSelected(prev => Array.from(new Set([...prev, 'lost'])));
      return { ok: true, unlockedName: 'Aspect of the Lost (Basic)', status: 'ok' };
    }
    const slug = codes[key];
    if (!slug) {
      return { ok: false, status: 'invalid' };
    }
    // Parallel Light no longer has a separate code; revealing Energy/Madness unlocks their Parallel cards
    if (slug === "*") {
      const all = Array.from(new Set([...unlocks, ...aspects.map((a) => a.slug)]));
      if (all.length === unlocks.length) {
        return { ok: false, status: 'used' };
      }
      setUnlocks(all);
      return { ok: true, unlockedName: 'All Aspects', status: 'ok' };
    } else if (String(slug).toLowerCase() === "#dark_all") {
      const darks = aspects.filter(a => a.isDark).map(a => a.slug);
      const all = Array.from(new Set([...unlocks, ...darks]));
      if (all.length === unlocks.length) {
        return { ok: false, status: 'used' };
      }
      setUnlocks(all);
      return { ok: true, unlockedName: 'Dark Arts', status: 'ok' };
    } else if (!unlocks.includes(slug)) {
      setUnlocks([...unlocks, slug]);
      const name = aspects.find(a => a.slug === slug)?.name || slug;
      return { ok: true, unlockedName: name, status: 'ok' };
    } else {
      return { ok: false, status: 'used' };
    }
    // Keep the unlock modal open for multiple code entries
    // not reached
  }

  // When an aspect is deselected, remove all cards from that aspect
  function clearAspectEntries(slug: string) {
    setEntries((prev) => {
      const next = { ...prev } as Record<string, number>;
      for (const c of cards) {
        if (c.aspect === slug) next[c.id] = 0;
      }
      return next;
    });
  }

  function toggleBasic(slug: string) {
    if (basicsSelected.includes(slug)) {
      setBasicsSelected((prev) => prev.filter((s) => s !== slug));
      clearAspectEntries(slug);
    } else {
      setBasicsSelected((prev) => [...prev, slug]);
    }
  }

  function toggleAspect(slug: string) {
    if (overrideAll) { return; }
    const aspect = aspects.find((a) => a.slug === slug);
    if (!aspect) return;

    // Basics: toggle freely, don't count toward limit
    if (isBasicAspect(slug)) {
      toggleBasic(slug);
      return;
    }

    const exists = chosenAspects.includes(slug);

    if (exists) {
      setChosenAspects(chosenAspects.filter((s) => s !== slug));
      clearAspectEntries(slug);
      return;
    }

    // Specials do not count toward limits
    if (aspect.isSpecial) {
      setChosenAspects([...chosenAspects, slug]);
      return;
    }

    // New clarified rules:
    // - Basics have no limits (handled elsewhere)
    // - Non-basic Aspects: choose up to 2 total (excluding specials)
    // - Exception: exactly all 3 Dark Arts may be chosen (then penalty shows)
    const nonSpecialSelected = chosenAspects.filter((s) => !aspects.find(a => a.slug === s)?.isSpecial && aspectEligible(s));
    const total = nonSpecialSelected.length;
    if (total < 2) {
      setChosenAspects([...chosenAspects, slug]);
      return;
    }

    if (total === 2) {
      // Allow only if adding this makes exactly the Dark trio
      const set = new Set([...nonSpecialSelected, slug]);
      const isDarkTrio = set.size === 3 && (DARK_SLUGS as readonly string[]).every((s) => set.has(s));
      if (isDarkTrio) setChosenAspects(Array.from(new Set([...chosenAspects, slug])));
      return;
    }

    // total >= 3 → already at max; do nothing
  }

  function setQty(cardId: string, n: number) {
    setEntries((prev) => ({ ...prev, [cardId]: Math.max(0, n) }));
  }

  const availableCards = useMemo(() => {
    return cards
      .filter((c) => selectedAspectSlugs.includes(c.aspect))
      .filter((c) => c.rank <= rankCap)
      .sort((a, b) => {
      // Aspect order fixed at top of list
      const ai = ASPECT_INDEX[a.aspect] ?? 999;
      const bi = ASPECT_INDEX[b.aspect] ?? 999;
      if (ai !== bi) return ai - bi; // Focus → Study → Legend → ...

      // Within aspect: Type desc (Holy > Light > Dark)
      const ta = TYPE_ORDER[a.type] ?? 0;
      const tb = TYPE_ORDER[b.type] ?? 0;
      if (tb !== ta) return tb - ta;

      // Rank desc
      if (b.rank !== a.rank) return b.rank - a.rank;

      // Name desc
      return b.name.localeCompare(a.name);
    });
  }, [selectedAspectSlugs, rankCap, cards]);

  const groupedByAspect = useMemo(() => {
    const map: Record<string, Card[]> = {};
    for (const c of availableCards) (map[c.aspect] ||= []).push(c);

    const aspectOrder = [...new Set(availableCards.map((c) => c.aspect))].sort(
      (a, b) => (ASPECT_INDEX[a] ?? 999) - (ASPECT_INDEX[b] ?? 999)
    );

    return aspectOrder.map((slug) => ({
      slug,
      name: nameByAspect[slug] || slug,
      cards: map[slug] || [],
    }));
  }, [availableCards, nameByAspect]);

  // Unlocked status (Basics always unlocked)
  const unlocksSet = overrideAll
    ? new Set(aspects.map(a => a.slug))
    : new Set(unlocks.concat(aspects.filter(a => isBasicAspect(a.slug)).map(a => a.slug)));

  const totalQty = useMemo(() => {
    // Count only non-special types toward 30 pages
    let pages = 0;
    for (const [id, qty] of Object.entries(entries)) {
      const card = cards.find(c => c.id === id);
      if (!card || qty <= 0) continue;
      if (card.type === "Astral" || card.type === "Shadow") continue;
      pages += qty;
    }
    return pages;
  }, [entries]);
  const counts = useMemo(() => {
    let holy = 0, light = 0, dark = 0, astral = 0, shadow = 0;
    for (const [id, qty] of Object.entries(entries)) {
      const card = cards.find(c => c.id === id);
      if (!card || qty <= 0) continue;
      const t = card.type as SpellType;
      if (t === "Holy") holy += qty;
      else if (t === "Light") light += qty;
      else if (t === "Dark") dark += qty;
      else if (t === "Astral") astral += qty;
      else if (t === "Shadow") shadow += qty;
    }
    return { Holy: holy, Light: light, Dark: dark, Astral: astral, Shadow: shadow };
  }, [entries]);

  // Per-type page limits for non-special spells
  const TYPE_LIMITS: Partial<Record<SpellType, number>> = { Holy: 4, Light: 24, Dark: 2 };
  const remainingByType = useMemo(() => ({
    Holy: Math.max(0, (TYPE_LIMITS.Holy ?? Infinity) - counts.Holy),
    Light: Math.max(0, (TYPE_LIMITS.Light ?? Infinity) - counts.Light),
    Dark: Math.max(0, (TYPE_LIMITS.Dark ?? Infinity) - counts.Dark),
    Astral: Number.POSITIVE_INFINITY,
    Shadow: Number.POSITIVE_INFINITY,
  } as Record<SpellType, number>), [counts]);

  // Special unlock flags and helper text
  const hasAstral = unlocksSet.has('starlight');
  const hasShadow = unlocksSet.has('shadows');
  const extraParts: string[] = [];
  if (hasAstral) extraParts.push(`[Astral]: ${counts.Astral}/7`);
  if (hasShadow) extraParts.push(`[Shadow]: ${counts.Shadow}/3`);
  const extraSummaryLine = extraParts.join('    ');
  const specialSlotsText = hasAstral && hasShadow
    ? 'Unlocks add extra slots: +7 Astral and +3 Shadow (beyond 30 Pages).'


    : hasAstral
    ? 'Unlocks add extra slots: +7 Astral (beyond 30 Pages).'
    : hasShadow
    ? 'Unlocks add extra slots: +3 Shadow (beyond 30 Pages).'
    : '';
  const showDarkCategory = overrideAll || aspects.some((a) => a.isDark && unlocksSet.has(a.slug));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex justify-center px-6 md:px-10 lg:px-20 xl:px-28 py-6">
      <div className="max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 text-center">
        <header className="grid grid-cols-1 sm:grid-cols-3 items-center justify-items-center gap-2 w-full px-4 md:px-6">
          <div className="justify-self-center sm:justify-self-start mx-2 sm:mx-8 mt-1 md:mt-3 w-full sm:w-auto">
            <details className="relative">
              <summary className="list-none cursor-pointer inline-flex items-center gap-3 rounded-xl border-2 px-4 py-2 text-base md:text-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 shadow-md font-semibold min-w-[140px] md:min-w-[180px]">
                <span>Rank: {rankCap}</span>
                <span aria-hidden>▾</span>
              </summary>
              <div className="absolute z-20 mt-2 w-56 rounded-lg border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 shadow-xl">
                {[1,2,3,4,5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={["block w-full text-left px-5 py-2.5 text-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100", n===rankCap?"font-semibold":""].join(' ')}
                    onClick={(e) => {
                      e.preventDefault();
                      setRankCap(n);
                      // close the details dropdown
                      const el = (e.currentTarget.closest('details')) as HTMLDetailsElement | null;
                      if (el) el.open = false;
                    }}
                  >
                    Rank {n}
                  </button>
                ))}
              </div>
            </details>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 text-center max-w-[240px]">
              Some aspects only appear at higher Ranks.
            </div>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold justify-self-center text-center text-slate-900 dark:text-slate-100">WKW Deck Builder</h1>
          <div className="flex items-center gap-2 justify-self-center sm:justify-self-end mx-2 sm:mx-8 mt-1 md:mt-3 w-full sm:w-auto">
            {!overrideAll && (
              <button
                type="button"
                aria-label="Unlock Aspects"
                onClick={() => { console.log('[UI] Unlock Codes clicked'); setShowUnlock(true); }}
                className="rounded-xl border-2 px-4 py-2 text-base md:text-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md font-semibold min-w-[140px] md:min-w-[200px]"
              >
                Unlock Aspects
              </button>
            )}
            {false && (
              <button
                type="button"
                aria-label="Reset"
                onClick={() => { console.log('[UI] Reset clicked'); resetAll(); }}
                className="rounded-xl px-5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
              >
                Reset
              </button>
            )}
          </div>
        </header>

        {overrideAll && (
          <div className="rounded-xl border border-amber-300 bg-amber-100 text-amber-900 px-4 py-2 text-sm text-center shadow-sm">
            Override Mode Enabled — All aspects unlocked and limits disabled.
          </div>
        )}

        {/* Basics & Aspects */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h2 className="font-semibold text-center">Basics (always unlocked)</h2>
            <div className="grid grid-cols-2 gap-3">
              {aspects
                .filter((a) => isBasicAspect(a.slug) && aspectEligible(a.slug))
                .sort((a, b) => (ASPECT_INDEX[a.slug] ?? 999) - (ASPECT_INDEX[b.slug] ?? 999))
                .map((a) => (
                <AspectCard
                  key={a.slug}
                  aspect={a}
                  unlocked={true}
                  selected={basicsSelected.includes(a.slug)}
                  onToggle={() => toggleBasic(a.slug)}
                />
              ))}
            </div>
            {/* Dark Arts directly under Basics */}
            {showDarkCategory && (
              <div className="space-y-3">
                <h2 className="font-semibold text-center">Dark Arts</h2>
                {!overrideAll && allDarkTrioSelected && (
                  <>
                    <div className="text-sm font-semibold text-center mb-3">
                      <span className="text-red-700 font-bold" style={{ color: '#dc2626', fontWeight: 700 }}>Dark Arts Penalty:</span>
                      {' '}When all three Dark Aspects are chosen, [Holy] spells count as [Light] and lose [Holy] counter rules.
                    </div>
                    <br />
                  </>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {aspects
                    .filter((a) => a.isDark && (overrideAll || unlocksSet.has(a.slug)) && aspectEligible(a.slug))
                    .sort((a, b) => (ASPECT_INDEX[a.slug] ?? 999) - (ASPECT_INDEX[b.slug] ?? 999))
                    .map((a) => {
                      const isSelected = chosenAspects.includes(a.slug);
                      // Selection behavior follows normal non-special rules
                      const total = chosenAspects.filter((s) => !aspects.find(x => x.slug === s)?.isSpecial && aspectEligible(s)).length;
                      let disabled = false;
                      if (!overrideAll && !isSelected) {
                        if (total < 2) {
                          disabled = false;
                        } else if (total === 2) {
                          const set = new Set([...chosenAspects.filter((s) => !aspects.find(x => x.slug === s)?.isSpecial), a.slug]);
                          const isDarkTrio = set.size === 3 && (DARK_SLUGS as readonly string[]).every((s) => set.has(s));
                          disabled = !isDarkTrio;
                        } else {
                          disabled = true;
                        }
                      }
                      return (
                        <AspectCard
                          key={a.slug}
                          aspect={a}
                          unlocked={true}
                          selected={isSelected}
                          disabled={disabled}
                          onToggle={() => toggleAspect(a.slug)}
                        />
                      );
                    })}
                </div>
              </div>
            )}

            {/* Special Aspects under Dark Arts */}
            {(overrideAll || aspects.some((a) => a.isSpecial && unlocksSet.has(a.slug) && aspectEligible(a.slug))) && (
              <div className="space-y-3">
                <h2 className="font-semibold text-center">Special Aspects</h2>
                {specialSlotsText && (
                  <div className="text-sm text-slate-700 dark:text-slate-200 text-center">
                    {specialSlotsText}
                    {hasAstral && hasShadow ? (<><br />
                    <br /></>) : null}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {aspects
                    .filter((a) => a.isSpecial && (overrideAll || unlocksSet.has(a.slug)) && aspectEligible(a.slug))
                    .sort((a, b) => (ASPECT_INDEX[a.slug] ?? 999) - (ASPECT_INDEX[b.slug] ?? 999))
                    .map((a) => {
                    const isSelected = chosenAspects.includes(a.slug);
                    return (
                      <AspectCard
                        key={a.slug}
                        aspect={a}
                        unlocked={true}
                        selected={isSelected}
                        onToggle={() => toggleAspect(a.slug)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-center">
              Additional Aspects{' '}
              <span className="text-slate-600 dark:text-slate-200">
                {showDarkCategory ? '(choose up to 2 — or all 3 Dark Arts)' : '(choose up to 2)'}
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {aspects
                .filter((a) => !isBasicAspect(a.slug) && !a.isSpecial && !a.isDark && aspectEligible(a.slug))
                .sort((a, b) => (ASPECT_INDEX[a.slug] ?? 999) - (ASPECT_INDEX[b.slug] ?? 999))
                .map((a) => {
                const isSelected = chosenAspects.includes(a.slug);
                const total = chosenAspects.filter((s) => !aspects.find(x => x.slug === s)?.isSpecial && aspectEligible(s)).length;
                let disabled = false;
                if (!overrideAll && !isSelected) {
                  if (total < 2) {
                    disabled = false;
                  } else if (total === 2) {
                    const set = new Set([...chosenAspects.filter((s) => !aspects.find(x => x.slug === s)?.isSpecial), a.slug]);
                    const isDarkTrio = set.size === 3 && (DARK_SLUGS as readonly string[]).every((s) => set.has(s));
                    disabled = !isDarkTrio;
                  } else {
                    disabled = true;
                  }
                }
                return (
                  <AspectCard
                    key={a.slug}
                    aspect={a}
                    unlocked={overrideAll || unlocksSet.has(a.slug)}
                    selected={isSelected}
                    disabled={disabled}
                    onToggle={() => toggleAspect(a.slug)}
                  />
                );
              })}
            </div>
          </div>

          {/* Dark and Special moved under Basics in the left column */}
        </section>

        {/* Cards grouped by Aspect */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold mb-2 text-center">Cards (from selected Aspects)</h3>
            <div className="space-y-4">
              {groupedByAspect.map((group) => (
                <div key={group.slug}>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mb-1 text-center" style={{ fontSize: '24px' }}>
                    {group.name && group.name.startsWith('Aspect of ')
                      ? group.name
                      : `Aspect of ${group.name}`}
                  </div>
                  <div className="mb-2 flex items-center justify-center gap-3 transform -translate-x-2 md:-translate-x-4">
                    {(() => {
                      const pageCapReached = totalQty >= 30;
                      const groupHasCountable = group.cards.some(c => c.type !== 'Astral' && c.type !== 'Shadow');
                      const allAstral = group.cards.every(c => c.type === 'Astral');
                      const allShadow = group.cards.every(c => c.type === 'Shadow');
                      let pickDisabled = pageCapReached && groupHasCountable;
                      if (allAstral || allShadow) {
                        const allAtMax = group.cards.every(c => (entries[c.id] || 0) >= c.maxCopies);
                        const typeCapReached = allAstral
                          ? counts.Astral >= 7
                          : allShadow
                          ? counts.Shadow >= 3
                          : false;
                        pickDisabled = allAtMax || typeCapReached;
                      }
                      const allZero = group.cards.every(c => (entries[c.id] || 0) <= 0);
                      return (
                        <>
                          <button
                            type="button"
                            className={[
                              "inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm shadow-sm",
                              pickDisabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
                            ].join(' ')}
                            disabled={pickDisabled}
                            onClick={() => {
                              if (pickDisabled) return;
                              console.log('[Aspect.pickAll]', { aspect: group.slug });
                              setEntries((prev) => {
                                const next = { ...prev } as Record<string, number>;
                                let pages = totalQty;
                                const typeRoom: Record<SpellType, number> = { ...(remainingByType as any) };
                                let astralRoom = Math.max(0, 7 - counts.Astral);
                                let shadowRoom = Math.max(0, 3 - counts.Shadow);
                                for (const card of group.cards) {
                                  const locked = !unlocksSet.has(card.aspect) && !isBasicAspect(card.aspect);
                                  if (locked) continue;
                                  const current = next[card.id] || 0;
                                  const add = Math.max(0, card.maxCopies - current);
                                  if (add <= 0) { continue; }
                                  if (card.type === 'Astral') {
                                    if (astralRoom <= 0) continue;
                                    const n = Math.min(add, astralRoom);
                                    next[card.id] = current + n; astralRoom -= n; continue;
                                  }
                                  if (card.type === 'Shadow') {
                                    if (shadowRoom <= 0) continue;
                                    const n = Math.min(add, shadowRoom);
                                    next[card.id] = current + n; shadowRoom -= n; continue;
                                  }
                                  const roomTotal = Math.max(0, 30 - pages);
                                  const roomType = Math.max(0, (typeRoom[card.type] ?? 0));
                                  const room = Math.min(roomTotal, roomType);
                                  if (room <= 0) continue;
                                  const n = Math.min(add, room);
                                  pages += n;
                                  typeRoom[card.type] = Math.max(0, (typeRoom[card.type] ?? 0) - n);
                                  next[card.id] = current + n;
                                }
                                return next;
                              });
                            }}
                          >
                            PICK ALL
                          </button>
                          <button
                            type="button"
                            className={[
                              "inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm shadow-sm",
                              allZero ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-rose-100 text-rose-800 hover:bg-rose-200",
                            ].join(' ')}
                            disabled={allZero}
                            onClick={() => {
                              if (allZero) return;
                              console.log('[Aspect.removeAll]', { aspect: group.slug });
                              setEntries((prev) => {
                                const next = { ...prev } as Record<string, number>;
                                for (const card of group.cards) {
                                  next[card.id] = 0;
                                }
                                return next;
                              });
                            }}
                          >
                            REMOVE ALL
                          </button>
                        </>
                      );
                    })()}
                  </div>
                  <div className="divide-y px-6 md:px-8 lg:px-10 max-w-xl mx-auto rounded-2xl">
                    {group.cards.map((card) => {
                      const qty = entries[card.id] || 0;
                      const locked = !unlocksSet.has(card.aspect) && !isBasicAspect(card.aspect);
                      return (
                        <CardRow
                          key={card.id}
                          card={card}
                          qty={qty}
                          locked={locked}
                          onChange={(n) => setQty(card.id, n)}
                          onPreview={(c) => { console.log('[App.setPreviewCard]', c.id); setPreviewCard(c); }}
                          remainingSlots={Math.max(0, 30 - totalQty)}
                          remainingTypeSlots={remainingByType[card.type] ?? Number.POSITIVE_INFINITY}
                          onCapAttempt={showCapAttempt}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary + Export */}
          <div className="space-y-4">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold mb-2 text-center">Deck Summary:</h3>
              <div className="text-center font-mono whitespace-pre-wrap">
                <div className="text-lg">{totalQty}/30 Pages</div>
                <div className="flex items-center justify-center gap-6">
                  <span className={capAttempt === 'Holy' ? 'text-red-600 font-bold' : undefined}>
                    [Holy]: {counts.Holy}/{TYPE_LIMITS.Holy ?? '∞'}{'\u00A0\u00A0\u00A0'}
                  </span>
                  <span className={capAttempt === 'Light' ? 'text-red-600 font-bold' : undefined}>
                    [Light]: {counts.Light}/{TYPE_LIMITS.Light ?? '∞'}{'\u00A0\u00A0\u00A0'}
                  </span>
                  <span className={capAttempt === 'Dark' ? 'text-red-600 font-bold' : undefined}>
                    [Dark]: {counts.Dark}/{TYPE_LIMITS.Dark ?? '∞'}
                  </span>
                </div>
                {capAttempt && (
                  <div className="mt-1 text-sm text-red-600 font-semibold">[{capAttempt}] Cap Reached</div>
                )}
                {(hasAstral || hasShadow) && (
                  <div className="mt-1 text-sm">{extraSummaryLine}</div>
                )}
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold mb-2 text-center">Grimoire</h3>
              <DeckExport
                entries={Object.entries(entries).map(([cardId, qty]) => ({ cardId, qty }))}
                aspects={aspects}
                cards={cards}
                hasAstral={hasAstral}
                hasShadow={hasShadow}
              />
            </div>
          </div>
        </section>
        <br />
        <br />
        <br />
        <footer className="text-xs text-slate-500 pt-2 text-center">
         
        </footer>
      </div>

      {showUnlock && <UnlockModal onRedeem={redeem} onClose={() => setShowUnlock(false)} />}
      {previewCard && (
        <CardPreviewModal
          card={previewCard}
          aspectLabel={nameByAspect[previewCard.aspect] || previewCard.aspect}
          onClose={() => setPreviewCard(null)}
        />
      )}
    </div>
  );
}
