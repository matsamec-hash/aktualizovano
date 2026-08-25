import type { Article } from "./types";

interface LinkCandidate {
  article: Article;
  score: number;
  url: string;
}

const STOP_PHRASES = new Set([
  "a", "i", "v", "o", "z", "k", "s", "u",
  "na", "do", "od", "po", "za", "ze", "že", "se", "si",
  "je", "to", "co", "pro", "ale", "nebo", "jak", "jako", "tak", "by",
]);

const MAX_LINKS_PER_ARTICLE = 3;
const MIN_TRIGGER_LENGTH = 5;

const articleUrl = (a: Article): string => `/${a.slug}/`;

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isUsefulTrigger = (t: string): boolean => {
  const trimmed = t.trim();
  if (trimmed.length < MIN_TRIGGER_LENGTH) return false;
  if (STOP_PHRASES.has(trimmed.toLowerCase())) return false;
  if (!/[\p{L}]{3,}/u.test(trimmed)) return false;
  return true;
};

function rankCandidates(current: Article, others: Article[]): LinkCandidate[] {
  const currentTags = new Set(
    (current.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean),
  );
  const candidates: LinkCandidate[] = [];

  for (const a of others) {
    const tags = new Set(
      (a.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean),
    );
    const intersection = [...currentTags].filter((t) => tags.has(t)).length;
    const sameCategory = current.category && a.category === current.category ? 1 : 0;
    const score = intersection * 5 + sameCategory * 0.8;
    if (score <= 0) continue;
    candidates.push({ article: a, score, url: articleUrl(a) });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function triggersFor(a: Article): string[] {
  const set = new Set<string>();
  for (const tag of a.tags ?? []) set.add(tag);
  return [...set].filter(isUsefulTrigger).sort((x, y) => y.length - x.length);
}

const SAFE_SPLIT_RE = /(<a\b[^>]*>[\s\S]*?<\/a>|<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>|<code\b[^>]*>[\s\S]*?<\/code>)/gi;

function injectLinkInSafeSegment(
  segment: string,
  trigger: string,
  url: string,
): { changed: boolean; html: string } {
  const escaped = escapeRegex(trigger);
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${escaped})(?![\\p{L}\\p{N}])`, "iu");
  // Segment stále obsahuje značky (<img alt="…">, <p class="…">). Kdyby se
  // trigger trefil do atributu, vložil by se odkaz doprostřed hodnoty a rozbil
  // HTML → hledáme výhradně v textových uzlech.
  const parts = segment.split(/(<[^>]*>)/);
  for (let i = 0; i < parts.length; i += 2) {
    const match = parts[i].match(re);
    if (!match || match.index === undefined) continue;
    const matchedText = match[1];
    const before = parts[i].slice(0, match.index);
    const after = parts[i].slice(match.index + matchedText.length);
    parts[i] = `${before}<a href="${url}" class="auto-link">${matchedText}</a>${after}`;
    return { changed: true, html: parts.join("") };
  }
  return { changed: false, html: segment };
}

export function autoLinkContent(
  html: string,
  current: Article,
  others: Article[],
): string {
  if (!html || others.length === 0) return html;

  const candidates = rankCandidates(current, others);
  if (candidates.length === 0) return html;

  let working = html;
  const linkedUrls = new Set<string>();

  for (const candidate of candidates) {
    if (linkedUrls.size >= MAX_LINKS_PER_ARTICLE) break;
    if (linkedUrls.has(candidate.url)) continue;

    const triggers = triggersFor(candidate.article);
    let injected = false;
    // Re-split před každým kandidátem: odkaz vložený v předchozím kole je tak
    // chráněný token a další trigger se do něj (do jeho href) nemůže vnořit.
    const tokens = working.split(SAFE_SPLIT_RE);

    for (const trigger of triggers) {
      if (injected) break;
      for (let i = 0; i < tokens.length; i += 2) {
        const result = injectLinkInSafeSegment(tokens[i], trigger, candidate.url);
        if (result.changed) {
          tokens[i] = result.html;
          linkedUrls.add(candidate.url);
          injected = true;
          break;
        }
      }
    }

    if (injected) working = tokens.join("");
  }

  return working;
}
