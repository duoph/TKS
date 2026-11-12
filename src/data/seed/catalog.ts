import type { Category, Product } from "../types";

export const seedCategories: Category[] = [
  { id: "live", code: "LIVE", name: "Live Broiler", isLive: true },
  { id: "wsb", code: "WS B", name: "With Skin, With Bone", isLive: false },
  { id: "wsbl", code: "WS BL", name: "With Skin, Boneless", isLive: false },
  { id: "slb", code: "SL B", name: "Skinless, With Bone", isLive: false },
  { id: "slbl", code: "SL BL", name: "Skinless, Boneless", isLive: false },
  { id: "parts", code: "PARTS", name: "Chicken Parts", isLive: false },
  { id: "bone", code: "BONE", name: "Bones", isLive: false },
];

/** [categoryId, code, name, retail, wholesale, stockKg, lowStockKg, stockBirds?] */
type Row = [string, string, string, number, number, number, number, number?];

const rows: Row[] = [
  ["live", "LV-SB", "Small Bird", 135, 128, 798.4, 300, 420],
  ["live", "LV-BB", "Big Bird", 130, 122, 837.2, 300, 310],

  ["wsb", "WSB-CC", "Curry Cut", 215, 200, 38.45, 15],
  ["wsb", "WSB-BC", "Biriyani Cut", 220, 205, 24.3, 12],
  ["wsb", "WSB-CH", "Chilly Cut", 225, 210, 11.25, 8],
  ["wsb", "WSB-WC", "Whole Chicken", 205, 190, 19.8, 10],
  ["wsb", "WSB-GC", "Grill Chicken", 230, 215, 6.4, 8],

  ["wsbl", "WSBL-CC", "Curry Cut", 330, 310, 9.15, 6],
  ["wsbl", "WSBL-BC", "Biriyani Cut", 335, 315, 7.6, 5],
  ["wsbl", "WSBL-CH", "Chilly Cut", 340, 320, 5.85, 5],
  ["wsbl", "WSBL-SH", "Shawarma", 350, 325, 12.4, 8],

  ["slb", "SLB-CC", "Curry Cut", 245, 228, 31.7, 15],
  ["slb", "SLB-BC", "Biriyani Cut", 250, 232, 22.15, 12],
  ["slb", "SLB-CH", "Chilly Cut", 255, 238, 9.9, 8],
  ["slb", "SLB-TD", "Thanduri", 265, 245, 4.35, 6],
  ["slb", "SLB-WC", "Whole Chicken", 235, 218, 13.6, 8],

  ["slbl", "SLBL-CC", "Curry Cut", 380, 355, 11.2, 6],
  ["slbl", "SLBL-CH", "Chilly Cut", 385, 360, 6.75, 5],
  ["slbl", "SLBL-TK", "Tikka", 400, 375, 5.1, 4],
  ["slbl", "SLBL-KB", "Kebab", 400, 375, 2.85, 4],
  ["slbl", "SLBL-BR", "Breast Boneless", 420, 390, 16.9, 8],
  ["slbl", "SLBL-TH", "Thigh Boneless", 410, 380, 8.3, 6],
  ["slbl", "SLBL-SH", "Shawarma", 390, 360, 10.55, 8],
  ["slbl", "SLBL-KM", "Keema", 370, 345, 4.6, 4],
  ["slbl", "SLBL-PC", "Popcorn", 395, 365, 3.2, 3],

  ["parts", "PT-MX", "Mixed Parts", 110, 95, 7.4, 4],
  ["parts", "PT-GZ", "Gizzard", 140, 125, 5.9, 4],
  ["parts", "PT-HT", "Heart", 130, 115, 1.65, 2],
  ["parts", "PT-LV", "Liver", 120, 105, 6.8, 4],

  ["bone", "BN-NK", "Neck", 70, 60, 9.5, 5],
  ["bone", "BN-JN", "Janata", 50, 40, 14.2, 6],
];

/**
 * Product photos in /public/products, by product code. Where there is no photo
 * of the exact cut, the closest one is reused. Products not listed here show a
 * drawn illustration. Photos can be changed per product in Settings > Products.
 *
 * These are looked up when a product is shown, not saved with the product, so a
 * new photo here appears straight away without resetting the demo data.
 */
const PHOTOS: Record<string, string> = {
  "LV-SB": "live-small-bird",
  "LV-BB": "live-big-bird",
  "WSB-CC": "with-skin-curry-cut",
  "WSB-BC": "with-skin-curry-cut",
  "WSB-CH": "with-skin-curry-cut",
  "WSB-WC": "whole-chicken-skinless",
  "WSB-GC": "whole-chicken-skinless",
  "WSBL-CC": "boneless-pieces",
  "WSBL-BC": "boneless-pieces",
  "WSBL-CH": "boneless-cubes",
  "WSBL-SH": "boneless-pieces",
  "SLB-CC": "skinless-curry-cut",
  "SLB-BC": "skinless-biriyani-cut",
  "SLB-CH": "skinless-small-cut",
  "SLB-TD": "skinless-drumsticks",
  "SLB-WC": "whole-chicken-skinless",
  "SLBL-CC": "boneless-pieces",
  "SLBL-CH": "boneless-cubes",
  "SLBL-TK": "boneless-cubes",
  "SLBL-KB": "boneless-cubes",
  "SLBL-BR": "breast-boneless",
  "SLBL-TH": "boneless-pieces",
  "SLBL-SH": "boneless-pieces",
  "SLBL-KM": "keema",
  "SLBL-PC": "boneless-cubes",
  "PT-MX": "wings",
  "PT-GZ": "gizzard",
  "PT-LV": "liver",
  "BN-NK": "neck",
  "BN-JN": "janata-bones",
};

export const seedProducts: Product[] = rows.map(
  ([categoryId, code, name, retailPrice, wholesalePrice, stockKg, lowStockKg, stockBirds]) => ({
    id: code.toLowerCase(),
    name,
    categoryId,
    code,
    retailPrice,
    wholesalePrice,
    stockKg,
    lowStockKg,
    stockBirds,
    active: true,
  }),
);

/** The built-in photo for a product code, if there is one. */
export function defaultPhoto(code: string | undefined): string | undefined {
  const name = code ? PHOTOS[code.toUpperCase()] : undefined;
  return name ? `/products/${name}.jpg` : undefined;
}
