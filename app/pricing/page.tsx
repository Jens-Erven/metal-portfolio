import { ClerkPricingTable } from "@/components/clerk-pricing-table";

export default function PricingPage() {
  return (
    <main className="relative min-h-dvh w-full px-4 py-10 pb-14 sm:px-6 sm:py-14 lg:px-10 lg:py-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:gap-10">
        <header className="mx-auto max-w-2xl text-center lg:mx-0 lg:max-w-xl lg:text-left">
          <h1 className="text-balance font-semibold text-2xl tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Pricing
          </h1>
          <p className="mt-2 text-pretty text-sm text-muted-foreground sm:text-base">
            Compare plans and subscribe when you&apos;re ready. Pricing is
            billed through Clerk.
          </p>
        </header>

        {/*
          Avoid a second “card” around Clerk’s plan cards (shadows get clipped).
          overflow-x-auto forces overflow-y to compute to auto, which clips box-shadows;
          generous padding inside the scrollport leaves room for shadows on small screens.
        */}
        <div className="max-md:-mx-1 sm:max-md:-mx-2">
          <div className="overflow-x-auto px-5 py-10 sm:px-8 sm:py-12 md:overflow-x-visible md:px-0 md:py-6">
            <ClerkPricingTable />
          </div>
        </div>
      </div>
    </main>
  );
}
