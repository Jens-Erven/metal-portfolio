import { v } from "convex/values";

import { Id } from "./_generated/dataModel";
import { internalMutation, query, QueryCtx } from "./_generated/server";

async function resolveDealer(ctx: QueryCtx, dealerId: Id<"dealers">) {
  const dealer = await ctx.db.get(dealerId);
  if (!dealer) return null;
  return {
    _id: dealer._id,
    name: dealer.name,
    slug: dealer.slug,
    country: dealer.country,
    websiteUrl: dealer.websiteUrl,
    iconUrl: dealer.iconUrl,
    logoUrl: dealer.logoUrl
  };
}

/**
 * Returns the most recent listing per dealer for a given canonical product,
 * enriched with dealer info. Only active dealers are included.
 */
export const listByProduct = query({
  args: {
    canonicalProductId: v.id("canonicalProducts")
  },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("dealerListings")
      .withIndex("by_canonicalProductId_and_fetchedAt", (q) =>
        q.eq("canonicalProductId", args.canonicalProductId)
      )
      .order("desc")
      .take(200);

    // Keep only the most recent listing per dealer
    const latestByDealer = new Map<Id<"dealers">, (typeof listings)[number]>();
    for (const listing of listings) {
      if (!latestByDealer.has(listing.dealerId)) {
        latestByDealer.set(listing.dealerId, listing);
      }
    }

    const results = [];
    for (const listing of latestByDealer.values()) {
      const dealer = await resolveDealer(ctx, listing.dealerId);
      if (!dealer) continue;

      results.push({
        ...listing,
        dealer
      });
    }

    return results;
  }
});

/**
 * Returns the latest spot price for premium calculations.
 */
export const latestSpotPrice = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("metalDailyPrices")
      .withIndex("by_base_and_date")
      .order("desc")
      .take(1);

    const latest = rows[0];
    if (!latest) return null;

    return {
      date: latest.date,
      eurPerTroyOzXau: latest.eurPerTroyOzXau,
      eurPerTroyOzXag: latest.eurPerTroyOzXag
    };
  }
});

/**
 * Returns the most recent listing per product for a given dealer,
 * enriched with product info. Used on the dealer profile page.
 */
export const listByDealer = query({
  args: {
    dealerId: v.id("dealers")
  },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("dealerListings")
      .withIndex("by_dealerId_and_fetchedAt", (q) =>
        q.eq("dealerId", args.dealerId)
      )
      .order("desc")
      .take(500);

    const latestByProduct = new Map<
      Id<"canonicalProducts">,
      (typeof listings)[number]
    >();
    for (const listing of listings) {
      if (!latestByProduct.has(listing.canonicalProductId)) {
        latestByProduct.set(listing.canonicalProductId, listing);
      }
    }

    const results = [];
    for (const listing of latestByProduct.values()) {
      const product = await ctx.db.get(listing.canonicalProductId);
      if (!product) continue;

      results.push({
        ...listing,
        product: {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          metalType: product.metalType,
          weightGrams: product.weightGrams,
          weightTroyOz: product.weightTroyOz,
          purity: product.purity,
          productType: product.productType,
          imageUrls: product.imageUrls
        }
      });
    }

    return results;
  }
});

// ---------------------------------------------------------------------------
// Seed: generate fake dealerListings for every product × dealer pair
// ---------------------------------------------------------------------------

/**
 * Simple deterministic hash for reproducible "random" numbers from strings.
 * Returns a float in [0, 1).
 */
function seededRand(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  h = ((h >>> 0) * 2654435761) >>> 0;
  return (h & 0x7fffffff) / 0x80000000;
}

/** Return a float in [lo, hi) using the seed string. */
function randBetween(seed: string, lo: number, hi: number): number {
  return lo + seededRand(seed) * (hi - lo);
}

const FALLBACK_SPOT_XAU = 2900;
const FALLBACK_SPOT_XAG = 32;

interface PremiumRange {
  buyLo: number;
  buyHi: number;
  sellLo: number;
  sellHi: number;
}

const PREMIUM_RANGES: Record<string, Record<string, PremiumRange>> = {
  XAU: {
    coin: { buyLo: 3.0, buyHi: 8.5, sellLo: -3.5, sellHi: -0.5 },
    bar: { buyLo: 1.0, buyHi: 5.0, sellLo: -2.5, sellHi: -0.3 },
    round: { buyLo: 2.5, buyHi: 7.0, sellLo: -3.0, sellHi: -0.8 }
  },
  XAG: {
    coin: { buyLo: 15.0, buyHi: 32.0, sellLo: -8.0, sellHi: -2.0 },
    bar: { buyLo: 8.0, buyHi: 22.0, sellLo: -6.0, sellHi: -1.5 },
    round: { buyLo: 12.0, buyHi: 28.0, sellLo: -7.0, sellHi: -2.0 }
  }
};

