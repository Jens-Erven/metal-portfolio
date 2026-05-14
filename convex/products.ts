import { v } from "convex/values";

import { Doc } from "./_generated/dataModel";
import { internalMutation, MutationCtx, query } from "./_generated/server";

const metalTypeValidator = v.union(v.literal("XAU"), v.literal("XAG"));

const productTypeValidator = v.union(
  v.literal("coin"),
  v.literal("bar"),
  v.literal("round"),
);

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const list = query({
  args: {
    metalType: v.optional(metalTypeValidator),
    productType: v.optional(productTypeValidator),
  },
  handler: async (ctx, args) => {
    if (args.metalType && args.productType) {
      return await ctx.db
        .query("canonicalProducts")
        .withIndex("by_metalType_and_productType", (q) =>
          q.eq("metalType", args.metalType!).eq("productType", args.productType!),
        )
        .take(100);
    }

    if (args.metalType) {
      return await ctx.db
        .query("canonicalProducts")
        .withIndex("by_metalType", (q) => q.eq("metalType", args.metalType!))
        .take(100);
    }

    return await ctx.db.query("canonicalProducts").take(100);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("canonicalProducts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getById = query({
  args: { id: v.id("canonicalProducts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ---------------------------------------------------------------------------
// Internal mutations
// ---------------------------------------------------------------------------

async function upsertBySlug(
  ctx: MutationCtx,
  product: Omit<Doc<"canonicalProducts">, "_id" | "_creationTime">,
) {
  const existing = await ctx.db
    .query("canonicalProducts")
    .withIndex("by_slug", (q) => q.eq("slug", product.slug))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, product);
    return existing._id;
  }
  return await ctx.db.insert("canonicalProducts", product);
}

export const upsert = internalMutation({
  args: {
    slug: v.string(),
    name: v.string(),
    metalType: metalTypeValidator,
    weightGrams: v.number(),
    weightTroyOz: v.number(),
    purity: v.number(),
    productType: productTypeValidator,
    imageUrls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await upsertBySlug(ctx, args);
  },
});

// ---------------------------------------------------------------------------
// Seed data — top 24 gold & silver products traded in Benelux
// ---------------------------------------------------------------------------
//
// Weight fields represent **fine metal content** (pure gold/silver).
// E.g. Krugerrand 1oz contains exactly 1 troy oz (31.1035 g) of pure gold,
// even though the 22k alloy coin weighs ~33.93 g total.
// This keeps premium calculations simple: meltValue = spotPrice × weightTroyOz.

const TROY_OZ_GRAMS = 31.1035;

type SeedProduct = Omit<Doc<"canonicalProducts">, "_id" | "_creationTime">;

const SEED_PRODUCTS: SeedProduct[] = [
  // -------------------------------------------------------------------------
  // Gold coins
  // -------------------------------------------------------------------------
  {
    slug: "krugerrand-1oz-gold",
    name: "Krugerrand 1 oz",
    metalType: "XAU",
    weightGrams: TROY_OZ_GRAMS,
    weightTroyOz: 1,
    purity: 0.9167,
    productType: "coin",
  },
  {
    slug: "krugerrand-1-2oz-gold",
    name: "Krugerrand 1/2 oz",
    metalType: "XAU",
    weightGrams: TROY_OZ_GRAMS * 0.5,
    weightTroyOz: 0.5,
    purity: 0.9167,
    productType: "coin",
  },
  {
    slug: "krugerrand-1-4oz-gold",
    name: "Krugerrand 1/4 oz",
    metalType: "XAU",
    weightGrams: TROY_OZ_GRAMS * 0.25,
    weightTroyOz: 0.25,
    purity: 0.9167,
    productType: "coin",
  },
  {
    slug: "krugerrand-1-10oz-gold",
    name: "Krugerrand 1/10 oz",
    metalType: "XAU",
    weightGrams: TROY_OZ_GRAMS * 0.1,
    weightTroyOz: 0.1,
    purity: 0.9167,
    productType: "coin",
  },
  {
    slug: "maple-leaf-1oz-gold",
    name: "Maple Leaf 1 oz",
    metalType: "XAU",
    weightGrams: TROY_OZ_GRAMS,
    weightTroyOz: 1,
    purity: 0.9999,
    productType: "coin",
  },
  {
    slug: "philharmoniker-1oz-gold",
    name: "Wiener Philharmoniker 1 oz",
    metalType: "XAU",
    weightGrams: TROY_OZ_GRAMS,
    weightTroyOz: 1,
    purity: 0.9999,
    productType: "coin",
  },
  {
    slug: "britannia-1oz-gold",
    name: "Britannia 1 oz",
    metalType: "XAU",
    weightGrams: TROY_OZ_GRAMS,
    weightTroyOz: 1,
    purity: 0.9999,
    productType: "coin",
  },
  {
    slug: "american-eagle-1oz-gold",
    name: "American Eagle 1 oz",
    metalType: "XAU",
    weightGrams: TROY_OZ_GRAMS,
    weightTroyOz: 1,
    purity: 0.9167,
    productType: "coin",
  },
  {
    slug: "kangaroo-1oz-gold",
    name: "Kangaroo 1 oz",
    metalType: "XAU",
    weightGrams: TROY_OZ_GRAMS,
    weightTroyOz: 1,
    purity: 0.9999,
    productType: "coin",
  },

  // -------------------------------------------------------------------------
  // Gold bars
  // -------------------------------------------------------------------------
  {
    slug: "gold-bar-1oz",
    name: "Gold Bar 1 oz",
    metalType: "XAU",
    weightGrams: TROY_OZ_GRAMS,
    weightTroyOz: 1,
    purity: 0.9999,
    productType: "bar",
  },
  {
    slug: "gold-bar-50g",
    name: "Gold Bar 50 g",
    metalType: "XAU",
    weightGrams: 50,
    weightTroyOz: 50 / TROY_OZ_GRAMS,
    purity: 0.9999,
    productType: "bar",
  },
  {
    slug: "gold-bar-100g",
    name: "Gold Bar 100 g",
    metalType: "XAU",
    weightGrams: 100,
    weightTroyOz: 100 / TROY_OZ_GRAMS,
    purity: 0.9999,
    productType: "bar",
  },
  {
    slug: "gold-bar-250g",
    name: "Gold Bar 250 g",
    metalType: "XAU",
    weightGrams: 250,
    weightTroyOz: 250 / TROY_OZ_GRAMS,
    purity: 0.9999,
    productType: "bar",
  },
  {
    slug: "gold-bar-1kg",
    name: "Gold Bar 1 kg",
    metalType: "XAU",
    weightGrams: 1000,
    weightTroyOz: 1000 / TROY_OZ_GRAMS,
    purity: 0.9999,
    productType: "bar",
  },

  // -------------------------------------------------------------------------
  // Silver coins
  // -------------------------------------------------------------------------
  {
    slug: "maple-leaf-1oz-silver",
    name: "Maple Leaf 1 oz",
    metalType: "XAG",
    weightGrams: TROY_OZ_GRAMS,
    weightTroyOz: 1,
    purity: 0.9999,
    productType: "coin",
  },
  {
    slug: "philharmoniker-1oz-silver",
    name: "Wiener Philharmoniker 1 oz",
    metalType: "XAG",
    weightGrams: TROY_OZ_GRAMS,
    weightTroyOz: 1,
    purity: 0.999,
    productType: "coin",
  },
  {
    slug: "krugerrand-1oz-silver",
    name: "Krugerrand 1 oz",
    metalType: "XAG",
    weightGrams: TROY_OZ_GRAMS,
    weightTroyOz: 1,
    purity: 0.999,
    productType: "coin",
  },
  {
    slug: "britannia-1oz-silver",
    name: "Britannia 1 oz",
    metalType: "XAG",
    weightGrams: TROY_OZ_GRAMS,
    weightTroyOz: 1,
    purity: 0.999,
    productType: "coin",
  },
  {
    slug: "american-eagle-1oz-silver",
    name: "American Eagle 1 oz",
    metalType: "XAG",
    weightGrams: TROY_OZ_GRAMS,
    weightTroyOz: 1,
    purity: 0.999,
    productType: "coin",
  },
  {
    slug: "kangaroo-1oz-silver",
    name: "Kangaroo 1 oz",
    metalType: "XAG",
    weightGrams: TROY_OZ_GRAMS,
    weightTroyOz: 1,
    purity: 0.9999,
    productType: "coin",
  },

  // -------------------------------------------------------------------------
  // Silver bars
  // -------------------------------------------------------------------------
  {
    slug: "silver-bar-100g",
    name: "Silver Bar 100 g",
    metalType: "XAG",
    weightGrams: 100,
    weightTroyOz: 100 / TROY_OZ_GRAMS,
    purity: 0.999,
    productType: "bar",
  },
  {
    slug: "silver-bar-250g",
    name: "Silver Bar 250 g",
    metalType: "XAG",
    weightGrams: 250,
    weightTroyOz: 250 / TROY_OZ_GRAMS,
    purity: 0.999,
    productType: "bar",
  },
  {
    slug: "silver-bar-500g",
    name: "Silver Bar 500 g",
    metalType: "XAG",
    weightGrams: 500,
    weightTroyOz: 500 / TROY_OZ_GRAMS,
    purity: 0.999,
    productType: "bar",
  },
  {
    slug: "silver-bar-1kg",
    name: "Silver Bar 1 kg",
    metalType: "XAG",
    weightGrams: 1000,
    weightTroyOz: 1000 / TROY_OZ_GRAMS,
    purity: 0.999,
    productType: "bar",
  },
];

/**
 * Idempotent seed: inserts or updates the 24 initial canonical products.
 *
 *   npx convex run internal.products.seed
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ids: string[] = [];
    for (const product of SEED_PRODUCTS) {
      const id = await upsertBySlug(ctx, product);
      ids.push(id);
    }
    return { seeded: ids.length };
  },
});
