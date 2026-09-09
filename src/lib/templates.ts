/**
 * Event templates.
 *
 * The guest portal is one piece of behaviour (search a name, show a table)
 * dressed in one of several looks. Everything that differs between an
 * engagement, a wedding and a bridal shower lives here — palette, type,
 * scenery and default copy — so a new event type is a new entry in this
 * registry plus a scenery component, not a rewrite of the home page.
 *
 * Pure data with no React imports, so it can be unit tested and read from
 * server components, API routes and the admin panel alike.
 */

export const TEMPLATE_IDS = ['bridal-shower', 'wedding', 'engagement'] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const DEFAULT_TEMPLATE_ID: TemplateId = 'bridal-shower';

/**
 * Colours and geometry the shared portal components read. Values are plain CSS
 * (not Tailwind classes) because the templates use gradients and alpha values
 * that would not survive Tailwind's class scanner when composed at runtime.
 */
export interface TemplatePalette {
  /** `background` shorthand for the page itself. */
  pageBackground: string;
  /** Hairline rules, dividers and frames. */
  accent: string;
  /** Small-caps eyebrow/label text. */
  accentText: string;
  /** Event name and table number. */
  heading: string;
  /** Body copy. */
  body: string;
  /** De-emphasised body copy. */
  muted: string;
  /** Card fill. */
  surface: string;
  /** Card border. */
  surfaceBorder: string;
  /** Card shadow. */
  surfaceShadow: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  /** Border colour while an input has focus. */
  inputFocusBorder: string;
  buttonBackground: string;
  buttonText: string;
  buttonShadow: string;
  /** Fill behind the "here is your table" panel. */
  resultBackground: string;
  /** Leaves of the small divider bloom under the event name. */
  dividerLeaf: string;
  /** Centre of the divider bloom. */
  dividerBloom: string;
  /** Three representative colours, used for the admin template picker. */
  swatches: [string, string, string];
}

/** Border radii, in CSS length units. */
export interface TemplateShape {
  input: string;
  button: string;
  panel: string;
}

/** `font-family` values; all three faces are loaded in the root layout. */
export interface TemplateFonts {
  /** The event name. */
  display: string;
  /** Small-caps labels, eyebrow and rules. */
  label: string;
  /** Body copy and form controls. */
  body: string;
}

/** Copy a fresh event starts from, and what the admin "reset" button restores. */
export interface TemplateCopy {
  eventName: string;
  eventKicker: string;
  homePageText: string;
  venueName: string;
  eventDate: string;
  searchClosedMessage: string;
}

export interface EventTemplate {
  id: TemplateId;
  /** Shown in the admin template picker. */
  name: string;
  /** One-line description of the look, shown under the name. */
  description: string;
  /** How the display face wants to be set. */
  displayCase: 'as-typed' | 'uppercase';
  /** Letter spacing for the display face. */
  displayTracking: string;
  palette: TemplatePalette;
  shape: TemplateShape;
  fonts: TemplateFonts;
  copy: TemplateCopy;
}

const FONT_SCRIPT = 'var(--font-script), cursive';
const FONT_FLEUR = 'var(--font-fleur-de-leah), cursive';
const FONT_CORMORANT = 'var(--font-cormorant), Georgia, serif';
const FONT_PLAYFAIR = 'var(--font-playfair-display), Georgia, serif';