const SHIPPING_OPTIONS = [0, 4.95, 7.5, 9.95, 12.5, 14.95, 19.95];
const DELIVERY_OPTIONS = [1, 2, 3, 5, 7, 10, 14];

/**
 * Idempotent seed: wipes existing listings, then creates one listing
 * per dealer × product pair with realistic dummy pricing.
 *
 *   npx convex run internal.listings.seedListings
 */
export const seedListings = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Wipe existing listings (batch of 200 at a time)
    let deleted = 0;
    for (;;) {
      const batch = await ctx.db.query("dealerListings").take(200);
      if (batch.length === 0) break;
      for (const row of batch) {
        await ctx.db.delete(row._id);
        deleted++;
      }
    }

    // Fetch all dealers and products
    const dealers = await ctx.db.query("dealers").take(100);
    const products = await ctx.db.query("canonicalProducts").take(100);

    // Get latest spot or use fallback
    const latestPriceRows = await ctx.db
      .query("metalDailyPrices")
      .withIndex("by_base_and_date")
      .order("desc")
      .take(1);
    const latestPrice = latestPriceRows[0];

    const spotXau = latestPrice?.eurPerTroyOzXau ?? FALLBACK_SPOT_XAU;
    const spotXag = latestPrice?.eurPerTroyOzXag ?? FALLBACK_SPOT_XAG;

    const now = Date.now();
    let inserted = 0;

    for (const dealer of dealers) {
      for (const product of products) {
        const key = `${dealer.slug}:${product.slug}`;

        // ~15% of product×dealer combos are skipped (dealer doesn't carry it)
        if (seededRand(`skip:${key}`) < 0.15) continue;

        const spotPerOz = product.metalType === "XAU" ? spotXau : spotXag;
        const meltValue = spotPerOz * product.weightTroyOz;

        const ranges =
          PREMIUM_RANGES[product.metalType]?.[product.productType] ??
          PREMIUM_RANGES.XAU.coin;

        const buyPremiumPct = randBetween(
          `buyPrem:${key}`,
          ranges.buyLo,
          ranges.buyHi
        );
        const buyPrice =
          Math.round(meltValue * (1 + buyPremiumPct / 100) * 100) / 100;

        // ~25% of dealers don't offer sell-back for this product
        const hasSellPrice = seededRand(`hasSell:${key}`) > 0.25;
        let sellPrice: number | undefined;
        let sellPremiumPct: number | undefined;
        if (hasSellPrice) {
          sellPremiumPct = randBetween(
            `sellPrem:${key}`,
            ranges.sellLo,
            ranges.sellHi
          );
          sellPrice =
            Math.round(meltValue * (1 + sellPremiumPct / 100) * 100) / 100;
        }

        const shippingIdx = Math.floor(
          seededRand(`ship:${key}`) * SHIPPING_OPTIONS.length
        );
        const shippingCostFrom = SHIPPING_OPTIONS[shippingIdx];

        const deliveryIdx = Math.floor(
          seededRand(`deliv:${key}`) * DELIVERY_OPTIONS.length
        );
        const deliveryTimeDays = DELIVERY_OPTIONS[deliveryIdx];

        const inStock = seededRand(`stock:${key}`) > 0.12;

        // Jitter fetchedAt within the last 6 hours
        const fetchedAt =
          now - Math.floor(seededRand(`fetch:${key}`) * 6 * 60 * 60 * 1000);

        const sourceUrl = `${dealer.websiteUrl}/products/${product.slug}`;

        await ctx.db.insert("dealerListings", {
          dealerId: dealer._id,
          canonicalProductId: product._id,
          buyPrice,
          sellPrice,
          buySpotPremiumPercent: Math.round(buyPremiumPct * 100) / 100,
          sellSpotPremiumPercent:
            sellPremiumPct !== undefined
              ? Math.round(sellPremiumPct * 100) / 100
              : undefined,
          shippingCostFrom: shippingCostFrom > 0 ? shippingCostFrom : undefined,
          deliveryTimeDays,
          inStock,
          sourceUrl,
          fetchedAt
        });
        inserted++;
      }
    }

    return {
      deleted,
      inserted,
      dealers: dealers.length,
      products: products.length
    };
  }
});
