import { LockIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

/** Clerk `has({ feature })` keys you gate on — extend as you add features in Clerk. */
export type FeatureAccessPresetKey = "tax_simulator";

export const featureAccessPresets: Record<
  FeatureAccessPresetKey,
  Pick<
    FeatureAccessEmptyStateProps,
    "title" | "description" | "pricingCtaLabel"
  >
> = {
  tax_simulator: {
    title: "Tax simulator is not included in your plan",
    description:
      "Run what-if tax scenarios with the Premium subscription. Compare plans on the pricing page and upgrade when you're ready.",
    pricingCtaLabel: "See plans & upgrade"
  }
};

export type FeatureAccessEmptyStateProps = {
  title: string;
  description: ReactNode;
  /** Primary CTA label (links to pricing). */
  pricingCtaLabel?: string;
  pricingHref?: string;
  /** Secondary action — off by default so pages can omit it when redundant. */
  showBackToDashboard?: boolean;
  dashboardHref?: string;
  backToDashboardLabel?: string;
  className?: string;
};

export function FeatureAccessEmptyState({
  title,
  description,
  pricingCtaLabel = "View pricing",
  pricingHref = "/pricing",
  showBackToDashboard = true,
  dashboardHref = "/dashboard",
  backToDashboardLabel = "Back to dashboard",
  className
}: FeatureAccessEmptyStateProps) {
  return (
    <Empty className={cn("border-border bg-muted/20", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LockIcon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href={pricingHref}>{pricingCtaLabel}</Link>
        </Button>
        {showBackToDashboard ? (
          <Button variant="outline" asChild>
            <Link href={dashboardHref}>{backToDashboardLabel}</Link>
          </Button>
        ) : null}
      </EmptyContent>
    </Empty>
  );
}

/** Use preset copy keyed by your Clerk Billing feature slug. */
export function FeatureAccessEmptyFromPreset({
  preset,
  ...rest
}: Omit<FeatureAccessEmptyStateProps, "title" | "description"> & {
  preset: FeatureAccessPresetKey;
}) {
  return (
    <FeatureAccessEmptyState {...featureAccessPresets[preset]} {...rest} />
  );
}
