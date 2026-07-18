import type { NormalizedArticle } from "./types";

interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

interface NaverNewsResponse {
  items: NaverNewsItem[];
}

function stripTags(text: string): string {
  return text
    .replace(/<\/?b>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'");
}

export async function fetchNaverNews(query: string): Promise<NormalizedArticle[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET is not configured");
  }

  const url = new URL("https://openapi.naver.com/v1/search/news.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "20");
  url.searchParams.set("sort", "date");

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Naver News API error: ${res.status} ${await res.text()}`);
  }

  const data: NaverNewsResponse = await res.json();

  return data.items.map((item) => ({
    source: "NAVER" as const,
    title: stripTags(item.title),
    url: item.originallink || item.link,
    description: stripTags(item.description),
    publishedAt: new Date(item.pubDate),
  }));
}
