import { ConvexError, v } from "convex/values";

import { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  MutationCtx,
  query,
} from "./_generated/server";

const countryValidator = v.union(
  v.literal("BE"),
  v.literal("NL"),
  v.literal("LU"),
);

const ingestionTypeValidator = v.union(
  v.literal("feed"),
  v.literal("api"),
  v.literal("sitemap_scrape"),
  v.literal("manual"),
);

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const list = query({
  args: {
    country: v.optional(countryValidator),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.country) {
      const results = await ctx.db
        .query("dealers")
        .withIndex("by_country", (q) => q.eq("country", args.country!))
        .take(100);

      if (args.activeOnly) {
        return results.filter((d) => d.isActive);
      }
      return results;
    }

    if (args.activeOnly) {
      return await ctx.db
        .query("dealers")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .take(100);
    }

    return await ctx.db.query("dealers").take(100);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dealers")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getById = query({
  args: { id: v.id("dealers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ---------------------------------------------------------------------------
// Internal mutations
// ---------------------------------------------------------------------------

async function upsertBySlug(
  ctx: MutationCtx,
  dealer: Omit<Doc<"dealers">, "_id" | "_creationTime">,
) {
  const existing = await ctx.db
    .query("dealers")
    .withIndex("by_slug", (q) => q.eq("slug", dealer.slug))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, dealer);
    return existing._id;
  }
  return await ctx.db.insert("dealers", dealer);
}

export const upsert = internalMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    country: countryValidator,
    websiteUrl: v.string(),
    iconUrl: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    ingestionType: ingestionTypeValidator,
    feedUrl: v.optional(v.string()),
    sitemapUrl: v.optional(v.string()),
    isActive: v.boolean(),
    reliability: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await upsertBySlug(ctx, {
      ...args,
      lastIngestedAt: undefined,
    });
  },
});

export const updateLastIngestedAt = internalMutation({
  args: {
    id: v.id("dealers"),
    lastIngestedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const dealer = await ctx.db.get(args.id);
    if (!dealer) {
      throw new ConvexError(`Dealer ${args.id} not found`);
    }
    await ctx.db.patch(args.id, { lastIngestedAt: args.lastIngestedAt });
  },
});

export const setActive = internalMutation({
  args: {
    id: v.id("dealers"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const dealer = await ctx.db.get(args.id);
    if (!dealer) {
      throw new ConvexError(`Dealer ${args.id} not found`);
    }
    await ctx.db.patch(args.id, { isActive: args.isActive });
  },
});

// ---------------------------------------------------------------------------
// Seed data — 8 Benelux dealers with classified ingestion types
// ---------------------------------------------------------------------------

type SeedDealer = Omit<Doc<"dealers">, "_id" | "_creationTime">;

const SEED_DEALERS: SeedDealer[] = [
  // WordPress site. Verified sitemap index in robots.txt. Crawl-delay: 20.
  {
    name: "Goudwisselkantoor",
    slug: "goudwisselkantoor",
    country: "NL",
    websiteUrl: "https://www.goudwisselkantoor.nl",
    iconUrl: "https://www.goudwisselkantoor.nl/favicon.ico",
    logoUrl:
      "https://www.goudwisselkantoor.nl/wp-content/themes/goudwisselkantoor/ferrari/gwk-styleguide/img/nl/logo-1984.svg",
    ingestionType: "sitemap_scrape",
    sitemapUrl:
      "https://www.goudwisselkantoor.nl/sitemaps/sitemap-index-nl.xml",
    isActive: true,
    reliability: 5,
  },
  // Declared sitemap in robots.txt. Returns 500 to some bots (likely UA-gated).
  {
    name: "Hollandgold",
    slug: "hollandgold",
    country: "NL",
    websiteUrl: "https://www.hollandgold.nl",
    iconUrl:
      "https://www.hollandgold.nl/imgs/favicons_v2/apple-touch-icon.png",
    logoUrl: "https://www.hollandgold.nl/imgs/logo.svg",
    ingestionType: "sitemap_scrape",
    sitemapUrl: "https://www.hollandgold.nl/sitemap.xml",
    isActive: true,
    reliability: 5,
  },
  // Custom platform, real-time pricing (3 min refresh). No sitemap/feed found.
  {
    name: "The Silver Mountain",
    slug: "the-silver-mountain",
    country: "NL",
    websiteUrl: "https://www.thesilvermountain.nl",
    iconUrl:
      "https://www.thesilvermountain.nl/img/favicon/apple-touch-icon.png",
    ingestionType: "manual",
    isActive: true,
    reliability: 5,
  },
  // Drupal-based (Dropsolid). Was returning 503; needs manual product URL discovery.
  {
    name: "Europese Goudstandaard",
    slug: "europese-goudstandaard",
    country: "NL",
    websiteUrl: "https://www.europesegoudstandaard.nl",
    ingestionType: "manual",
    isActive: true,
    reliability: 5,
  },
  // Drupal 10 site (JS-rendered). No sitemap declared in robots.txt.
  {
    name: "Goud999",
    slug: "goud999",
    country: "BE",
    websiteUrl: "https://www.goud999.com",
    ingestionType: "manual",
    isActive: true,
    reliability: 5,
  },
  // Investment platform with sitemap declared in robots.txt. Likely has structured API.
  {
    name: "GoldRepublic",
    slug: "goldrepublic",
    country: "NL",
    websiteUrl: "https://www.goldrepublic.com",
    iconUrl: "https://www.goldrepublic.com/favicon.ico",
    logoUrl:
      "https://www.goldrepublic.com/s/img/layout/logo-goldrepublic-black.png",
    ingestionType: "api",
    sitemapUrl: "https://www.goldrepublic.com/sitemap.xml",
    isActive: true,
    reliability: 5,
  },
  // Magento store. Sitemap declared in robots.txt.
  {
    name: "Goudpensioen",
    slug: "goudpensioen",
    country: "NL",
    websiteUrl: "https://www.goudpensioen.nl",
    iconUrl:
      "https://www.goudpensioen.nl/media/favicon/default/favicon.ico",
    logoUrl:
      "https://www.goudpensioen.nl/static/frontend/bs_eren/bs_eren_gp/nl_NL/images/logo.svg",
    ingestionType: "sitemap_scrape",
    sitemapUrl: "https://www.goudpensioen.nl/sitemap.xml",
    isActive: true,
    reliability: 5,
  },
  // PrestaShop store. No sitemap declared in robots.txt.
  {
    name: "Goldsilver.be",
    slug: "goldsilver-be",
    country: "BE",
    websiteUrl: "https://www.goldsilver.be",
    iconUrl: "https://www.goldsilver.be/favicon.ico",
    logoUrl: "https://goldsilver.be/img/prestashop-1625131895.jpg",
    ingestionType: "manual",
    isActive: true,
    reliability: 5,
  },
];

/**
 * Idempotent seed: inserts or updates the 8 initial Benelux dealers.
 *
 *   npx convex run internal.dealers.seed
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ids: string[] = [];
    for (const dealer of SEED_DEALERS) {
      const id = await upsertBySlug(ctx, dealer);
      ids.push(id);
    }
    return { seeded: ids.length };
  },
});
