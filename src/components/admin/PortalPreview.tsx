'use client';

import { resolveTemplate } from '@/lib/templates';
import type { PortalSettings } from '@/lib/event-settings';

/**
 * A miniature of the guest portal, drawn with the selected template's real
 * palette and type so the admin sees the actual look — not a generic mock — as
 * they type.
 */
export default function PortalPreview({ settings }: { settings: PortalSettings }) {
  const template = resolveTemplate(settings.template);
  const { palette, fonts, shape } = template;

  const words = settings.eventName.trim().split(/\s+/);
  const tail = words.length > 1 ? words[words.length - 1] : '';
  const head = tail ? words.slice(0, -1).join(' ') : settings.eventName || 'Your event name';

  return (
    <div
      className="overflow-hidden rounded-xl border border-stone-200"
      style={{ background: palette.pageBackground }}
    >
      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <div
          className="mx-auto max-w-sm px-5 py-6 text-center"
          style={{
            background: palette.surface,
            border: `1px solid ${palette.surfaceBorder}`,
            borderRadius: shape.panel,
            boxShadow: palette.surfaceShadow,
          }}
        >
          {settings.eventKicker && (
            <div className="mb-3 flex items-center justify-center gap-2">
              <span style={{ width: 24, height: 1, background: palette.accent }} />
              <span
                className="text-[10px] uppercase"
                style={{ fontFamily: fonts.label, letterSpacing: '.4em', color: palette.accentText }}
              >
                {settings.eventKicker}
              </span>
              <span style={{ width: 24, height: 1, background: palette.accent }} />
            </div>
          )}

          <p
            className="m-0 mb-2 leading-tight"
            style={{
              fontFamily: fonts.display,
              color: palette.heading,
              fontSize: 30,
              letterSpacing: template.displayTracking,
              textTransform: template.displayCase === 'uppercase' ? 'uppercase' : 'none',
            }}
          >
            {head}
            {tail && <span className="block">{tail}</span>}
          </p>

          {(settings.venueName || settings.eventDate) && (
            <p
              className="m-0 mb-2 text-[10px] uppercase"
              style={{ fontFamily: fonts.label, letterSpacing: '.16em', color: palette.accentText }}
            >
              {[settings.venueName, settings.eventDate].filter(Boolean).join(' · ')}
            </p>
          )}

          <p
            className="m-0 mb-4 text-[13px] italic"
            style={{ fontFamily: fonts.body, color: palette.heading }}
          >
            {settings.homePageText || 'Your welcome message will appear here'}
          </p>

          {settings.searchEnabled ? (
            <>
              <div
                className="mb-2 px-3 py-2 text-left text-[12px]"
                style={{
                  fontFamily: fonts.body,
                  background: palette.inputBackground,
                  border: `1px solid ${palette.inputBorder}`,
                  borderRadius: shape.input,
                  color: palette.muted,
                }}
              >
                Type your full name...
              </div>
              <div
                className="py-2 text-[11px] uppercase"
                style={{
                  fontFamily: fonts.label,
                  letterSpacing: '.24em',
                  background: palette.buttonBackground,
                  color: palette.buttonText,
                  borderRadius: shape.button,
                }}
              >
                Find My Table
              </div>
            </>
          ) : (
            <div
              className="px-3 py-3 text-[12px] italic"
              style={{ fontFamily: fonts.body, color: palette.muted }}
            >
              {settings.searchClosedMessage || 'Search is switched off for now.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
