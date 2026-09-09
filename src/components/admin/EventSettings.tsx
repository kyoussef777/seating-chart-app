'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, Layout, PenLine, RotateCcw, Save, Sparkles, Users } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import {
  FIELD_LIMITS,
  normalizeSettingsUpdate,
  templateDefaults,
  toPortalSettings,
  type PortalSettings,
  type TextField,
} from '@/lib/event-settings';
import { TEMPLATE_LIST, type TemplateId } from '@/lib/templates';
import PortalPreview from '@/components/admin/PortalPreview';

/**
 * Event Settings: pick the portal template, write the copy that goes on it, and
 * decide what the portal asks guests for.
 *
 * The form edits a local draft and only writes on save, so an unsaved change is
 * always recoverable with Discard.
 */

interface FieldSpec {
  field: TextField;
  label: string;
  help: string;
  placeholder: string;
  multiline?: boolean;
}

const DETAIL_FIELDS: FieldSpec[] = [
  {
    field: 'eventKicker',
    label: 'Event type line',
    help: 'The small line above the name, between two rules. Leave blank to hide it.',
    placeholder: 'e.g., Bridal Shower',
  },
  {
    field: 'eventName',
    label: 'Event name',
    help: 'The large heading. The last word drops to a second, indented line.',
    placeholder: "e.g., Sarah & John's Wedding",
  },
  {
    field: 'venueName',
    label: 'Venue',
    help: 'Shown under the name. Leave blank to hide the venue and date line.',
    placeholder: "e.g., Angelina's Restaurant, Staten Island",
  },
  {
    field: 'eventDate',
    label: 'Date',
    help: 'Written however you like — it is copy, not a calendar date.',
    placeholder: 'e.g., September 26',
  },
];

const COPY_FIELDS: FieldSpec[] = [
  {
    field: 'homePageText',
    label: 'Welcome message',
    help: 'Sits above the search box, in italics.',
    placeholder: 'Welcome! Please find your table below.',
    multiline: true,
  },
  {
    field: 'searchClosedMessage',
    label: 'Message while search is off',
    help: 'Shown in place of the search box when guest search is switched off.',
    placeholder: 'Seating will be revealed on the day of the celebration.',
    multiline: true,
  },
];

