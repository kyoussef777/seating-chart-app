'use client';

import React from 'react';
import { Copy, RotateCcw, Trash2, UserMinus, Users, X } from 'lucide-react';
import {
  BORDER_STYLES,
  LABEL_BACKGROUNDS,
  LABEL_FONT_MAX,
  LABEL_FONT_MIN,
  PALETTE,
  REFERENCE_OBJECT_COLORS,
  REFERENCE_OBJECT_DEFAULTS,
  SHAPE_TYPES,
  TEXT_ALIGNMENTS,
  type Label,
  type ReferenceObject,
  type Shape,
} from '@/lib/layout-objects';
import {
  TABLE_CAPACITY_MAX,
  TABLE_CAPACITY_MIN,
  TABLE_COLORS,
  TABLE_MAX_SIZE,
  TABLE_MIN_SIZE,
  TABLE_SHAPES,
  TABLE_SHAPE_LABELS,
  getDefaultTableDimensions,
  seatsUsed,
  type Guest,
  type Table,
} from '@/lib/seating';
import { cn } from '@/lib/utils';
import type { CanvasItem } from './types';

/* ---- small field primitives ------------------------------------------- */

const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-stone-500';
// `pointer-coarse` keeps these finger-sized on tablets too, where every `sm:`
// rule has already relaxed to desktop metrics.
const controlClass =
  'w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 ' +
  'pointer-coarse:min-h-11 pointer-coarse:py-2.5 ' +
  'focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

/** A number field that only commits on blur or Enter, so typing "1" of "120"
 *  is not clamped to the minimum halfway through. */
function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onCommit(Math.min(max, Math.max(min, parsed)));
  };
  return (
    <Field label={suffix ? `${label} (${suffix})` : label}>
      <input
        // Remounting on an external change keeps the field showing the real
        // value after a drag resize without fighting the user mid-keystroke.
        key={`${label}-${Math.round(value)}`}
        type="number"
        defaultValue={Math.round(value)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(controlClass, 'disabled:opacity-50')}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </Field>
  );
}

