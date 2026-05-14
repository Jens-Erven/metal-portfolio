"use client";

import { useQuery } from "convex/react";
import {
  BrickWallIcon,
  CoinsIcon,
  LayoutGridIcon,
  ListIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
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

type MetalFilter = "all" | "XAU" | "XAG";
type ProductTypeFilter = "all" | "coin" | "bar" | "round";
type ViewMode = "card" | "list";

function ProductPlaceholder({
  metalType,
  productType
}: {
  metalType: string;
  productType: string;
}) {
  const Icon = productType === "bar" ? BrickWallIcon : CoinsIcon;
  return (
    <div
      className={`flex size-full items-center justify-center ${
        metalType === "XAU"
          ? "bg-amber-500/10 text-amber-500"
          : "bg-slate-400/10 text-slate-400"
      }`}
    >
      <Icon className="size-8" />
    </div>
  );
}

const VALID_METALS = new Set<string>(["all", "XAU", "XAG"]);
const VALID_TYPES = new Set<string>(["all", "coin", "bar", "round"]);
const VALID_VIEWS = new Set<string>(["card", "list"]);

export default function ProductsListPage() {
  const products = useQuery(api.products.list, {});
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const rawMetal = searchParams.get("metal") ?? "all";
  const rawType = searchParams.get("type") ?? "all";
  const rawView = searchParams.get("view") ?? "card";
  const rawQuery = searchParams.get("q") ?? "";

  const metalFilter: MetalFilter = VALID_METALS.has(rawMetal)
    ? (rawMetal as MetalFilter)
    : "all";
  const typeFilter: ProductTypeFilter = VALID_TYPES.has(rawType)
    ? (rawType as ProductTypeFilter)
    : "all";
  const viewMode: ViewMode = VALID_VIEWS.has(rawView)
    ? (rawView as ViewMode)
    : "card";

  const [searchInput, setSearchInput] = React.useState(rawQuery);
  const [debouncedQuery, setDebouncedQuery] = React.useState(rawQuery);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    const target = `${pathname}${qs ? `?${qs}` : ""}`;
    const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    if (target !== current) {
      router.replace(target, { scroll: false });
    }
  }, [debouncedQuery, pathname, router, searchParams]);

  const updateParam = React.useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const defaults: Record<string, string> = {
        metal: "all",
        type: "all",
        view: "card",
        q: "",
      };
      if (value === defaults[key]) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  const setMetalFilter = React.useCallback(
    (v: MetalFilter) => updateParam("metal", v),
    [updateParam],
  );
  const setTypeFilter = React.useCallback(
    (v: ProductTypeFilter) => updateParam("type", v),
    [updateParam],
  );
  const setViewMode = React.useCallback(
    (v: ViewMode) => updateParam("view", v),
    [updateParam],
  );

  const handleSearchChange = React.useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const handleClearSearch = React.useCallback(() => {
    setSearchInput("");
    setDebouncedQuery("");
  }, []);

  const searchQuery = debouncedQuery.trim().toLowerCase();

  const filtered = React.useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      if (metalFilter !== "all" && p.metalType !== metalFilter) return false;
      if (typeFilter !== "all" && p.productType !== typeFilter) return false;
      if (searchQuery.length >= 3 && !p.name.toLowerCase().includes(searchQuery))
        return false;
      return true;
    });
  }, [products, metalFilter, typeFilter, searchQuery]);

  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.metalType !== b.metalType) return a.metalType === "XAU" ? -1 : 1;
      if (a.productType !== b.productType)
        return a.productType.localeCompare(b.productType);
      return a.weightGrams - b.weightGrams;
    });
  }, [filtered]);

  if (products === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse all tracked precious metals products.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse all tracked precious metals products.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <ToggleGroup
          type="single"
          value={metalFilter}
          onValueChange={(v) => {
            if (v && VALID_METALS.has(v)) setMetalFilter(v as MetalFilter);
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
            if (v && VALID_TYPES.has(v)) setTypeFilter(v as ProductTypeFilter);
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

        <InputGroup className="w-full sm:ml-auto sm:w-64">
          <InputGroupInput
            placeholder="Search products..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <InputGroupAddon align="inline-start">
            <SearchIcon />
          </InputGroupAddon>
          {searchInput && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Clear search"
                onClick={handleClearSearch}
              >
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>

        <div>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => {
              if (v && VALID_VIEWS.has(v)) setViewMode(v as ViewMode);
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="card" aria-label="Card view">
              <LayoutGridIcon className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <ListIcon className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          No products match the selected filters.
        </div>
      ) : viewMode === "card" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((product) => {
            const imageUrl = product.imageUrls?.[0];
            return (
              <Link
                key={product._id}
                href={`/dashboard/products/${product.slug}`}
                className="group/link focus-visible:outline-none"
              >
                <Card className="h-full transition-colors group-hover/link:bg-muted/50 group-focus-visible/link:ring-2 group-focus-visible/link:ring-ring">
                  <div className="px-4">
                    <AspectRatio ratio={4 / 3}>
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="size-full rounded-lg border bg-muted/30 object-contain p-2"
                        />
                      ) : (
                        <div className="size-full overflow-hidden rounded-lg border">
                          <ProductPlaceholder
                            metalType={product.metalType}
                            productType={product.productType}
                          />
                        </div>
                      )}
                    </AspectRatio>
                  </div>
                  <CardHeader className="pb-2 pt-0">
                    <div className="flex flex-wrap items-center gap-1.5">
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
                        {PRODUCT_TYPE_LABELS[product.productType] ??
                          product.productType}
                      </Badge>
                    </div>
                    <CardTitle className="mt-1 text-base">
                      {product.name}
                    </CardTitle>
                    <CardDescription>
                      {product.weightTroyOz.toFixed(2)} oz (
                      {product.weightGrams.toFixed(2)} g) ·{" "}
                      {(product.purity * 100).toFixed(
                        product.purity >= 0.999 ? 2 : 1
                      )}
                      % purity
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      tabIndex={-1}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <ItemGroup>
          {sorted.map((product) => {
            const imageUrl = product.imageUrls?.[0];
            return (
              <Item key={product._id} variant="outline" asChild>
                <Link href={`/dashboard/products/${product.slug}`}>
                  <ItemMedia variant="image">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="size-full rounded-sm bg-muted/30 object-contain"
                      />
                    ) : (
                      <ProductPlaceholder
                        metalType={product.metalType}
                        productType={product.productType}
                      />
                    )}
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>
                      {product.name}
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
                        {PRODUCT_TYPE_LABELS[product.productType] ??
                          product.productType}
                      </Badge>
                    </ItemTitle>
                    <ItemDescription>
                      {product.weightTroyOz.toFixed(2)} oz (
                      {product.weightGrams.toFixed(2)} g) ·{" "}
                      {(product.purity * 100).toFixed(
                        product.purity >= 0.999 ? 2 : 1
                      )}
                      % purity
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button variant="outline" size="sm" tabIndex={-1}>
                      View Details
                    </Button>
                  </ItemActions>
                </Link>
              </Item>
            );
          })}
        </ItemGroup>
      )}
    </div>
  );
}
