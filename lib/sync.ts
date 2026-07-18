import { prisma } from "./prisma";
import { fetchNaverNews } from "./naver";
import { fetchReutersNews } from "./newsapi";
import { matchKeywords } from "./classify";
import type { NormalizedArticle } from "./types";

export interface SyncResult {
  keywordCount: number;
  fetched: number;
  saved: number;
  errors: string[];
}

export async function syncNews(): Promise<SyncResult> {
  const keywords = await prisma.keyword.findMany();
  const keywordTexts = keywords.map((k: { text: string }) => k.text);

  const errors: string[] = [];
  const fetchedArticles = new Map<string, NormalizedArticle>();

  for (const keyword of keywordTexts) {
    const [naverResult, reutersResult] = await Promise.allSettled([
      fetchNaverNews(keyword),
      fetchReutersNews(keyword),
    ]);

    if (naverResult.status === "fulfilled") {
      for (const article of naverResult.value) fetchedArticles.set(article.url, article);
    } else {
      errors.push(`Naver(${keyword}): ${naverResult.reason}`);
    }

    if (reutersResult.status === "fulfilled") {
      for (const article of reutersResult.value) fetchedArticles.set(article.url, article);
    } else {
      errors.push(`Reuters(${keyword}): ${reutersResult.reason}`);
    }
  }

  let saved = 0;
  for (const article of fetchedArticles.values()) {
    const matched = matchKeywords(article, keywordTexts);
    if (matched.length === 0) continue;

    await prisma.article.upsert({
      where: { url: article.url },
      create: {
        source: article.source,
        title: article.title,
        url: article.url,
        description: article.description,
        publishedAt: article.publishedAt,
        keywords: { connect: matched.map((text) => ({ text })) },
      },
      update: {
        title: article.title,
        description: article.description,
        keywords: { connect: matched.map((text) => ({ text })) },
      },
    });
    saved += 1;
  }

  return {
    keywordCount: keywordTexts.length,
    fetched: fetchedArticles.size,
    saved,
    errors,
  };
}
