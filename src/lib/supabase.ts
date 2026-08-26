import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "../../site.config";
import type { Article } from "./types";

// Články se čtou ze self-hostované instance — tam píše admin.samecdigital.com.
// Dřív tu byla natvrdo cloudová instance, takže se web renderoval z databáze,
// do které CMS nepíše (tichý split-brain).
// Před přepnutím doplněno 7 článků, které existovaly jen v cloudu (eSIM/Airalo),
// aby přepnutím nezmizely. Po doplnění mají obě instance 140 publikovaných.
const SUPABASE_URL = "https://supabase.samecdigital.com";
const SUPABASE_ANON_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MDY5NTYwMCwiZXhwIjo0OTM2MzY5MjAwLCJyb2xlIjoiYW5vbiJ9.OIvu-YM9AzPKdCngJ2tHPl2emYP8OFxvYhTtAAErnKk";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getPublishedArticles(): Promise<Article[]> {
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("site_id", siteConfig.siteId)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return (data as Article[]) || [];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("site_id", siteConfig.siteId)
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data as Article | null;
}

export async function getArticlesByCategory(category: string): Promise<Article[]> {
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("site_id", siteConfig.siteId)
    .eq("status", "published")
    .eq("category", category)
    .order("published_at", { ascending: false });
  return (data as Article[]) || [];
}

export async function getRelatedArticles(
  currentId: string,
  category: string | null,
  tags: string[] = [],
): Promise<Article[]> {
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("site_id", siteConfig.siteId)
    .eq("status", "published")
    .neq("id", currentId)
    .order("published_at", { ascending: false })
    .limit(60);
  const candidates = (data as Article[]) ?? [];
  const currentTags = new Set((tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean));
  const scored = candidates.map((art) => {
    const artTags = new Set(((art.tags ?? []) as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean));
    const intersection = [...currentTags].filter((t) => artTags.has(t)).length;
    const union = new Set([...currentTags, ...artTags]).size;
    const jaccard = union > 0 ? intersection / union : 0;
    const sameCategory = category && art.category === category ? 1 : 0;
    const recencyMs = art.published_at ? new Date(art.published_at).getTime() : 0;
    const recencyBoost = recencyMs / 1e15;
    return { article: art, score: jaccard * 10 + sameCategory * 0.5 + recencyBoost };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.article);
}