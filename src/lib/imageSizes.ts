// Sdílené presety šířek pro build-time responzivní obrázky (ResponsiveImage.astro).
// Drží srcset varianty i preload (Base.astro) v synchronu — preload LCP MUSÍ mít
// stejné widths/sizes/format jako vykreslený <img>, jinak prohlížeč stáhne dvě verze.

export const IMG_WIDTHS = {
  // Hero carousel – plná šířka, LCP na homepage.
  hero: [640, 960, 1280, 1600, 2000],
  // Featured obrázek článku – max ~768px obsah, na mobilu 100vw.
  featured: [480, 768, 1024, 1280, 1536],
  // Karty v gridu (ArticleCard, CategoryBlock lead) – ~33–50vw.
  card: [320, 480, 640, 800],
  // Malé čtvercové thumbnaily (FloatingCard ~96px, RailStory ~112px) – jen 1×/2×.
  thumb: [112, 224],
} as const;

export const IMG_SIZES = {
  hero: "100vw",
  featured: "(min-width: 768px) 768px, 100vw",
  card: "(min-width: 768px) 33vw, 100vw",
  cardHalf: "(min-width: 1024px) 50vw, 100vw",
  thumb: "112px",
} as const;
