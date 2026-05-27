import { NextResponse } from "next/server";
import { getCurrentUserAction } from "@/app/actions/auth";

export async function GET() {
  const user = await getCurrentUserAction();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user });
}
