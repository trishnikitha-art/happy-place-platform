/**
 * Barrel for Phase 1 canonical objects.
 *
 * Re-exports every domain's instantiated objects and a flattened `allObjects`
 * array plus the ID authority, so validators and future Knowledge Constitution
 * tooling can import the whole graph from one place.
 */

import type { CanonicalBusinessObject } from "../canonical-object";

export { Brand } from "./brand";
export { Services } from "./services";
export { Projects } from "./projects";
export { Media } from "./media";
export { Stories } from "./stories";
export { Reviews } from "./reviews";
export { Pricing } from "./pricing";
export { canonicalId, brandCanonicalId, serviceId, projectId, mediaId, reviewId, storyId, pricingId } from "./_ids";

import { Brand } from "./brand";
import { Services } from "./services";
import { Projects } from "./projects";
import { Media } from "./media";
import { Stories } from "./stories";
import { Reviews } from "./reviews";
import { Pricing } from "./pricing";

export const allObjects: CanonicalBusinessObject[] = [
  Brand,
  ...Services,
  ...Projects,
  ...Media,
  ...Stories,
  ...Reviews,
  ...Pricing,
];
