"use client";

import { useQuery } from "convex/react";
import {
  ArrowUpDownIcon,
  CheckCircle2Icon,
  CoinsIcon,
  ExternalLinkIcon,
  GlobeIcon,
  PackageIcon,
  SearchIcon,
  XCircleIcon,
  XIcon
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api } from "@/convex/_generated/api";

const METAL_LABELS: Record<string, string> = {
  XAU: "Gold",
  XAG: "Silver"
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  coin: "Coin",
  bar: "Bar",
  round: "Round"
};

const COUNTRY_LABELS: Record<string, string> = {
  NL: "Netherlands",
  BE: "Belgium",
  LU: "Luxembourg"
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

function timeAgo(fetchedAt: number): string {
  const diffMs = Date.now() - fetchedAt;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type MetalFilter = "all" | "XAU" | "XAG";
type ProductTypeFilter = "all" | "coin" | "bar" | "round";

type SortField =
  | "product"
  | "buyPrice"
  | "premium"
  | "sellPrice"
  | "eurPerGram"
  | "shipping";
type SortDirection = "asc" | "desc";

function SortableHead({
  field,
  children,
  className,
  onSort,
}: {
  field: SortField;
  children: React.ReactNode;
  className?: string;
  onSort: (field: SortField) => void;
}) {
  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 font-medium"
        onClick={() => onSort(field)}
      >
        {children}
        <ArrowUpDownIcon className="size-3.5 text-muted-foreground" />
      </Button>
    </TableHead>
  );
}

export default function DealerProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [metalFilter, setMetalFilter] = React.useState<MetalFilter>("all");
  const [typeFilter, setTypeFilter] = React.useState<ProductTypeFilter>("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [sortField, setSortField] = React.useState<SortField>("buyPrice");
  const [sortDir, setSortDir] = React.useState<SortDirection>("asc");

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const dealer = useQuery(api.dealers.getBySlug, { slug });

  const listings = useQuery(
    api.listings.listByDealer,
    dealer ? { dealerId: dealer._id } : "skip"
  );

  const searchQuery = debouncedSearch.trim().toLowerCase();

  const filteredListings = React.useMemo(() => {
    if (!listings) return [];
    return listings.filter((l) => {
      if (metalFilter !== "all" && l.product.metalType !== metalFilter)
        return false;
      if (typeFilter !== "all" && l.product.productType !== typeFilter)
        return false;
      if (
        searchQuery.length >= 3 &&
        !l.product.name.toLowerCase().includes(searchQuery)
      )
        return false;
      return true;
    });
  }, [listings, metalFilter, typeFilter, searchQuery]);

  const handleSort = React.useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField],
  );

  const sortedListings = React.useMemo(() => {
    const copy = [...filteredListings];
    const dir = sortDir === "asc" ? 1 : -1;

    copy.sort((a, b) => {
      switch (sortField) {
        case "product":
          return dir * a.product.name.localeCompare(b.product.name);
        case "buyPrice":
          return dir * (a.buyPrice - b.buyPrice);
        case "premium":
          return dir * (a.buySpotPremiumPercent - b.buySpotPremiumPercent);
        case "sellPrice": {
          const ap = a.sellPrice ?? Infinity;
          const bp = b.sellPrice ?? Infinity;
          return dir * (ap - bp);
        }
        case "eurPerGram": {
          const ag =
            a.product.weightGrams > 0
              ? a.buyPrice / a.product.weightGrams
              : Infinity;
          const bg =
            b.product.weightGrams > 0
              ? b.buyPrice / b.product.weightGrams
              : Infinity;
          return dir * (ag - bg);
        }
        case "shipping": {
          const aShip = a.shippingCostFrom ?? Infinity;
          const bShip = b.shippingCostFrom ?? Infinity;
          return dir * (aShip - bShip);
        }
        default:
          return 0;
      }
    });

    return copy;
  }, [filteredListings, sortField, sortDir]);

  const stats = React.useMemo(() => {
    if (!listings || listings.length === 0) return null;
    const goldCount = listings.filter(
      (l) => l.product.metalType === "XAU"
    ).length;
    const silverCount = listings.filter(
      (l) => l.product.metalType === "XAG"
    ).length;
    const inStockCount = listings.filter((l) => l.inStock).length;
    const avgPremium =
      listings.reduce((sum, l) => sum + l.buySpotPremiumPercent, 0) /
      listings.length;
    const bestPremium = Math.min(
      ...listings.map((l) => l.buySpotPremiumPercent)
    );
    return { goldCount, silverCount, inStockCount, avgPremium, bestPremium };
  }, [listings]);

  if (dealer === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-2 h-5 w-24" />
          <Skeleton className="mb-1 h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (dealer === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Dealer not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No dealer with slug &ldquo;{slug}&rdquo; exists.
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

  return (
    <div className="space-y-6">
      {/* Dealer Header */}
      <div className="flex items-start gap-4">
        {dealer.iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dealer.iconUrl}
            alt=""
            className="hidden size-22 shrink-0 rounded-lg border bg-white object-contain p-1.5 dark:bg-white/90 sm:block"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {COUNTRY_LABELS[dealer.country] ?? dealer.country}
            </Badge>
            {!dealer.isActive && <Badge variant="destructive">Inactive</Badge>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{dealer.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <a
              href={dealer.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <GlobeIcon className="size-3.5" />
              {new URL(dealer.websiteUrl).hostname}
              <ExternalLinkIcon className="size-3" />
            </a>
            {dealer.lastIngestedAt && (
              <span>Last updated {timeAgo(dealer.lastIngestedAt)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <PackageIcon className="size-3.5" />
              Products
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listings === undefined ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{listings.length}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stats?.goldCount ?? 0} gold · {stats?.silverCount ?? 0}{" "}
                  silver
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CheckCircle2Icon className="size-3.5 text-emerald-500" />
              In Stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listings === undefined ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.inStockCount ?? 0}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  of {listings.length} products available
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CoinsIcon className="size-3.5" />
              Best Premium
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listings === undefined ? (
              <Skeleton className="h-8 w-24" />
            ) : stats ? (
              <>
                <div className="font-mono text-2xl font-bold tabular-nums">
                  {formatPremium(stats.bestPremium)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  over spot (buy side)
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CoinsIcon className="size-3.5" />
              Avg Premium
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listings === undefined ? (
              <Skeleton className="h-8 w-24" />
            ) : stats ? (
              <>
                <div className="font-mono text-2xl font-bold tabular-nums">
                  {formatPremium(stats.avgPremium)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  across all products
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Listings */}
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            All products available at {dealer.name}
          </CardDescription>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <ToggleGroup
              type="single"
              value={metalFilter}
              onValueChange={(v) => {
                if (v) setMetalFilter(v as MetalFilter);
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="all" aria-label="All metals">
                All Metals
              </ToggleGroupItem>
              <ToggleGroupItem value="XAU" aria-label="Gold">
                Gold
              </ToggleGroupItem>
              <ToggleGroupItem value="XAG" aria-label="Silver">
                Silver
              </ToggleGroupItem>
            </ToggleGroup>

            <ToggleGroup
              type="single"
              value={typeFilter}
              onValueChange={(v) => {
                if (v) setTypeFilter(v as ProductTypeFilter);
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="all" aria-label="All types">
                All Types
              </ToggleGroupItem>
              <ToggleGroupItem value="coin" aria-label="Coins">
                Coin
              </ToggleGroupItem>
              <ToggleGroupItem value="bar" aria-label="Bars">
                Bar
              </ToggleGroupItem>
              <ToggleGroupItem value="round" aria-label="Rounds">
                Round
              </ToggleGroupItem>
            </ToggleGroup>

            <InputGroup className="w-full sm:ml-auto sm:w-48">
              <InputGroupInput
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <InputGroupAddon align="inline-start">
                <SearchIcon />
              </InputGroupAddon>
              {searchInput && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchInput("");
                      setDebouncedSearch("");
                    }}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>
        </CardHeader>
        <CardContent>
          {listings === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedListings.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No products found for this dealer.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead field="product" onSort={handleSort}>
                    Product
                  </SortableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <SortableHead
                    field="buyPrice"
                    className="text-right"
                    onSort={handleSort}
                  >
                    Buy Price
                  </SortableHead>
                  <SortableHead
                    field="premium"
                    className="text-right"
                    onSort={handleSort}
                  >
                    Premium
                  </SortableHead>
                  <SortableHead
                    field="sellPrice"
                    className="text-right"
                    onSort={handleSort}
                  >
                    Sell Price
                  </SortableHead>
                  <SortableHead
                    field="eurPerGram"
                    className="text-right"
                    onSort={handleSort}
                  >
                    EUR/g
                  </SortableHead>
                  <SortableHead
                    field="shipping"
                    className="text-right"
                    onSort={handleSort}
                  >
                    Shipping
                  </SortableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-center">Updated</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedListings.map((listing) => {
                  const pricePerGram =
                    listing.product.weightGrams > 0
                      ? listing.buyPrice / listing.product.weightGrams
                      : null;

                  return (
                    <TableRow key={listing._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              listing.product.metalType === "XAU"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-400"
                            }
                          >
                            {METAL_LABELS[listing.product.metalType] ??
                              listing.product.metalType}
                          </Badge>
                          <Link
                            href={`/dashboard/products/${listing.product.slug}`}
                            className="hover:underline"
                          >
                            {listing.product.name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs text-muted-foreground">
                          {PRODUCT_TYPE_LABELS[listing.product.productType] ??
                            listing.product.productType}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {eur.format(listing.buyPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="secondary"
                          className={
                            listing.buySpotPremiumPercent <= 0
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }
                        >
                          {formatPremium(listing.buySpotPremiumPercent)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {listing.sellPrice !== undefined
                          ? eur.format(listing.sellPrice)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {pricePerGram !== null ? eur.format(pricePerGram) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {listing.shippingCostFrom !== undefined
                          ? eur.format(listing.shippingCostFrom)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {listing.inStock ? (
                          <CheckCircle2Icon className="mx-auto size-4 text-emerald-500" />
                        ) : (
                          <XCircleIcon className="mx-auto size-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {timeAgo(listing.fetchedAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          asChild
                        >
                          <a
                            href={listing.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLinkIcon className="size-3.5" />
                            <span className="sr-only">Visit product page</span>
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
