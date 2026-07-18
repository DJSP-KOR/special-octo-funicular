import { prisma } from "./prisma";
import { fetchNaverNews } from "./naver";
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

  // Multiple owners can track the same text — dedupe the actual network
  // fetch by text, but keep every owner's Keyword row so the article gets
  // connected to all of them.
  const idsByText = new Map<string, string[]>();
  const queryByText = new Map<string, string>();
  for (const kw of keywords) {
    idsByText.set(kw.text, [...(idsByText.get(kw.text) ?? []), kw.id]);
    if (!queryByText.has(kw.text)) queryByText.set(kw.text, kw.searchQuery ?? kw.text);
  }
  const uniqueTexts = [...idsByText.keys()];

  const errors: string[] = [];
  const fetchedArticles = new Map<string, NormalizedArticle>();

  const results = await Promise.allSettled(
    uniqueTexts.map((text) => fetchNaverNews(queryByText.get(text)!))
  );

  results.forEach((result, i) => {
    const text = uniqueTexts[i];
    if (result.status === "fulfilled") {
      for (const article of result.value) fetchedArticles.set(article.url, article);
    } else {
      errors.push(`Naver(${text}): ${result.reason}`);
    }
  });

  const toSave = [...fetchedArticles.values()]
    .map((article) => ({
      article,
      matchedIds: matchKeywords(article, uniqueTexts).flatMap((text) => idsByText.get(text) ?? []),
    }))
    .filter(({ matchedIds }) => matchedIds.length > 0);

  await Promise.all(
    toSave.map(({ article, matchedIds }) =>
      prisma.article.upsert({
        where: { url: article.url },
        create: {
          source: article.source,
          title: article.title,
          url: article.url,
          description: article.description,
          publishedAt: article.publishedAt,
          keywords: { connect: matchedIds.map((id) => ({ id })) },
        },
        update: {
          title: article.title,
          description: article.description,
          keywords: { connect: matchedIds.map((id) => ({ id })) },
        },
      })
    )
  );

  const saved = toSave.length;

  return {
    keywordCount: keywords.length,
    fetched: fetchedArticles.size,
    saved,
    errors,
  };
}
