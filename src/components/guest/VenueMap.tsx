'use client';

import type { EventTemplate } from '@/lib/templates';
import type { PortalLayout, PortalTable } from '@/hooks/useGuestPortal';
import { resolveReferenceObject } from '@/lib/layout-objects';
import { mapViewBox, tableBox, type MapBox } from '@/lib/venue-map';

/**
 * The room in miniature with the guest's table lit up, shown under the table
 * result so a guest can walk straight to it.
 *
 * Drawn from the admin's own floor plan — tables, the room outline (shapes)
 * and fixtures such as the dance floor (reference objects) — in the template's
 * palette. Everything except the guest's table is kept quiet so the answer is
 * the one thing that stands out.
 */

/** Captions smaller than this on the map's short side are unreadable on a
 *  phone, so small fixtures (doors) draw as a plain mark instead. */
const MIN_CAPTION_BOX = 60;

function rotate(box: MapBox) {
  if (!box.rotation) return undefined;
  return `rotate(${box.rotation} ${box.x + box.width / 2} ${box.y + box.height / 2})`;
}

export function VenueMap({
  template,
  tables,
  layout,
  highlightId,
}: {
  template: EventTemplate;
  tables: PortalTable[];
  layout: PortalLayout;
  highlightId: string;
}) {
  // `surface` may be a CSS gradient, which SVG cannot paint; `canvas` is
  // always a solid colour.
  const { palette, fonts } = template;
  const target = tables.find((t) => t.id === highlightId);
  if (!target || tables.length < 2) return null;

  const tableBoxes = tables.map((t) => ({ table: t, box: tableBox(t) }));
  const view = mapViewBox([
    ...layout.shapes,
    ...layout.objects,
    ...tableBoxes.map(({ box }) => box),
  ]);
  // Text sized against the plan, so it reads the same whatever its scale.
  const unit = Math.max(view.width, view.height) / 40;
  const targetBox = tableBox(target);
  const tcx = targetBox.x + targetBox.width / 2;
  const tcy = targetBox.y + targetBox.height / 2;
  const ring = Math.max(targetBox.width, targetBox.height) / 2 + unit * 0.9;

  return (
    <figure className="portal-map m-0 mt-5">
      <svg
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        className="block h-auto max-h-[60vh] w-full"
        role="img"
        aria-label={`Floor plan with table ${target.name} highlighted`}
      >
        {layout.shapes.map((s) => {
          const stroke = s.borderStyle === 'none' ? 'none' : palette.muted;
          const common = {
            fill: s.opacity > 0 ? palette.accent : 'none',
            fillOpacity: Math.min(s.opacity, 0.12),
            stroke,
            strokeOpacity: 0.55,
            strokeWidth: unit * 0.12,
            strokeDasharray: s.borderStyle === 'dashed' ? `${unit * 0.4} ${unit * 0.3}` : undefined,
          };
          return (
            <g key={s.id} transform={rotate(s)}>
              {s.type === 'circle' ? (
                <ellipse cx={s.x + s.width / 2} cy={s.y + s.height / 2} rx={s.width / 2} ry={s.height / 2} {...common} />
              ) : s.type === 'line' ? (
                <line x1={s.x} y1={s.y + s.height / 2} x2={s.x + s.width} y2={s.y + s.height / 2} {...common} />
              ) : (
                <rect x={s.x} y={s.y} width={s.width} height={s.height} {...common} />
              )}
              {s.label && Math.min(s.width, s.height) >= MIN_CAPTION_BOX && (
                <text
                  x={s.x + s.width / 2}
                  y={s.y + s.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={unit * 0.75}
                  fill={palette.muted}
                  style={{ fontFamily: fonts.body, fontStyle: 'italic' }}
                >
                  {s.label}
                </text>
              )}
            </g>
          );
        })}

        {layout.objects.map((o) => {
          const { label } = resolveReferenceObject(o);
          const captioned = Math.min(o.width, o.height) >= MIN_CAPTION_BOX;
          return (
            <g key={o.id} transform={rotate(o)}>
              <rect
                x={o.x}
                y={o.y}
                width={o.width}
                height={o.height}
                fill={captioned ? palette.accent : palette.canvas}
                fillOpacity={captioned ? 0.1 : 1}
                stroke={palette.muted}
                strokeOpacity={0.6}
                strokeWidth={unit * 0.12}
              />
              {captioned && (
                <text
                  x={o.x + o.width / 2}
                  y={o.y + o.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={unit * 0.8}
                  fill={palette.body}
                  style={{ fontFamily: fonts.body, letterSpacing: '.04em' }}
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}

        {tableBoxes.map(({ table, box }) => {
          const mine = table.id === highlightId;
          const shapeProps = {
            fill: mine ? palette.accent : palette.canvas,
            stroke: mine ? palette.heading : palette.accent,
            strokeWidth: unit * (mine ? 0.18 : 0.1),
          };
          return (
            <g key={table.id}>
              <g transform={rotate(box)}>
                {box.isCircular ? (
                  <ellipse
                    cx={box.x + box.width / 2}
                    cy={box.y + box.height / 2}
                    rx={box.width / 2}
                    ry={box.height / 2}
                    {...shapeProps}
                  />
                ) : (
                  <rect x={box.x} y={box.y} width={box.width} height={box.height} rx={unit * 0.2} {...shapeProps} />
                )}
              </g>
              {/* Upright whatever the table's rotation, so the number reads. */}
              <text
                x={box.x + box.width / 2}
                y={box.y + box.height / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={unit * (mine ? 1.2 : 0.95)}
                fontWeight={mine ? 700 : 500}
                fill={mine ? palette.heading : palette.muted}
                style={{ fontFamily: fonts.body }}
              >
                {table.name}
              </text>
            </g>
          );
        })}

        {/* Drawn last so neighbouring tables cannot cover it. */}
        <ellipse
          className="portal-map-pulse"
          cx={tcx}
          cy={tcy}
          rx={ring}
          ry={ring}
          fill="none"
          stroke={palette.accent}
          strokeWidth={unit * 0.25}
        />
      </svg>
      <figcaption
        className="mt-2 text-[14px] italic sm:text-[15px]"
        style={{ fontFamily: fonts.body, color: palette.muted }}
      >
        Your table is highlighted on the floor plan
      </figcaption>
    </figure>
  );
}
