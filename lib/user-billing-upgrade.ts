/**
 * Derives upgrade CTAs from Clerk Billing: `usePlans` catalog + `useSubscription` state.
 * Paid catalog plans are ordered by ascending monthly fee (tier ladder).
 */

export type SubscriptionPlanSummary = {
  id: string;
  name: string;
  slug: string;
  hasBaseFee: boolean;
};

/** Fields read from Clerk `BillingPlanResource` for routing upgrades. */
export type UserCatalogBillingPlan = {
  id: string;
  name: string;
  slug: string;
  hasBaseFee: boolean;
  isRecurring: boolean;
  /** `'user'` — individual payer plans only */
  forPayerType: "user" | "org";
  publiclyVisible: boolean;
  fee: { amount: number } | null;
};

export function getPrimaryIndividualSubscriptionPlan(
  subscription:
    | {
        subscriptionItems: Array<{
          status: string;
          plan: SubscriptionPlanSummary;
        }>;
      }
    | null
    | undefined,
): SubscriptionPlanSummary | null {
  if (!subscription?.subscriptionItems?.length) return null;
  const usable = subscription.subscriptionItems.filter(
    (item) => item.status === "active" || item.status === "past_due",
  );
  const paid = usable.find((item) => item.plan.hasBaseFee);
  const item = paid ?? usable[0];
  return item?.plan ?? null;
}

export function subscriptionPlanBadgeLabel(
  subscription: Parameters<typeof getPrimaryIndividualSubscriptionPlan>[0],
  fallbackFreeLabel = "Free",
): string {
  const primary = getPrimaryIndividualSubscriptionPlan(subscription);
  const trimmed = primary?.name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallbackFreeLabel;
}

export function orderPublicIndividualPaidPlans(
  plans: ReadonlyArray<UserCatalogBillingPlan>,
): UserCatalogBillingPlan[] {
  return plans
    .filter(
      (p) =>
        p.forPayerType === "user" &&
        p.publiclyVisible &&
        p.hasBaseFee &&
        p.isRecurring,
    )
    .slice()
    .sort((a, b) => (a.fee?.amount ?? 0) - (b.fee?.amount ?? 0));
}

/** Next tier in the catalog ladder, or `null` when already on the highest paid tier (or ambiguous). */
export function resolveNextIndividualUpgradePlan(
  subscription: Parameters<typeof getPrimaryIndividualSubscriptionPlan>[0],
  catalogPlans: ReadonlyArray<UserCatalogBillingPlan> | undefined,
): UserCatalogBillingPlan | null {
  if (!catalogPlans?.length) return null;
  const paidOrdered = orderPublicIndividualPaidPlans(catalogPlans);
  if (!paidOrdered.length) return null;

  const current = getPrimaryIndividualSubscriptionPlan(subscription);
  if (!current?.hasBaseFee) return paidOrdered[0];

  const idx = paidOrdered.findIndex((p) => p.id === current.id);
  if (idx === -1) return null;
  return paidOrdered[idx + 1] ?? null;
}

export type IndividualUpgradeMenuModel =
  | { kind: "loading" }
  | { kind: "idle" }
  | { kind: "upgrade"; label: string };

export function resolveIndividualUpgradeMenuModel(input: {
  userPresent: boolean;
  billingLoading: boolean;
  subscription: Parameters<typeof getPrimaryIndividualSubscriptionPlan>[0];
  catalogPlans: ReadonlyArray<UserCatalogBillingPlan> | undefined;
}): IndividualUpgradeMenuModel {
  if (!input.userPresent) return { kind: "idle" };
  if (input.billingLoading) return { kind: "loading" };

  const next = resolveNextIndividualUpgradePlan(
    input.subscription,
    input.catalogPlans,
  );
  if (!next) return { kind: "idle" };

  return {
    kind: "upgrade",
    label: `Upgrade to ${next.name}`,
  };
}
