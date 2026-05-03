"use client";

import { PricingTable } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/** Clerk's table reads `collapseFeatures` at render — sync with breakpoint for narrower screens. */
export function ClerkPricingTable() {
  const [collapseFeatures, setCollapseFeatures] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setCollapseFeatures(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <PricingTable
      for="user"
      collapseFeatures={collapseFeatures}
      ctaPosition="bottom"
    />
  );
}
