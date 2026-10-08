import { permanentRedirect } from "next/navigation";

/** Preserve existing gallery links while using one public work archive. */
export default function GalleryPage() {
  permanentRedirect("/our-work");
}
