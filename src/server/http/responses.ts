import { NextResponse } from "next/server";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "Internal Server Error";
  return NextResponse.json({ success: false, error: message }, { status });
}
