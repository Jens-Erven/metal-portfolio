import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const metalType = v.union(v.literal("XAU"), v.literal("XAG"));

const productType = v.union(
  v.literal("coin"),
  v.literal("bar"),
  v.literal("round"),
);

const ingestionType = v.union(
  v.literal("feed"),
  v.literal("api"),
  v.literal("sitemap_scrape"),
  v.literal("manual"),
);

const alertDirection = v.union(v.literal("below"), v.literal("above"));

export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.optional(v.boolean()),
  }),

  metalDailyPrices: defineTable({
    date: v.string(),
    base: v.literal("EUR"),
    eurPerTroyOzXau: v.number(),
    eurPerTroyOzXag: v.number(),
    usdPerEur: v.number(),
    usdPerTroyOzXau: v.number(),
    usdPerTroyOzXag: v.number(),
    source: v.optional(
      v.union(
        v.literal("metalpriceapi_timeframe"),
        v.literal("metalpriceapi_historical"),
      ),
    ),
    apiRefreshedAt: v.number(),
  }).index("by_base_and_date", ["base", "date"]),

  dealers: defineTable({
    name: v.string(),
    slug: v.string(),
    country: v.union(v.literal("BE"), v.literal("NL"), v.literal("LU")),
    websiteUrl: v.string(),
    iconUrl: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    ingestionType,
    feedUrl: v.optional(v.string()),
    sitemapUrl: v.optional(v.string()),
    isActive: v.boolean(),
    lastIngestedAt: v.optional(v.number()),
    reliability: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_country", ["country"])
    .index("by_isActive", ["isActive"]),

  canonicalProducts: defineTable({
    slug: v.string(),
    name: v.string(),
    metalType,
    weightGrams: v.number(),
    weightTroyOz: v.number(),
    purity: v.number(),
    productType,
    imageUrls: v.optional(v.array(v.string())),
  })
    .index("by_slug", ["slug"])
    .index("by_metalType", ["metalType"])
    .index("by_metalType_and_productType", ["metalType", "productType"]),

  dealerListings: defineTable({
    dealerId: v.id("dealers"),
    canonicalProductId: v.id("canonicalProducts"),
    buyPrice: v.number(),
    sellPrice: v.optional(v.number()),
    buySpotPremiumPercent: v.number(),
    sellSpotPremiumPercent: v.optional(v.number()),
    shippingCostFrom: v.optional(v.number()),
    deliveryTimeDays: v.optional(v.number()),
    inStock: v.boolean(),
    sourceUrl: v.string(),
    fetchedAt: v.number(),
  })
    .index("by_canonicalProductId_and_fetchedAt", [
      "canonicalProductId",
      "fetchedAt",
    ])
    .index("by_dealerId_and_fetchedAt", ["dealerId", "fetchedAt"])
    .index("by_dealerId_and_canonicalProductId", [
      "dealerId",
      "canonicalProductId",
    ]),

  priceAlerts: defineTable({
    userId: v.string(),
    canonicalProductId: v.id("canonicalProducts"),
    targetPrice: v.number(),
    direction: alertDirection,
    isActive: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_canonicalProductId_and_isActive", [
      "canonicalProductId",
      "isActive",
    ])
    .index("by_userId_and_isActive", ["userId", "isActive"]),
});
