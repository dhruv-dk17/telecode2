import { NextResponse } from "next/server";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getDealsForUser } from "@/lib/platform/service";

export async function GET() {
  const user = await getCurrentUserAction();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deals = await getDealsForUser(user);
  return NextResponse.json({ deals });
}
