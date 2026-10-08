import { permanentRedirect } from "next/navigation";

/** Keep older project-index links on the canonical work archive. */
export function GET() {
  permanentRedirect("/our-work");
}
