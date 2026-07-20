import { redirect } from "next/navigation";

/** Permanent redirect: Projects merged into "Our Work" (/gallery). */
export function GET() {
  redirect("/gallery");
}
