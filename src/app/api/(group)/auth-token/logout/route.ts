import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth-token";

export const POST = async () => {
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });
  return res;
};