export const EVENT_TEMPLATES: Record<TemplateId, EventTemplate> = {
  'bridal-shower': {
    id: 'bridal-shower',
    name: 'Bridal Shower',
    description: 'Enchanted garden — hanging canopy, meadow and butterflies.',
    displayCase: 'as-typed',
    displayTracking: 'normal',
    fonts: { display: FONT_SCRIPT, label: FONT_CORMORANT, body: FONT_PLAYFAIR },
    shape: { input: '9999px', button: '9999px', panel: '22px' },
    palette: {
      pageBackground:
        'linear-gradient(180deg,#FFFFFF 0%,#FFFFFF 42%,#FBF6EE 66%,#F3EEE0 82%,#E9F0E0 100%)',
      accent: '#C9B896',
      accentText: '#8A7A5C',
      heading: '#4A5F45',
      body: '#3E4F3A',
      muted: '#7D8C74',
      surface: 'linear-gradient(180deg,rgba(255,253,248,.94),rgba(255,251,244,.88))',
      surfaceBorder: 'rgba(201,184,150,.55)',
      surfaceShadow: '0 18px 40px -28px rgba(74,95,69,.7)',
      inputBackground: '#FFFDF9',
      inputBorder: '#DFD3BC',
      inputText: '#3E4F3A',
      inputFocusBorder: '#C3A671',
      buttonBackground: 'linear-gradient(180deg,#C3A671,#9C7F4C)',
      buttonText: '#FFFDF7',
      buttonShadow: '0 10px 22px -12px rgba(120,96,52,.9)',
      resultBackground:
        'linear-gradient(140deg,rgba(243,217,220,.6),rgba(255,255,255,.92) 46%,rgba(168,184,154,.38))',
      dividerLeaf: '#A8B89A',
      dividerBloom: '#E8B4B8',
      swatches: ['#4A5F45', '#C9B896', '#F3D9DC'],
    },
    copy: {
      eventName: "Mira's Bridal Shower",
      eventKicker: 'Bridal Shower',
      homePageText: 'Welcome to the garden! Find your table',
      venueName: "Angelina's Restaurant, Staten Island",
      eventDate: 'September 26',
      searchClosedMessage: 'Seating will be revealed on the day of the celebration.',
    },
  },

  wedding: {
    id: 'wedding',
    name: 'Wedding',
    description: 'Ivory and gold — a quiet framed card, no photograph needed.',
    displayCase: 'uppercase',
    displayTracking: '.12em',
    fonts: { display: FONT_PLAYFAIR, label: FONT_CORMORANT, body: FONT_CORMORANT },
    shape: { input: '4px', button: '4px', panel: '2px' },
    palette: {
      pageBackground:
        'linear-gradient(180deg,#FBF8F2 0%,#F7F2E8 46%,#F2EADC 78%,#EBE1CF 100%)',
      accent: '#C2A55C',
      accentText: '#9A8148',
      heading: '#2F3038',
      body: '#3A3B44',
      muted: '#7C7A74',
      surface: 'linear-gradient(180deg,rgba(255,254,251,.96),rgba(253,250,243,.92))',
      surfaceBorder: 'rgba(194,165,92,.5)',
      surfaceShadow: '0 24px 60px -34px rgba(60,52,30,.55)',
      inputBackground: '#FFFDF8',
      inputBorder: '#E0D5BC',
      inputText: '#2F3038',
      inputFocusBorder: '#C2A55C',
      buttonBackground: 'linear-gradient(180deg,#3C3D46,#26272E)',
      buttonText: '#F8F4EA',
      buttonShadow: '0 12px 26px -14px rgba(38,39,46,.85)',
      resultBackground:
        'linear-gradient(140deg,rgba(247,242,232,.95),rgba(255,255,255,.96) 52%,rgba(233,222,199,.75))',
      dividerLeaf: '#CBBE94',
      dividerBloom: '#C2A55C',
      swatches: ['#2F3038', '#C2A55C', '#F7F2E8'],
    },
    copy: {
      eventName: 'Our Wedding Day',
      eventKicker: 'The Wedding Of',
      homePageText: 'We are so glad you are here. Please find your table below.',
      venueName: '',
      eventDate: '',
      searchClosedMessage: 'Table assignments will be published closer to the day.',
    },
  },

  engagement: {
    id: 'engagement',
    name: 'Engagement',
    description: 'Photograph backdrop behind a soft beige veil — the original look.',
    displayCase: 'as-typed',
    displayTracking: '.02em',
    fonts: { display: FONT_FLEUR, label: FONT_PLAYFAIR, body: FONT_PLAYFAIR },
    shape: { input: '8px', button: '8px', panel: '12px' },
    palette: {
      pageBackground: '#F5F5F4',
      accent: '#C6B79B',
      accentText: '#8B7043',
      heading: '#1F3D2B',
      body: '#3F4A3E',
      muted: '#78716C',
      surface: 'rgba(255,255,255,.92)',
      surfaceBorder: 'rgba(168,151,110,.45)',
      surfaceShadow: '0 20px 45px -30px rgba(51,45,32,.75)',
      inputBackground: '#FFFFFF',
      inputBorder: '#D6D3D1',
      inputText: '#3F4A3E',
      inputFocusBorder: '#A38550',
      buttonBackground: '#A38550',
      buttonText: '#FFFFFF',
      buttonShadow: '0 10px 22px -14px rgba(120,96,52,.9)',
      resultBackground:
        'linear-gradient(140deg,rgba(236,240,232,.9),rgba(255,255,255,.95) 55%,rgba(245,240,228,.9))',
      dividerLeaf: '#A8B89A',
      dividerBloom: '#C6A87A',
      swatches: ['#1F3D2B', '#A38550', '#E7E5E4'],
    },
    copy: {
      eventName: "Mira & Kamal's Engagement",
      eventKicker: 'Engagement Celebration',
      homePageText: 'Welcome to our engagement! Please find your table below.',
      venueName: '',
      eventDate: '',
      searchClosedMessage:
        'The table search opens on the day of the event. Please check back later!',
    },
  },
};

/** Every template, in the order the admin picker lists them. */
export const TEMPLATE_LIST: EventTemplate[] = TEMPLATE_IDS.map((id) => EVENT_TEMPLATES[id]);

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && (TEMPLATE_IDS as readonly string[]).includes(value);
}

/**
 * Resolve a stored template id to a template. Unknown ids (a hand-edited row,
 * or a template removed in a later release) fall back to the default rather
 * than leaving the guest portal blank.
 */
export function resolveTemplate(id: unknown): EventTemplate {
  return isTemplateId(id) ? EVENT_TEMPLATES[id] : EVENT_TEMPLATES[DEFAULT_TEMPLATE_ID];
}
