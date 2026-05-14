"use client";

import { useQuery } from "convex/react";
import { ArrowDownIcon, ArrowUpIcon, CoinsIcon, StoreIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";

import {
  type ListingRow,
  PriceComparisonTable
} from "@/components/price-comparison-table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";

type Side = "buy" | "sell";

const METAL_LABELS: Record<string, string> = {
  XAU: "Gold",
  XAG: "Silver"
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  coin: "Coin",
  bar: "Bar",
  round: "Round"
};

const eur = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatPremium(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [side, setSide] = React.useState<Side>("buy");

  const product = useQuery(api.products.getBySlug, { slug });
  const spotPrice = useQuery(api.listings.latestSpotPrice, {});

  const listings = useQuery(
    api.listings.listByProduct,
    product ? { canonicalProductId: product._id } : "skip"
  );

  const currentSpot = React.useMemo(() => {
    if (!spotPrice || !product) return null;
    return product.metalType === "XAU"
      ? spotPrice.eurPerTroyOzXau
      : spotPrice.eurPerTroyOzXag;
  }, [spotPrice, product]);

  const filteredListings: ListingRow[] = React.useMemo(() => {
    if (!listings) return [];
    if (side === "sell") {
      return listings.filter((l) => l.sellPrice !== undefined) as ListingRow[];
    }
    return listings as ListingRow[];
  }, [listings, side]);

  const bestBuy = React.useMemo(() => {
    if (!listings || listings.length === 0) return null;
    return listings.reduce((best, l) =>
      l.buyPrice < best.buyPrice ? l : best
    );
  }, [listings]);

  const bestSell = React.useMemo(() => {
    if (!listings || listings.length === 0) return null;
    const withSell = listings.filter((l) => l.sellPrice !== undefined);
    if (withSell.length === 0) return null;
    return withSell.reduce((best, l) =>
      (l.sellPrice ?? 0) > (best.sellPrice ?? 0) ? l : best
    );
  }, [listings]);

  if (product === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-2 h-5 w-32" />
          <Skeleton className="mb-1 h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Product not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No product with slug &ldquo;{slug}&rdquo; exists.
          </p>
          <Link
            href="/dashboard/compare"
            className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            Go to price comparison
          </Link>
        </div>
      </div>
    );
  }

  const meltValue =
    currentSpot !== null ? currentSpot * product.weightTroyOz : null;

  return (
    <div className="space-y-6">
      {/* Product Header */}
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={
              product.metalType === "XAU"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-400"
            }
          >
            {METAL_LABELS[product.metalType] ?? product.metalType}
          </Badge>
          <Badge variant="outline">
            {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {product.weightTroyOz.toFixed(2)} troy oz ({product.weightGrams.toFixed(2)} g)
          {" · "}Purity{" "}
          {(product.purity * 100).toFixed(product.purity >= 0.999 ? 2 : 1)}%
          {meltValue !== null && (
            <>
              {" · "}Melt value{" "}
              <span className="font-mono tabular-nums">
                {eur.format(meltValue)}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <ArrowDownIcon className="size-3.5 text-emerald-500" />
              Best Buy Price
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listings === undefined ? (
              <Skeleton className="h-8 w-32" />
            ) : bestBuy ? (
              <>
                <div className="font-mono text-2xl font-bold tabular-nums">
                  {eur.format(bestBuy.buyPrice)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {bestBuy.dealer.name}
                  <Badge
                    variant="secondary"
                    className="ml-2 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  >
                    {formatPremium(bestBuy.buySpotPremiumPercent)}
                  </Badge>
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No offers</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <ArrowUpIcon className="size-3.5 text-blue-500" />
              Best Sell Price
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listings === undefined ? (
              <Skeleton className="h-8 w-32" />
            ) : bestSell ? (
              <>
                <div className="font-mono text-2xl font-bold tabular-nums">
                  {eur.format(bestSell.sellPrice!)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {bestSell.dealer.name}
                  {bestSell.sellSpotPremiumPercent !== undefined && (
                    <Badge
                      variant="secondary"
                      className="ml-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    >
                      {formatPremium(bestSell.sellSpotPremiumPercent)}
                    </Badge>
                  )}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No sell offers</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CoinsIcon className="size-3.5" />
              Spot Price
            </CardDescription>
          </CardHeader>
          <CardContent>
            {spotPrice === undefined ? (
              <Skeleton className="h-8 w-32" />
            ) : currentSpot !== null ? (
              <>
                <div className="font-mono text-2xl font-bold tabular-nums">
                  {eur.format(currentSpot)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  per troy oz · {spotPrice.date}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Unavailable</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <StoreIcon className="size-3.5" />
              Dealers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listings === undefined ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{listings.length}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {listings.filter((l) => l.inStock).length} in stock
                  {listings.filter((l) => !l.inStock).length > 0 && (
                    <>
                      {" · "}
                      {listings.filter((l) => !l.inStock).length} out of stock
                    </>
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dealer Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Dealer Comparison</CardTitle>
          <CardDescription>
            All dealer prices for {product.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentSpot !== null && (
            <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Spot:{" "}
                <span className="font-mono font-medium text-foreground tabular-nums">
                  {eur.format(currentSpot)}
                </span>
                /oz
              </span>
            </div>
          )}
          <Tabs value={side} onValueChange={(v) => setSide(v as Side)}>
            <TabsList>
              <TabsTrigger value="buy">Buy from dealer</TabsTrigger>
              <TabsTrigger value="sell">Sell to dealer</TabsTrigger>
            </TabsList>
            <TabsContent value="buy" className="mt-4">
              <PriceComparisonTable
                listings={filteredListings}
                side="buy"
                spotPrice={currentSpot}
                weightGrams={product.weightGrams}
                loading={listings === undefined}
              />
            </TabsContent>
            <TabsContent value="sell" className="mt-4">
              <PriceComparisonTable
                listings={filteredListings}
                side="sell"
                spotPrice={currentSpot}
                weightGrams={product.weightGrams}
                loading={listings === undefined}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
