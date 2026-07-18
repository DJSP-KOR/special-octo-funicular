export function matchKeywords(
  article: { title: string; description: string },
  keywords: string[]
): string[] {
  const haystack = `${article.title} ${article.description}`.toLowerCase();
  return keywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
}
