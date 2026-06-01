export interface Article {
  id: string;
  site_id: string;
  title: string;
  slug: string;
  perex: string;
  content: string;
  seo_title: string;
  seo_description: string;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  featured_image_credit: {
    provider: 'upload' | 'pexels' | 'unsplash' | 'pixabay' | 'ai';
    photographer_name: string;
    photographer_url: string;
    source_url: string;
  } | null;
  focal_point: { x: number; y: number } | null;
  category: string | null;
  tags: string[];
  status: string;
  author_type: string;
  published_at: string | null;
  last_updated_at: string | null;
  created_at: string;
  // AEO/AI-fill pole z CMS (zatím prázdná, forward-looking). Až je CMS naplní,
  // article stránka vyrenderuje viditelnou FAQ sekci + FAQPage schema.
  faq_items: { question: string; answer: string }[] | null;
  tldr: string | null;
}

export interface Category {
  slug: string;
  label: string;
  description: string;
}