import { auth } from "@clerk/nextjs/server";

import { FeatureAccessEmptyFromPreset } from "@/components/feature-access-empty-state";

export default async function TaxSimulatorPage() {
  const { has } = await auth();

  if (!has({ feature: "tax_simulator" })) {
    return <FeatureAccessEmptyFromPreset preset="tax_simulator" />;
  }

  return <h1>For Premium subscribers only</h1>;
}