function Swatches({
  label,
  colors,
  value,
  onChange,
  allowDefault,
}: {
  label: string;
  colors: Array<{ id: string; label: string; hex: string }>;
  value: string | null;
  onChange: (value: string | null) => void;
  allowDefault?: boolean;
}) {
  return (
    <div className="space-y-1">
      <span className={labelClass}>{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {allowDefault && (
          <button
            type="button"
            title="Default"
            aria-label={`${label}: default`}
            aria-pressed={value === null}
            onClick={() => onChange(null)}
            className={cn(
              'h-6 w-6 rounded-full border-2 bg-white text-[10px] font-bold text-stone-500',
              'pointer-coarse:h-9 pointer-coarse:w-9',
              value === null ? 'border-emerald-600 ring-2 ring-emerald-200' : 'border-stone-300'
            )}
          >
            —
          </button>
        )}
        {colors.map((colour) => (
          <button
            key={colour.id}
            type="button"
            title={colour.label}
            aria-label={`${label}: ${colour.label}`}
            aria-pressed={value === colour.id}
            onClick={() => onChange(colour.id)}
            className={cn(
              'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
              'pointer-coarse:h-9 pointer-coarse:w-9',
              value === colour.id ? 'border-emerald-600 ring-2 ring-emerald-200' : 'border-white shadow'
            )}
            style={{ backgroundColor: colour.hex }}
          />
        ))}
      </div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1">
      <span className={labelClass}>{label}</span>
      <div className="flex overflow-hidden rounded-md border border-stone-300">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              'flex-1 px-2 py-1 text-xs font-medium transition-colors',
              'pointer-coarse:min-h-11',
              value === option.id
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-stone-700 hover:bg-stone-100'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---- the panel --------------------------------------------------------- */

export interface InspectorProps {
  item: CanvasItem | null;
  selectionCount: number;
  table: Table | null;
  label: Label | null;
  shape: Shape | null;
  referenceObject: ReferenceObject | null;
  locked: boolean;
  /** Which edge to dock against, so the panel never sits on the selection. */
  side: 'left' | 'right';
  tableNames: string[];
  /** Who is sitting at the selected table. */
  tableGuests: Guest[];
  onUnassignGuest: (guestId: string) => void;
  onUpdateTable: (id: string, patch: Partial<Table>) => void;
  onUpdateLabel: (id: string, patch: Partial<Label>) => void;
  onUpdateShape: (id: string, patch: Partial<Shape>) => void;
  onUpdateReferenceObject: (id: string, patch: Partial<ReferenceObject>) => void;
  onDelete: (item: CanvasItem) => void;
  onDuplicate: (item: CanvasItem) => void;
  onClose: () => void;
}

/**
 * Properties panel for the selected item.
 *
 * Everything that used to be either impossible or hidden behind a handle you
 * had to discover — a table's size and colour, a label's weight and ink, a
 * shape's fill and border, an object's caption — is editable here, by number
 * where a number is what you mean.
 */
export default function Inspector({
  item,
  selectionCount,
  table,
  label,
  shape,
  referenceObject,
  locked,
  side,
  tableNames,
  tableGuests,
  onUnassignGuest,
  onUpdateTable,
  onUpdateLabel,
  onUpdateShape,
  onUpdateReferenceObject,
  onDelete,
  onDuplicate,
  onClose,
}: InspectorProps) {
  if (!item) return null;

  const heading =
    selectionCount > 1
      ? `${selectionCount} items selected`
      : item.name || 'Selected item';

  return (
    <div
      data-no-drag
      role="region"
      aria-label="Selected item properties"
      className={cn(
        'pointer-events-auto absolute inset-x-2 bottom-2 z-50 max-h-[55%] overflow-y-auto rounded-xl border border-stone-300 bg-white/97 p-3 shadow-2xl backdrop-blur',
        'sm:inset-x-auto sm:bottom-auto sm:top-3 sm:max-h-[calc(100%-1.5rem)] sm:w-64',
        side === 'right' ? 'sm:right-3' : 'sm:left-3'
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-emerald-900">{heading}</p>
          <p className="text-[11px] uppercase tracking-wide text-stone-500">
            {selectionCount > 1
              ? 'Use the align tools, or drag to move them together'
              : `${Math.round(item.width)} × ${Math.round(item.height)} px`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Clear selection"
          className="flex items-center justify-center rounded-md p-1 text-stone-400 pointer-coarse:min-h-11 pointer-coarse:min-w-11 hover:bg-stone-100 hover:text-stone-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {selectionCount === 1 && (
        <div className="space-y-3">
          {/* ---- table ---- */}
          {table && (
            <>
              <Field label="Name">
                <input
                  key={`name-${table.id}-${table.name}`}
                  type="text"
                  defaultValue={table.name}
                  maxLength={50}
                  disabled={locked}
                  className={cn(controlClass, 'disabled:opacity-50')}
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (!next || next === table.name) {
                      e.target.value = table.name;
                      return;
                    }
                    const clash = tableNames.some(
                      (name) => name.toLowerCase() === next.toLowerCase() && name !== table.name
                    );
                    if (clash) {
                      e.target.value = table.name;
                      return;
                    }
                    onUpdateTable(table.id, { name: next });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                />
              </Field>

              <Row>
                <Field label="Shape">
                  <select
                    value={table.shape}
                    disabled={locked}
                    className={cn(controlClass, 'disabled:opacity-50')}
                    onChange={(e) => onUpdateTable(table.id, { shape: e.target.value })}
                  >
                    {TABLE_SHAPES.map((value) => (
                      <option key={value} value={value}>
                        {TABLE_SHAPE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </Field>
                <NumberField
                  label="Seats"
                  value={table.capacity}
                  min={TABLE_CAPACITY_MIN}
                  max={TABLE_CAPACITY_MAX}
                  disabled={locked}
                  onCommit={(capacity) => onUpdateTable(table.id, { capacity })}
                />
              </Row>

              <Row>
                <NumberField
                  label="Width"
                  suffix="px"
                  value={item.width}
                  min={TABLE_MIN_SIZE}
                  max={TABLE_MAX_SIZE}
                  step={10}
                  disabled={locked}
                  onCommit={(width) => onUpdateTable(table.id, { width })}
                />
                <NumberField
                  label="Height"
                  suffix="px"
                  value={item.height}
                  min={TABLE_MIN_SIZE}
                  max={TABLE_MAX_SIZE}
                  step={10}
                  disabled={locked}
                  onCommit={(height) => onUpdateTable(table.id, { height })}
                />
              </Row>

              {(table.width != null || table.height != null) && (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onUpdateTable(table.id, { width: null, height: null })}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 pointer-coarse:min-h-11 hover:text-emerald-800 disabled:opacity-50"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset to {TABLE_SHAPE_LABELS[table.shape as keyof typeof TABLE_SHAPE_LABELS] ?? 'default'} size (
                  {getDefaultTableDimensions(table.shape).width}×
                  {getDefaultTableDimensions(table.shape).height})
                </button>
              )}

              <Swatches
                label="Accent"
                allowDefault
                value={table.color ?? null}
                colors={Object.entries(TABLE_COLORS).map(([id, c]) => ({
                  id,
                  label: c.label,
                  hex: c.dot,
                }))}
                onChange={(color) => onUpdateTable(table.id, { color })}
              />

              {/* Who is sitting here. The pop-up on the table itself is a
                  glance; this is the readable, unclipped answer, and the place
                  to take someone off the table. */}
              <div className="space-y-1">
                <span className={labelClass}>
                  Seated here — {seatsUsed(tableGuests)}/{table.capacity} seats
                </span>
                {tableGuests.length === 0 ? (
                  <p className="rounded-md border border-dashed border-stone-300 px-2 py-3 text-center text-xs text-stone-500">
                    Nobody seated yet. Drag a guest here, or tap one in the list.
                  </p>
                ) : (
                  <ul className="max-h-40 space-y-1 overflow-y-auto">
                    {tableGuests.map((guest) => (
                      <li
                        key={guest.id}
                        className="flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2 py-1"
                      >
                        <span className="min-w-0 flex-1 truncate text-xs text-stone-800">
                          {guest.name}
                        </span>
                        {guest.partySize > 1 && (
                          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-stone-200 px-1.5 text-[10px] font-medium text-stone-700">
                            <Users className="h-2.5 w-2.5" />
                            {guest.partySize}
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => onUnassignGuest(guest.id)}
                          aria-label={`Remove ${guest.name} from ${table.name}`}
                          title={`Remove ${guest.name} from this table`}
                          className="flex shrink-0 items-center justify-center rounded p-1 text-stone-400 pointer-coarse:min-h-9 pointer-coarse:min-w-9 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* ---- label ---- */}
          {label && (
            <>
              <Field label="Text">
                <textarea
                  key={`text-${label.id}-${label.text}`}
                  defaultValue={label.text}
                  rows={2}
                  maxLength={200}
                  disabled={locked}
                  className={cn(controlClass, 'resize-y disabled:opacity-50')}
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next && next !== label.text) onUpdateLabel(label.id, { text: next });
                    else e.target.value = label.text;
                  }}
                />
              </Field>

              <Row>
                <NumberField
                  label="Size"
                  suffix="px"
                  value={label.fontSize}
                  min={LABEL_FONT_MIN}
                  max={LABEL_FONT_MAX}
                  disabled={locked}
                  onCommit={(fontSize) => onUpdateLabel(label.id, { fontSize })}
                />
                <SegmentedControl
                  label="Weight"
                  value={label.bold ? 'bold' : 'regular'}
                  options={[
                    { id: 'regular', label: 'Regular' },
                    { id: 'bold', label: 'Bold' },
                  ]}
                  onChange={(weight) => onUpdateLabel(label.id, { bold: weight === 'bold' })}
                />
              </Row>

              <SegmentedControl
                label="Align"
                value={label.align}
                options={TEXT_ALIGNMENTS.map((id) => ({
                  id,
                  label: id === 'center' ? 'Centre' : id === 'left' ? 'Left' : 'Right',
                }))}
                onChange={(align) => onUpdateLabel(label.id, { align })}
              />

              <SegmentedControl
                label="Backdrop"
                value={label.background}
                options={LABEL_BACKGROUNDS.map((id) => ({
                  id,
                  label: id === 'none' ? 'None' : id === 'light' ? 'Light' : 'Solid',
                }))}
                onChange={(background) => onUpdateLabel(label.id, { background })}
              />

              <Swatches
                label="Ink"
                value={PALETTE.find((c) => c.hex === label.color)?.id ?? null}
                colors={PALETTE}
                onChange={(id) => {
                  const colour = PALETTE.find((c) => c.id === id);
                  if (colour) onUpdateLabel(label.id, { color: colour.hex });
                }}
              />
            </>
          )}

          {/* ---- shape ---- */}
          {shape && (
            <>
              <Row>
                <Field label="Type">
                  <select
                    value={shape.type}
                    disabled={locked}
                    className={cn(controlClass, 'disabled:opacity-50')}
                    onChange={(e) =>
                      onUpdateShape(shape.id, { type: e.target.value as Shape['type'] })
                    }
                  >
                    {SHAPE_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {value[0].toUpperCase() + value.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Caption">
                  <input
                    key={`caption-${shape.id}-${shape.label ?? ''}`}
                    type="text"
                    defaultValue={shape.label ?? ''}
                    placeholder="None"
                    maxLength={200}
                    disabled={locked}
                    className={cn(controlClass, 'disabled:opacity-50')}
                    onBlur={(e) => onUpdateShape(shape.id, { label: e.target.value.trim() || null })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                  />
                </Field>
              </Row>

              <Row>
                <NumberField
                  label="Width"
                  suffix="px"
                  value={shape.width}
                  min={20}
                  max={4000}
                  step={10}
                  disabled={locked}
                  onCommit={(width) => onUpdateShape(shape.id, { width })}
                />
                <NumberField
                  label="Height"
                  suffix="px"
                  value={shape.height}
                  min={shape.type === 'line' ? 2 : 20}
                  max={4000}
                  step={10}
                  disabled={locked}
                  onCommit={(height) => onUpdateShape(shape.id, { height })}
                />
              </Row>

              <Swatches
                label="Fill"
                value={PALETTE.find((c) => c.hex === shape.color)?.id ?? null}
                colors={PALETTE}
                onChange={(id) => {
                  const colour = PALETTE.find((c) => c.id === id);
                  if (colour) onUpdateShape(shape.id, { color: colour.hex });
                }}
              />

              <Field label={`Fill opacity — ${Math.round(shape.opacity * 100)}%`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(shape.opacity * 100)}
                  disabled={locked}
                  className="w-full accent-emerald-600 pointer-coarse:h-8 disabled:opacity-50"
                  onChange={(e) => onUpdateShape(shape.id, { opacity: Number(e.target.value) / 100 })}
                />
              </Field>

              <Swatches
                label="Border"
                value={PALETTE.find((c) => c.hex === shape.borderColor)?.id ?? null}
                colors={PALETTE}
                onChange={(id) => {
                  const colour = PALETTE.find((c) => c.id === id);
                  if (colour) onUpdateShape(shape.id, { borderColor: colour.hex });
                }}
              />

              <SegmentedControl
                label="Border style"
                value={shape.borderStyle}
                options={BORDER_STYLES.map((id) => ({
                  id,
                  label: id[0].toUpperCase() + id.slice(1),
                }))}
                onChange={(borderStyle) => onUpdateShape(shape.id, { borderStyle })}
              />
            </>
          )}

          {/* ---- reference object ---- */}
          {referenceObject && (
            <>
              <Field label="Caption">
                <input
                  key={`ref-${referenceObject.id}-${referenceObject.label ?? ''}`}
                  type="text"
                  defaultValue={referenceObject.label ?? ''}
                  placeholder={REFERENCE_OBJECT_DEFAULTS[referenceObject.type]?.label ?? 'Object'}
                  maxLength={60}
                  disabled={locked}
                  className={cn(controlClass, 'disabled:opacity-50')}
                  onBlur={(e) =>
                    onUpdateReferenceObject(referenceObject.id, {
                      label: e.target.value.trim() || null,
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                />
              </Field>

              <Row>
                <NumberField
                  label="Width"
                  suffix="px"
                  value={referenceObject.width}
                  min={20}
                  max={4000}
                  step={10}
                  disabled={locked}
                  onCommit={(width) => onUpdateReferenceObject(referenceObject.id, { width })}
                />
                <NumberField
                  label="Height"
                  suffix="px"
                  value={referenceObject.height}
                  min={20}
                  max={4000}
                  step={10}
                  disabled={locked}
                  onCommit={(height) => onUpdateReferenceObject(referenceObject.id, { height })}
                />
              </Row>

              <Swatches
                label="Tint"
                allowDefault
                value={referenceObject.color}
                colors={Object.entries(REFERENCE_OBJECT_COLORS).map(([id, c]) => ({
                  id,
                  label: c.label,
                  hex: c.border,
                }))}
                onChange={(color) => onUpdateReferenceObject(referenceObject.id, { color })}
              />
            </>
          )}

          {/* ---- shared: rotation ---- */}
          <div className="space-y-1">
            <span className={labelClass}>Rotation — {Math.round(item.rotation)}°</span>
            <input
              type="range"
              min={0}
              max={359}
              value={Math.round(item.rotation) % 360}
              disabled={locked}
              className="w-full accent-emerald-600 pointer-coarse:h-8 disabled:opacity-50"
              onChange={(e) => {
                const rotation = Number(e.target.value);
                if (table) onUpdateTable(table.id, { rotation });
                else if (label) onUpdateLabel(label.id, { rotation });
                else if (shape) onUpdateShape(shape.id, { rotation });
                else if (referenceObject) onUpdateReferenceObject(referenceObject.id, { rotation });
              }}
            />
            <div className="flex gap-1">
              {[0, 45, 90, 180, 270].map((angle) => (
                <button
                  key={angle}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    if (table) onUpdateTable(table.id, { rotation: angle });
                    else if (label) onUpdateLabel(label.id, { rotation: angle });
                    else if (shape) onUpdateShape(shape.id, { rotation: angle });
                    else if (referenceObject)
                      onUpdateReferenceObject(referenceObject.id, { rotation: angle });
                  }}
                  className="flex-1 rounded border border-stone-300 bg-white py-0.5 text-[11px] text-stone-700 pointer-coarse:min-h-10 hover:bg-stone-100 disabled:opacity-50"
                >
                  {angle}°
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2 border-t border-stone-200 pt-3">
        <button
          type="button"
          disabled={locked || selectionCount > 1}
          onClick={() => onDuplicate(item)}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs font-medium text-stone-700 pointer-coarse:min-h-11 hover:bg-stone-50 disabled:opacity-50"
        >
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => onDelete(item)}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-rose-500 px-2 py-1.5 text-xs font-medium text-white pointer-coarse:min-h-11 hover:bg-rose-600 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
