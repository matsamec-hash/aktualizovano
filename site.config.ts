/**
 * aktualizovano.cz site configuration.
 *
 * Brand placeholders below are NEUTRAL — Phase 1C (brand exploration spec
 * v ~/aktualizovano-brainstorm/docs/superpowers/specs/2026-05-04-phase-1c-brand-exploration.md)
 * dodá Direction A / B / C colors + fonts. Update both `colors` here AND
 * CSS custom properties v src/styles/global.css.
 */
export const siteConfig = {
  name: "Aktualizováno",
  domain: "aktualizovano.cz",
  siteId: "63253275-f6ac-4c50-8755-c8d385b758ff",
  description: "Buďte v obraze — tech, auta, lifestyle, zábava, cestování a finance.",
  tagline: "Buďte v obraze",

  // PLACEHOLDER palette — neutrální, swap v Phase 1C pick
  colors: {
    primary: "#1F2937",      // charcoal
    accent: "#DC2626",       // red CTA
    background: "#FFFFFF",
    backgroundSoft: "#F9FAFB",
    text: "#111827",
    textMuted: "#6B7280",
    border: "#E5E7EB",
  },

  categories: [
    {
      slug: "tech",
      label: "Tech",
      description: "AI, gadgety, eSIM, software a hardware",
    },
    {
      slug: "auto-moto",
      label: "Auto-moto",
      description: "Auta, motorky, recenze a tipy",
    },
    {
      slug: "lifestyle",
      label: "Lifestyle",
      description: "Život, zdraví, vztahy a osobní rozvoj",
    },
    {
      slug: "zabava",
      label: "Zábava",
      description: "Filmy, seriály, hry a kultura",
    },
    {
      slug: "cestovani",
      label: "Cestování",
      description: "Tipy, recenze a průvodci",
    },
    {
      slug: "finance",
      label: "Finance",
      description: "Dotace, investice, peníze a NZÚ",
    },
  ],

  networkSites: [
    { name: "Tradingworld", domain: "tradingworld.cz" },
    { name: "Žena žije", domain: "zenazije.cz" },
    { name: "WiseNews", domain: "wisenews.cz" },
    { name: "CheapTravel", domain: "cheaptravel.cz" },
    { name: "Periodikum", domain: "periodikum.cz" },
  ],
};