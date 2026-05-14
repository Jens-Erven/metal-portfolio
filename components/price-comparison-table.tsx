"use client";

import {
  ArrowUpDownIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  XCircleIcon,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DealerInfo {
  _id: string;
  name: string;
  slug: string;
  country: "BE" | "NL" | "LU";
  websiteUrl: string;
  iconUrl?: string;
  logoUrl?: string;
}

export interface ListingRow {
  _id: string;
  buyPrice: number;
  sellPrice?: number;
  buySpotPremiumPercent: number;
  sellSpotPremiumPercent?: number;
  shippingCostFrom?: number;
  deliveryTimeDays?: number;
  inStock: boolean;
  sourceUrl: string;
  fetchedAt: number;
  dealer: DealerInfo;
}

type SortField =
  | "price"
  | "premium"
  | "shipping"
  | "total"
  | "delivery"
  | "dealer";
type SortDirection = "asc" | "desc";

interface PriceComparisonTableProps {
  listings: ListingRow[];
  side: "buy" | "sell";
  spotPrice: number | null;
  weightGrams: number;
  loading?: boolean;
}

const eur = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
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

export function PriceComparisonTable({
  listings,
  side,
  spotPrice: _spotPrice,
  weightGrams,
  loading = false,
}: PriceComparisonTableProps) {
  const [sortField, setSortField] = React.useState<SortField>("price");
  const [sortDir, setSortDir] = React.useState<SortDirection>("asc");

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
    const copy = [...listings];
    const dir = sortDir === "asc" ? 1 : -1;

    copy.sort((a, b) => {
      switch (sortField) {
        case "dealer":
          return dir * a.dealer.name.localeCompare(b.dealer.name);
        case "price": {
          const ap =
            side === "buy" ? a.buyPrice : (a.sellPrice ?? Infinity);
          const bp =
            side === "buy" ? b.buyPrice : (b.sellPrice ?? Infinity);
          return dir * (ap - bp);
        }
        case "premium": {
          const ap =
            side === "buy"
              ? a.buySpotPremiumPercent
              : (a.sellSpotPremiumPercent ?? Infinity);
          const bp =
            side === "buy"
              ? b.buySpotPremiumPercent
              : (b.sellSpotPremiumPercent ?? Infinity);
          return dir * (ap - bp);
        }
        case "shipping": {
          const aShip = a.shippingCostFrom ?? Infinity;
          const bShip = b.shippingCostFrom ?? Infinity;
          return dir * (aShip - bShip);
        }
        case "total": {
          const at =
            (side === "buy" ? a.buyPrice : (a.sellPrice ?? Infinity)) +
            (a.shippingCostFrom ?? 0);
          const bt =
            (side === "buy" ? b.buyPrice : (b.sellPrice ?? Infinity)) +
            (b.shippingCostFrom ?? 0);
          return dir * (at - bt);
        }
        case "delivery": {
          const ad = a.deliveryTimeDays ?? Infinity;
          const bd = b.deliveryTimeDays ?? Infinity;
          return dir * (ad - bd);
        }
        default:
          return 0;
      }
    });

    return copy;
  }, [listings, sortField, sortDir, side]);

  const bestPrice = React.useMemo(() => {
    if (sortedListings.length === 0) return null;
    if (side === "buy") {
      return Math.min(...sortedListings.map((l) => l.buyPrice));
    }
    const sellPrices = sortedListings
      .map((l) => l.sellPrice)
      .filter((p): p is number => p !== undefined);
    if (sellPrices.length === 0) return null;
    return Math.max(...sellPrices);
  }, [sortedListings, side]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No dealer listings available for this product yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead field="dealer" onSort={handleSort}>
            Dealer
          </SortableHead>
          <TableHead className="w-16 text-center">Country</TableHead>
          <SortableHead
            field="price"
            className="text-right"
            onSort={handleSort}
          >
            {side === "buy" ? "Buy Price" : "Sell Price"}
          </SortableHead>
          <SortableHead
            field="premium"
            className="text-right"
            onSort={handleSort}
          >
            Premium
          </SortableHead>
          <TableHead className="text-right">EUR/g</TableHead>
          {side === "buy" && (
            <>
              <SortableHead
                field="shipping"
                className="text-right"
                onSort={handleSort}
              >
                Shipping
              </SortableHead>
              <SortableHead
                field="total"
                className="text-right"
                onSort={handleSort}
              >
                Total
              </SortableHead>
              <SortableHead
                field="delivery"
                className="text-center"
                onSort={handleSort}
              >
                Delivery
              </SortableHead>
            </>
          )}
          <TableHead className="text-center">Stock</TableHead>
          <TableHead className="text-center">Updated</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedListings.map((listing) => {
          const price =
            side === "buy" ? listing.buyPrice : listing.sellPrice;
          const premium =
            side === "buy"
              ? listing.buySpotPremiumPercent
              : listing.sellSpotPremiumPercent;
          const pricePerGram =
            price !== undefined && weightGrams > 0
              ? price / weightGrams
              : null;
          const totalWithShipping =
            side === "buy" && price !== undefined
              ? price + (listing.shippingCostFrom ?? 0)
              : null;

          const isBest =
            bestPrice !== null &&
            price !== undefined &&
            ((side === "buy" && price === bestPrice) ||
              (side === "sell" && price === bestPrice));

          return (
            <TableRow
              key={listing._id}
              className={isBest ? "bg-emerald-500/5" : undefined}
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {listing.dealer.iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.dealer.iconUrl}
                      alt=""
                      className="size-5 rounded object-contain"
                    />
                  )}
                  <span>{listing.dealer.name}</span>
                  {isBest && (
                    <Badge
                      variant="default"
                      className="bg-emerald-600 text-white"
                    >
                      Best
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline">{listing.dealer.country}</Badge>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {price !== undefined ? eur.format(price) : "—"}
              </TableCell>
              <TableCell className="text-right">
                {premium !== undefined ? (
                  <Badge
                    variant="secondary"
                    className={
                      premium <= 0
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }
                  >
                    {formatPremium(premium)}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {pricePerGram !== null ? eur.format(pricePerGram) : "—"}
              </TableCell>
              {side === "buy" && (
                <>
                  <TableCell className="text-right font-mono tabular-nums">
                    {listing.shippingCostFrom !== undefined
                      ? eur.format(listing.shippingCostFrom)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {totalWithShipping !== null
                      ? eur.format(totalWithShipping)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {listing.deliveryTimeDays !== undefined
                      ? `${listing.deliveryTimeDays}d`
                      : "—"}
                  </TableCell>
                </>
              )}
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
                    <span className="sr-only">Visit dealer</span>
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
