// Admin-editable homepage content (a single config document, same idiom as
// `settings.ts`): the hero photo, the "O festivalu" paragraph, the about photo,
// and the 4 icon-highlight title/description pairs. Kept separate from
// `AppSettingsDto` — that module is scoped to app-wide scalar flags, this is a
// richer CMS payload with its own validation shape and lifecycle.

export type HomepageImageDto = {
  imageUrl: string;
  /** "" for the two built-in default images (static files, not S3 objects). */
  imageKey: string;
  alt: string;
};

export type HomepageHighlightDto = {
  title: string;
  description: string;
};

// Fixed-length-4 at the type level: "exactly 4, fixed order, no add/remove" is
// true by construction, not just by validation. The icon shown per position is
// NOT part of this data — it's the hardcoded `HIGHLIGHT_ICONS` array in
// `components/site/about-section.tsx`, zipped in by index at render time.
export type HomepageHighlightsDto = readonly [
  HomepageHighlightDto,
  HomepageHighlightDto,
  HomepageHighlightDto,
  HomepageHighlightDto,
];

export type HomepageContentDto = {
  heroImage: HomepageImageDto;
  aboutText: string;
  aboutImage: HomepageImageDto;
  highlights: HomepageHighlightsDto;
};

export type HomepageContentRepository = {
  /** Current content; an absent/partial document falls back to the defaults. */
  get(): Promise<HomepageContentDto>;
  /** Upsert the single content doc; returns the new state. */
  set(input: HomepageContentDto): Promise<HomepageContentDto>;
};

// = today's static homepage copy, so the feature ships with zero visible
// change until an admin edits it. Also the repository's fallback for a
// missing/partial document.
export const DEFAULT_HOMEPAGE_CONTENT: HomepageContentDto = {
  heroImage: {
    imageUrl: "/hero/festival-2024.jpg",
    imageKey: "",
    alt: "Kapela hraje na pódiu u Mušle v Šanovském parku před davem návštěvníků festivalu Živé Teplice",
  },
  aboutText:
    "Sousedská slavnost Živé Teplice podporuje komunitní život v Teplicích a snaží se propojovat lidi různých věkových, názorových i národnostních skupin. Jednoduše spojuje všechny, kteří si chtějí zpříjemnit život v našem městě a trochu ho oživit. Každoročně se můžete těšit na hudební vystoupení místních umělců, výborné občerstvení, výstavu obrazů, divadlo, program neziskových spolků, trh s autorskými výrobky i jógu.",
  aboutImage: {
    imageUrl: "/hero/festival-2025.jpg",
    imageKey: "",
    alt: "Hudebník s kytarou hraje dětem v publiku na festivalu Živé Teplice",
  },
  highlights: [
    {
      title: "Hudba naživo",
      description: "Vystoupení místních kapel a umělců po celý den.",
    },
    {
      title: "Občerstvení",
      description: "Dobroty od místních stánkařů a kavárníků.",
    },
    {
      title: "Tvorba a trh",
      description: "Výstava obrazů a trh s autorskými výrobky.",
    },
    {
      title: "Pro celou rodinu",
      description: "Divadlo, jóga a program pro děti i dospělé.",
    },
  ],
} as const;
