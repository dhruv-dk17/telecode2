import { NextResponse } from "next/server";
import { checkDbConnection } from "@/app/actions/auth";

export async function GET() {
  const databaseReady = await checkDbConnection();

  return NextResponse.json({
    ok: true,
    mode: databaseReady ? "database" : "local-mock",
    timestamp: new Date().toISOString(),
  });
}
