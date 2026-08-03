import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function zodErrorResponse(error: ZodError) {
  const first = error.issues[0];
  return jsonError(first ? `${first.path.join(".")}: ${first.message}` : "Invalid input", 422);
}

export function unauthorized() {
  return jsonError("Unauthorized", 401);
}

export function notFound(message = "Not found") {
  return jsonError(message, 404);
}
