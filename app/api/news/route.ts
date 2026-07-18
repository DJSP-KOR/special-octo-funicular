import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerId, withOwnerCookie } from "@/lib/owner";

export async function GET(req: NextRequest) {
  const { ownerId, isNew } = getOwnerId(req);
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword");

  if (isNew) {
    return withOwnerCookie(
      NextResponse.json({ articles: [], lastSyncedAt: null }),
      ownerId,
      isNew
    );
  }

  const articles = await prisma.article.findMany({
    where: {
      keywords: { some: { ownerId, ...(keyword ? { text: keyword } : {}) } },
    },
    include: { keywords: { where: { ownerId } } },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });

  const latest = await prisma.article.findFirst({
    where: { keywords: { some: { ownerId } } },
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });

  return withOwnerCookie(
    NextResponse.json({ articles, lastSyncedAt: latest?.fetchedAt ?? null }),
    ownerId,
    isNew
  );
}
