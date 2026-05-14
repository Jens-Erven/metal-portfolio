"use client";

import { useQuery } from "convex/react";
import * as React from "react";

import {
  type ListingRow,
  PriceComparisonTable,
} from "@/components/price-comparison-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Side = "buy" | "sell";

const METAL_LABELS: Record<string, string> = {
  XAU: "Gold",
  XAG: "Silver",
};

const COUNTRY_OPTIONS = [
  { value: "ALL", label: "All countries" },
  { value: "NL", label: "Netherlands" },
  { value: "BE", label: "Belgium" },
  { value: "LU", label: "Luxembourg" },
] as const;

export default function ComparePage() {
  const [selectedProductId, setSelectedProductId] =
    React.useState<Id<"canonicalProducts"> | null>(null);
  const [side, setSide] = React.useState<Side>("buy");
  const [countryFilter, setCountryFilter] = React.useState("ALL");

  const products = useQuery(api.products.list, {});
  const spotPrice = useQuery(api.listings.latestSpotPrice, {});

  const effectiveProductId =
    selectedProductId ??
    (products && products.length > 0 ? products[0]._id : null);

  const listings = useQuery(
    api.listings.listByProduct,
    effectiveProductId ? { canonicalProductId: effectiveProductId } : "skip",
  );

  const selectedProduct = React.useMemo(
    () => products?.find((p) => p._id === effectiveProductId) ?? null,
    [products, effectiveProductId],
  );

  const currentSpot = React.useMemo(() => {
    if (!spotPrice || !selectedProduct) return null;
    return selectedProduct.metalType === "XAU"
      ? spotPrice.eurPerTroyOzXau
      : spotPrice.eurPerTroyOzXag;
  }, [spotPrice, selectedProduct]);

  const filteredListings: ListingRow[] = React.useMemo(() => {
    if (!listings) return [];
    return listings.filter((l) => {
      if (countryFilter !== "ALL" && l.dealer.country !== countryFilter) {
        return false;
      }
      if (side === "sell" && l.sellPrice === undefined) return false;
      return true;
    }) as ListingRow[];
  }, [listings, countryFilter, side]);

  const productsByMetal = React.useMemo(() => {
    if (!products) return {};
    const groups: Record<string, typeof products> = {};
    for (const p of products) {
      const key = p.metalType;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return groups;
  }, [products]);

  const isLoadingProducts = products === undefined;
  const isLoadingListings = effectiveProductId !== null && listings === undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compare Prices</h1>
        <p className="text-sm text-muted-foreground">
          Find the best deal across Benelux dealers for any product.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">
              {selectedProduct
                ? `${selectedProduct.name} — ${METAL_LABELS[selectedProduct.metalType] ?? selectedProduct.metalType}`
                : "Select a product"}
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              {isLoadingProducts ? (
                <Skeleton className="h-8 w-[220px]" />
              ) : (
                <Select
                  value={effectiveProductId ?? ""}
                  onValueChange={(v) =>
                    setSelectedProductId(v as Id<"canonicalProducts">)
                  }
                >
                  <SelectTrigger
                    className="w-full rounded-lg sm:w-[260px]"
                    aria-label="Product"
                  >
                    <SelectValue placeholder="Choose product..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.entries(productsByMetal).map(
                      ([metalType, items]) => (
                        <SelectGroup key={metalType}>
                          <SelectLabel>
                            {METAL_LABELS[metalType] ?? metalType}
                          </SelectLabel>
                          {items.map((p) => (
                            <SelectItem
                              key={p._id}
                              value={p._id}
                              className="rounded-lg"
                            >
                              {p.name} ({p.weightTroyOz.toFixed(2)} oz)
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ),
                    )}
                  </SelectContent>
                </Select>
              )}

              <ToggleGroup
                type="single"
                value={countryFilter}
                onValueChange={(v) => {
                  if (v) setCountryFilter(v);
                }}
                variant="outline"
                size="sm"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <ToggleGroupItem
                    key={c.value}
                    value={c.value}
                    aria-label={c.label}
                  >
                    {c.value === "ALL" ? "All" : c.value}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {selectedProduct && currentSpot !== null && (
            <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Spot:{" "}
                <span className="font-mono font-medium text-foreground tabular-nums">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 2,
                  }).format(currentSpot)}
                </span>
                /oz
              </span>
              <span>
                Weight:{" "}
                <span className="font-medium text-foreground">
                  {selectedProduct.weightTroyOz.toFixed(2)} oz (
                  {selectedProduct.weightGrams.toFixed(2)} g)
                </span>
              </span>
            </div>
          )}

          <Tabs
            value={side}
            onValueChange={(v) => setSide(v as Side)}
          >
            <TabsList>
              <TabsTrigger value="buy">Buy from dealer</TabsTrigger>
              <TabsTrigger value="sell">Sell to dealer</TabsTrigger>
            </TabsList>

            <TabsContent value="buy" className="mt-4">
              <PriceComparisonTable
                listings={filteredListings}
                side="buy"
                spotPrice={currentSpot}
                weightGrams={selectedProduct?.weightGrams ?? 0}
                loading={isLoadingListings}
              />
            </TabsContent>

            <TabsContent value="sell" className="mt-4">
              <PriceComparisonTable
                listings={filteredListings}
                side="sell"
                spotPrice={currentSpot}
                weightGrams={selectedProduct?.weightGrams ?? 0}
                loading={isLoadingListings}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
