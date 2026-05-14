"use client";

import { useQuery } from "convex/react";
import {
  ExternalLinkIcon,
  GlobeIcon,
  StoreIcon,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

const COUNTRY_LABELS: Record<string, string> = {
  NL: "Netherlands",
  BE: "Belgium",
  LU: "Luxembourg",
};

export default function DealersListPage() {
  const dealers = useQuery(api.dealers.list, { activeOnly: true });

  if (dealers === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dealers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse all registered Benelux precious metals dealers.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[152px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dealers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse all registered Benelux precious metals dealers.
        </p>
      </div>

      {dealers.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          No dealers registered yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {dealers.map((dealer) => (
            <Link
              key={dealer._id}
              href={`/dashboard/dealers/${dealer.slug}`}
              className="group/link focus-visible:outline-none"
            >
              <Card className="h-full transition-colors group-hover/link:bg-muted/50 group-focus-visible/link:ring-2 group-focus-visible/link:ring-ring">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white dark:bg-white/90">
                      {dealer.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={dealer.iconUrl}
                          alt=""
                          className="size-full object-contain p-1"
                        />
                      ) : (
                        <StoreIcon className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        {dealer.name}
                      </CardTitle>
                      <CardDescription className="mt-0.5">
                        <Badge variant="outline" className="text-xs">
                          {COUNTRY_LABELS[dealer.country] ?? dealer.country}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <GlobeIcon className="size-3" />
                    {new URL(dealer.websiteUrl).hostname}
                    <ExternalLinkIcon className="size-2.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
