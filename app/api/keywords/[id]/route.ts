import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerId, withOwnerCookie } from "@/lib/owner";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ownerId, isNew } = getOwnerId(req);
  const { id } = await params;

  // deleteMany scoped to ownerId so a request can never delete a keyword it
  // doesn't own, even if it somehow knows another owner's keyword id.
  await prisma.keyword.deleteMany({ where: { id, ownerId } });

  return withOwnerCookie(NextResponse.json({ ok: true }), ownerId, isNew);
}
