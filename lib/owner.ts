import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "owner_id";

export function getOwnerId(req: NextRequest): { ownerId: string; isNew: boolean } {
  const existing = req.cookies.get(COOKIE_NAME)?.value;
  if (existing) return { ownerId: existing, isNew: false };
  return { ownerId: randomUUID(), isNew: true };
}

export function withOwnerCookie(
  res: NextResponse,
  ownerId: string,
  isNew: boolean
): NextResponse {
  if (isNew) {
    res.cookies.set(COOKIE_NAME, ownerId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return res;
}
