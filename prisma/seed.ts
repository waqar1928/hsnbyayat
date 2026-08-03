import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import { DEFAULT_SETTINGS } from "../src/lib/settings";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL || "");
const prisma = new PrismaClient({ adapter });

// Top-level categories and their subcategories — admin-manageable from
// Admin → Categories after seeding. Order here becomes the default
// sortOrder (nav order, best-seller tab order, etc).
const CATEGORY_DEFS = [
  { name: "Tops", subcategories: ["Tees", "Fleece", "Layers"] },
  { name: "Bottoms", subcategories: ["Trousers", "Shorts"] },
  { name: "Accessories", subcategories: ["Caps", "Bags", "Socks"] },
];

// Ported 1:1 from the PRODUCTS array in threadform-store.html — names, prices,
// descriptions, categories, sizes and sale data are unchanged. `type`/`color`
// map to the new Product.placeholderType / placeholderColor fields, which
// drive the SVG fallback rendered until real photos are uploaded.
const PRODUCTS = [
  {
    name: "Boxy Tee — Bone", group: "Tops", sub: "Tees", type: "tee", price: 2450, salePct: null,
    badge: "BestSeller", color: "#EDE8DC", sizes: ["S", "M", "L", "XL"], best: true,
    desc: "Heavyweight 240 GSM combed cotton with a boxy cut and drop shoulder. Pre-shrunk, garment-dyed, made to be a daily default.",
  },
  {
    name: "Boxy Tee — Ink", group: "Tops", sub: "Tees", type: "tee", price: 2450, salePct: null,
    badge: null, color: "#2A2A28", sizes: ["S", "M", "L", "XL"], best: true,
    desc: "The same 240 GSM boxy tee in deep ink black. Holds its shape and colour wash after wash.",
  },
  {
    name: "Boxy Tee — Indigo", group: "Tops", sub: "Tees", type: "tee", price: 2450, salePct: null,
    badge: "New", color: "#2A3B7D", sizes: ["S", "M", "L", "XL"], best: false,
    desc: "Dyed in our signature indigo. Slight fade over time is part of the character.",
  },
  {
    name: "Heavy Hoodie — Stone", group: "Tops", sub: "Fleece", type: "fleece", price: 5900, salePct: null,
    badge: "New", color: "#B9B4A6", sizes: ["S", "M", "L", "XL"], best: true,
    desc: "420 GSM brushed-back fleece with a double-layer hood and hidden phone pocket. Built for Lahore winters.",
  },
  {
    name: "Heavy Hoodie — Indigo", group: "Tops", sub: "Fleece", type: "fleece", price: 5900, salePct: null,
    badge: null, color: "#2A3B7D", sizes: ["M", "L", "XL"], best: false,
    desc: "Our heaviest hoodie in deep indigo. Ribbed cuffs, reinforced kangaroo pocket.",
  },
  {
    name: "Crew Sweat — Ash", group: "Tops", sub: "Fleece", type: "crew", price: 4800, salePct: 20,
    badge: null, color: "#9B988E", sizes: ["S", "M", "L", "XL"], best: true,
    desc: "380 GSM loopback crew with raglan sleeves. Wear over a tee or under an overshirt.",
  },
  {
    name: "Overshirt — Sand", group: "Tops", sub: "Layers", type: "layer", price: 6400, salePct: null,
    badge: null, color: "#C9B48C", sizes: ["S", "M", "L"], best: false,
    desc: "Cotton canvas overshirt with corozo buttons and two chest pockets. A third layer that works ten months a year.",
  },
  {
    name: "Overshirt — Olive", group: "Tops", sub: "Layers", type: "layer", price: 6400, salePct: 30,
    badge: null, color: "#5B5F46", sizes: ["M", "L", "XL"], best: false,
    desc: "The same canvas overshirt in faded olive. Softens beautifully with wear.",
  },
  {
    name: "Straight Trouser — Char", group: "Bottoms", sub: "Trousers", type: "pant", price: 4200, salePct: null,
    badge: "BestSeller", color: "#4C4A42", sizes: ["30", "32", "34", "36"], best: true,
    desc: "Midweight cotton twill with a clean straight leg, single pleat and hidden drawcord. Office to airport.",
  },
  {
    name: "Straight Trouser — Sand", group: "Bottoms", sub: "Trousers", type: "pant", price: 4200, salePct: null,
    badge: null, color: "#C4B69A", sizes: ["30", "32", "34", "36"], best: false,
    desc: "The straight trouser in warm sand twill. Pairs with every tee we make.",
  },
  {
    name: "Wide Short — Stone", group: "Bottoms", sub: "Shorts", type: "short", price: 3100, salePct: null,
    badge: "New", color: "#8A8474", sizes: ["30", "32", "34"], best: true,
    desc: "Above-the-knee wide short in garment-washed twill. Deep pockets, elastic back waist.",
  },
  {
    name: "Wide Short — Ink", group: "Bottoms", sub: "Shorts", type: "short", price: 3100, salePct: 25,
    badge: null, color: "#2A2A28", sizes: ["30", "32", "34"], best: false,
    desc: "The wide short in ink black. Summer uniform material.",
  },
  {
    name: "Field Cap", group: "Accessories", sub: "Caps", type: "cap", price: 1800, salePct: null,
    badge: null, color: "#4C4A42", sizes: ["One size"], best: true,
    desc: "Six-panel cotton twill cap with a brass slider. Unstructured crown, pre-curved brim.",
  },
  {
    name: "Field Cap — Indigo", group: "Accessories", sub: "Caps", type: "cap", price: 1800, salePct: 25,
    badge: null, color: "#2A3B7D", sizes: ["One size"], best: false,
    desc: "The field cap in indigo twill with tonal stitching.",
  },
  {
    name: "Canvas Tote", group: "Accessories", sub: "Bags", type: "tote", price: 2200, salePct: null,
    badge: "New", color: "#DDD5C0", sizes: ["One size"], best: true,
    desc: "16 oz natural canvas tote with reinforced handles and an inner zip pocket. Carries groceries or a laptop.",
  },
  {
    name: "Everyday Socks — 3 pack", group: "Accessories", sub: "Socks", type: "sock", price: 1500, salePct: null,
    badge: null, color: "#9B988E", sizes: ["One size"], best: false,
    desc: "Ribbed cotton crew socks in bone, ash and ink. Reinforced heel and toe.",
  },
] as const;