function Toggle({
  id,
  checked,
  onChange,
  label,
  help,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  help: string;
}) {
  const themeConfig = useTheme();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className={themeConfig.text.label}>
          {label}
        </label>
        <p className={`text-xs ${themeConfig.text.muted} mt-1`}>{help}</p>
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2',
          checked ? 'bg-emerald-600' : 'bg-stone-300'
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Layout;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const themeConfig = useTheme();
  return (
    <section className={themeConfig.card}>
      <div className="mb-5 flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${themeConfig.icon.color.primary}`} />
        <div>
          <h3 className={`text-base font-semibold sm:text-lg ${themeConfig.text.heading}`}>{title}</h3>
          <p className={`text-xs ${themeConfig.text.muted} mt-0.5`}>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function EventSettings() {
  const themeConfig = useTheme();
  const toast = useToast();

  const [saved, setSaved] = useState<PortalSettings | null>(null);
  const [draft, setDraft] = useState<PortalSettings | null>(null);
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (cancelled) return;
        if (response.ok && data.settings) {
          const settings = toPortalSettings(data.settings);
          setSaved(settings);
          setDraft(settings);
          setUpdatedAt(data.settings.updatedAt ?? '');
        } else {
          toast.error(data.error || 'Could not load event settings.');
        }
      } catch {
        if (!cancelled) toast.error('Could not load event settings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const dirty = useMemo(
    () => Boolean(draft && saved) && JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved]
  );

  const validationError = useMemo(() => {
    if (!draft) return null;
    const result = normalizeSettingsUpdate(draft);
    return result.ok ? null : result.error;
  }, [draft]);

  const update = <K extends keyof PortalSettings>(key: K, value: PortalSettings[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));

  /** Switching template only changes the look; copy is replaced on request. */
  const chooseTemplate = (id: TemplateId) => update('template', id);

  const applyTemplateCopy = () => {
    if (!draft) return;
    const defaults = templateDefaults(draft.template);
    setDraft({
      ...draft,
      eventName: defaults.eventName,
      eventKicker: defaults.eventKicker,
      homePageText: defaults.homePageText,
      venueName: defaults.venueName,
      eventDate: defaults.eventDate,
      searchClosedMessage: defaults.searchClosedMessage,
    });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || validationError) {
      if (validationError) toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await response.json();

      if (response.ok) {
        const settings = toPortalSettings(data.settings);
        setSaved(settings);
        setDraft(settings);
        setUpdatedAt(data.settings?.updatedAt ?? '');
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 3000);
        toast.success('Event settings saved.');
      } else {
        toast.error(data.error || 'Could not save event settings.');
      }
    } catch {
      toast.error('Could not save event settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !draft) {
    return (
      <div className="py-12 text-center">
        <div className={`w-8 h-8 border-4 ${themeConfig.loading.spinner} border-t-transparent rounded-full animate-spin mx-auto mb-4`} />
        <p className={themeConfig.loading.text}>Loading event settings...</p>
      </div>
    );
  }

  const renderField = ({ field, label, help, placeholder, multiline }: FieldSpec) => {
    const limit = FIELD_LIMITS[field];
    const value = draft[field];
    const nearLimit = value.length > limit.max * 0.9;

    return (
      <div key={field}>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={field} className={themeConfig.text.label}>
            {label}
            {!limit.required && (
              <span className={`ml-2 text-xs font-normal ${themeConfig.text.muted}`}>optional</span>
            )}
          </label>
          <span className={cn('text-xs tabular-nums', nearLimit ? 'text-amber-700' : themeConfig.text.muted)}>
            {value.length}/{limit.max}
          </span>
        </div>
        {multiline ? (
          <textarea
            id={field}
            value={value}
            maxLength={limit.max}
            rows={3}
            onChange={(e) => update(field, e.target.value)}
            className={themeConfig.input}
            placeholder={placeholder}
          />
        ) : (
          <input
            type="text"
            id={field}
            value={value}
            maxLength={limit.max}
            onChange={(e) => update(field, e.target.value)}
            className={themeConfig.input}
            placeholder={placeholder}
          />
        )}
        <p className={`text-xs ${themeConfig.text.muted} mt-1`}>{help}</p>
      </div>
    );
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={`hidden text-xl font-bold md:block sm:text-2xl ${themeConfig.text.heading}`}>
            Event Settings
          </h2>
          <p className={`text-sm ${themeConfig.text.muted}`}>
            Everything guests see on the portal, in one place.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 ${themeConfig.button.secondary}`}
        >
          <Eye className="h-4 w-4" />
          Open Guest Portal
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <SectionCard
            icon={Layout}
            title="Portal template"
            description="The look of the guest portal. Your wording is kept when you switch."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {TEMPLATE_LIST.map((template) => {
                const active = draft.template === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => chooseTemplate(template.id)}
                    aria-pressed={active}
                    className={cn(
                      'group relative overflow-hidden rounded-xl border-2 p-3 text-left transition-all',
                      active
                        ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                        : 'border-stone-200 bg-white hover:border-stone-400'
                    )}
                  >
                    <span
                      aria-hidden
                      className="mb-3 flex h-12 overflow-hidden rounded-lg"
                      style={{ background: template.palette.pageBackground }}
                    >
                      {template.palette.swatches.map((swatch) => (
                        <span key={swatch} className="flex-1" style={{ background: swatch }} />
                      ))}
                    </span>
                    <span className={`block text-sm font-semibold ${themeConfig.text.heading}`}>
                      {template.name}
                    </span>
                    <span className={`mt-1 block text-xs ${themeConfig.text.muted}`}>
                      {template.description}
                    </span>
                    {active && (
                      <span className="absolute right-2 top-2 rounded-full bg-emerald-600 p-1 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={applyTemplateCopy}
              className={`mt-4 inline-flex items-center gap-2 px-3 py-2 text-sm ${themeConfig.button.tertiary}`}
            >
              <Sparkles className="h-4 w-4" />
              Use this template&apos;s wording
            </button>
          </SectionCard>

          <SectionCard
            icon={PenLine}
            title="Event details"
            description="The headline block at the top of the portal."
          >
            <div className="space-y-5">{DETAIL_FIELDS.map(renderField)}</div>
          </SectionCard>

          <SectionCard
            icon={PenLine}
            title="Messages"
            description="What the portal says to guests around the search box."
          >
            <div className="space-y-5">{COPY_FIELDS.map(renderField)}</div>
          </SectionCard>

          <SectionCard
            icon={Users}
            title="What guests can do"
            description="Turn parts of the portal on and off as the event gets closer."
          >
            <div className="space-y-5">
              <Toggle
                id="searchEnabled"
                checked={draft.searchEnabled}
                onChange={(next) => update('searchEnabled', next)}
                label="Enable guest search"
                help="Turn off to hide the search box until the event day."
              />
              <Toggle
                id="addressCollectionEnabled"
                checked={draft.addressCollectionEnabled}
                onChange={(next) => update('addressCollectionEnabled', next)}
                label="Ask guests for their address"
                help="When on, a guest with no address on file is asked for one after finding their table."
              />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="lg:sticky lg:top-28">
            <div className={themeConfig.card}>
              <h3 className={`mb-4 flex items-center gap-2 text-base font-semibold sm:text-lg ${themeConfig.text.heading}`}>
                <Eye className={`h-5 w-5 ${themeConfig.icon.color.primary}`} />
                Live preview
              </h3>
              <PortalPreview settings={draft} />
              <p className={`mt-3 text-xs ${themeConfig.text.muted}`}>
                A miniature of the real portal, drawn with the selected template&apos;s colours
                and type. Guests see changes as soon as you save.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={themeConfig.card}>
        <h3 className={`mb-4 text-base font-semibold sm:text-lg ${themeConfig.text.heading}`}>
          Quick information
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
          {[
            {
              title: 'Guest portal URL',
              value: typeof window !== 'undefined' ? window.location.origin : 'Your domain',
            },
            {
              title: 'Admin portal URL',
              value:
                typeof window !== 'undefined' ? `${window.location.origin}/admin` : 'Your domain/admin',
            },
            { title: 'CSV import format', value: 'Columns: name, phoneNumber, address' },
          ].map((item) => (
            <div
              key={item.title}
              className={`${themeConfig.theme.gradient.floral} rounded-lg p-4 ${themeConfig.classes.borderBeige}`}
            >
              <h4 className={`mb-1 font-medium ${themeConfig.text.heading}`}>{item.title}</h4>
              <p className={`text-sm ${themeConfig.text.body} break-all`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Save bar: sits above the mobile tab bar, and stays in reach on desktop. */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 md:bottom-4">
        <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {validationError ? (
              <p className="text-sm font-medium text-rose-700">{validationError}</p>
            ) : dirty ? (
              <p className={`text-sm font-medium ${themeConfig.text.heading}`}>Unsaved changes</p>
            ) : justSaved ? (
              <p className={`${themeConfig.theme.semantic.success.text} text-sm font-medium`}>
                Settings saved
              </p>
            ) : (
              <p className={`text-xs ${themeConfig.text.muted}`}>
                {updatedAt ? `Last updated ${new Date(updatedAt).toLocaleString()}` : 'No changes yet'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => saved && setDraft(saved)}
              disabled={!dirty}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm ${themeConfig.button.tertiary} disabled:opacity-40`}
            >
              <RotateCcw className="h-4 w-4" />
              Discard
            </button>
            <button
              type="submit"
              disabled={saving || !dirty || Boolean(validationError)}
              className={`inline-flex flex-1 items-center justify-center gap-2 px-4 py-2 sm:flex-none ${themeConfig.button.primary}`}
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent text-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
