import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Source } from "@/app/generated/prisma/enums";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword");
  const source = searchParams.get("source") as Source | null;

  const articles = await prisma.article.findMany({
    where: {
      ...(keyword ? { keywords: { some: { text: keyword } } } : {}),
      ...(source ? { source } : {}),
    },
    include: { keywords: true },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });

  const latest = await prisma.article.findFirst({
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });

  return NextResponse.json({
    articles,
    lastSyncedAt: latest?.fetchedAt ?? null,
  });
}