// Stock quantities cycle through this pattern per product so the seeded store
// demonstrates every UI state: plenty in stock, "only N left" (<3), and out of stock.
const STOCK_CYCLE = [14, 2, 8, 0, 6, 11, 1, 4];

async function main() {
  // --- Admin user ---
  const adminEmail = process.env.ADMIN_EMAIL || "admin@hsnbyayat.pk";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const adminName = process.env.ADMIN_NAME || "HSN BY AYAT Admin";
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, passwordHash, name: adminName },
    update: { passwordHash, name: adminName },
  });
  console.log(`Admin user ready: ${adminEmail}`);

  // --- Settings defaults ---
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: serialized },
      update: {}, // don't clobber settings an admin may have already edited
    });
  }
  console.log(`Seeded ${Object.keys(DEFAULT_SETTINGS).length} settings`);

  // --- Categories & subcategories ---
  const categoryIdByName = new Map<string, string>();
  const subcategoryIdByKey = new Map<string, string>(); // `${categoryName}::${subName}`

  for (let ci = 0; ci < CATEGORY_DEFS.length; ci++) {
    const def = CATEGORY_DEFS[ci];
    const slug = slugify(def.name);
    const category = await prisma.category.upsert({
      where: { slug },
      create: { name: def.name, slug, sortOrder: ci },
      update: { name: def.name },
    });
    categoryIdByName.set(def.name, category.id);

    for (let si = 0; si < def.subcategories.length; si++) {
      const subName = def.subcategories[si];
      const subSlug = slugify(subName);
      const subcategory = await prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: category.id, slug: subSlug } },
        create: { categoryId: category.id, name: subName, slug: subSlug, sortOrder: si },
        update: { name: subName },
      });
      subcategoryIdByKey.set(`${def.name}::${subName}`, subcategory.id);
    }
  }
  console.log(`Seeded ${CATEGORY_DEFS.length} categories with subcategories`);

  // --- Products, variants, sale pricing ---
  let stockCursor = 0;
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const slug = slugify(p.name);
    const salePrice = p.salePct ? Math.round(p.price * (1 - p.salePct / 100)) : null;
    const categoryId = categoryIdByName.get(p.group)!;
    const subcategoryId = subcategoryIdByKey.get(`${p.group}::${p.sub}`)!;

    const product = await prisma.product.upsert({
      where: { slug },
      create: {
        name: p.name,
        slug,
        description: p.desc,
        categoryId,
        subcategoryId,
        price: p.price,
        salePrice,
        salePct: p.salePct,
        badge: p.badge as "New" | "BestSeller" | null,
        isBestSeller: p.best,
        isActive: true,
        placeholderType: p.type,
        placeholderColor: p.color,
      },
      update: {
        description: p.desc,
        categoryId,
        subcategoryId,
        price: p.price,
        salePrice,
        salePct: p.salePct,
        badge: p.badge as "New" | "BestSeller" | null,
        isBestSeller: p.best,
        placeholderType: p.type,
        placeholderColor: p.color,
      },
    });

    for (const size of p.sizes) {
      const sku = `TF-${String(i + 1).padStart(4, "0")}-${size.replace(/\s+/g, "").toUpperCase()}`;
      const stockQty = STOCK_CYCLE[stockCursor % STOCK_CYCLE.length];
      stockCursor++;
      await prisma.variant.upsert({
        where: { productId_size: { productId: product.id, size } },
        create: { productId: product.id, size, sku, stockQty },
        update: { stockQty },
      });
    }
  }
  console.log(`Seeded ${PRODUCTS.length} products with variants`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
