"use client";

import * as React from "react";
import { analytics } from "@/services/analytics";
import { cn } from "@/lib/utils";

const contactLinkClasses = "inline-flex min-h-11 max-w-full items-center rounded-sm focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-4";

/** Phone link that fires a no-op analytics event on click. */
export function PhoneLink({ phone, className, children }: { phone: string; className?: string; children: React.ReactNode }) {
  return (
    <a href={`tel:${phone}`} className={cn(contactLinkClasses, className)} onClick={() => analytics.trackPhoneClicked()}>
      {children}
    </a>
  );
}

/** Email link that fires a no-op analytics event on click. */
export function EmailLink({ email, className, children }: { email: string; className?: string; children: React.ReactNode }) {
  return (
    <a href={`mailto:${email}`} className={cn(contactLinkClasses, className)} onClick={() => analytics.trackEmailClicked()}>
      {children}
    </a>
  );
}
