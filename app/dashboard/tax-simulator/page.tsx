import { auth } from "@clerk/nextjs/server";

export default async function TaxSimulatorPage() {
  const { has } = await auth();

  const hasTaxSimulator = has({ feature: "tax_simulator" });

  if (!hasTaxSimulator)
    return (
      <h1>Only subscribers to the Premium plan can access this content.</h1>
    );

  return <h1>For Premium subscribers only</h1>;
}
