import type { Category } from '@/lib/domain';

export const productTypes = [
  {"id": "earbuds", "label": "Earbuds", "categories": ["electronics"], "aliases": ["earbuds", "earbud", "earphones", "earphone", "airpods", "in ear", "in-ear"]},
  {"id": "headphones", "label": "Headphones", "categories": ["electronics"], "aliases": ["headphones", "headphone", "headset"]},
  {"id": "phone", "label": "Phone", "categories": ["electronics"], "aliases": ["phone", "smartphone", "iphone", "cellphone", "mobile phone"]},
  {"id": "tablet", "label": "Tablet", "categories": ["electronics"], "aliases": ["tablet", "ipad"]},
  {"id": "laptop", "label": "Laptop", "categories": ["electronics"], "aliases": ["laptop", "macbook", "notebook computer"]},
  {"id": "desktop", "label": "Desktop computer", "categories": ["electronics"], "aliases": ["desktop", "computer tower", "pc tower"]},
  {"id": "monitor", "label": "Monitor", "categories": ["electronics"], "aliases": ["monitor", "computer display"]},
  {"id": "camera", "label": "Camera", "categories": ["electronics"], "aliases": ["camera", "dslr", "mirrorless"]},
  {"id": "speaker", "label": "Speaker", "categories": ["electronics"], "aliases": ["speaker", "soundbar"]},
  {"id": "game-console", "label": "Game console", "categories": ["electronics"], "aliases": ["game console", "playstation", "xbox", "nintendo switch", "ps5", "ps4"]},
  {"id": "smartwatch", "label": "Smartwatch", "categories": ["electronics"], "aliases": ["smartwatch", "smart watch", "apple watch", "galaxy watch"]},
  {"id": "tv", "label": "TV", "categories": ["appliances", "electronics"], "aliases": ["tv", "television", "smart tv"]},
  {"id": "washing-machine", "label": "Washing machine", "categories": ["appliances"], "aliases": ["washing machine", "washer", "laundry machine"]},
  {"id": "refrigerator", "label": "Refrigerator", "categories": ["appliances"], "aliases": ["refrigerator", "fridge", "ref"]},
  {"id": "air-conditioner", "label": "Air conditioner", "categories": ["appliances"], "aliases": ["air conditioner", "air conditioning", "aircon", "air-con"]},
  {"id": "electric-fan", "label": "Electric fan", "categories": ["appliances"], "aliases": ["electric fan", "stand fan", "desk fan", "ceiling fan", "fan"]},
  {"id": "microwave", "label": "Microwave", "categories": ["appliances"], "aliases": ["microwave", "microwave oven"]},
  {"id": "oven", "label": "Oven", "categories": ["appliances"], "aliases": ["oven", "stove", "range cooker"]},
  {"id": "rice-cooker", "label": "Rice cooker", "categories": ["appliances"], "aliases": ["rice cooker"]},
  {"id": "vacuum", "label": "Vacuum cleaner", "categories": ["appliances"], "aliases": ["vacuum", "vacuum cleaner", "robot vacuum"]},
  {"id": "water-dispenser", "label": "Water dispenser", "categories": ["appliances"], "aliases": ["water dispenser", "water cooler"]},
  {"id": "shirt", "label": "Shirt", "categories": ["clothing"], "aliases": ["shirt", "t shirt", "tshirt", "tee"]},
  {"id": "polo", "label": "Polo", "categories": ["clothing"], "aliases": ["polo", "polo shirt"]},
  {"id": "jacket", "label": "Jacket", "categories": ["clothing"], "aliases": ["jacket", "hoodie", "coat"]},
  {"id": "dress", "label": "Dress", "categories": ["clothing"], "aliases": ["dress", "gown"]},
  {"id": "trousers", "label": "Trousers", "categories": ["clothing"], "aliases": ["trousers", "pants", "jeans"]},
  {"id": "shorts", "label": "Shorts", "categories": ["clothing"], "aliases": ["shorts"]},
  {"id": "shoes", "label": "Shoes", "categories": ["clothing"], "aliases": ["shoes", "shoe", "sneakers", "sneaker", "boots", "sandals"]},
  {"id": "bag", "label": "Bag", "categories": ["clothing"], "aliases": ["bag", "handbag", "backpack", "tote"]},
  {"id": "hat", "label": "Hat", "categories": ["clothing"], "aliases": ["hat", "cap", "beanie"]},
  {"id": "watch", "label": "Watch", "categories": ["clothing"], "aliases": ["watch", "wristwatch"]}
] as const;

export type ProductTypeId = typeof productTypes[number]['id'];
export function productTypesFor(category?: string | null) {
  return productTypes.filter(type => (type.categories as readonly string[]).includes(category || ''));
}
export function isProductType(value: string, category?: string | null) {
  return value === 'category' || productTypesFor(category).some(type => type.id === value);
}
function words(value: string) { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
/** Whole phrases only. Specific overlapping names win; separate competing objects stay neutral. */
export function suggestProductType(name?: string | null, category?: Category | string | null): ProductTypeId | undefined {
  const text = ' ' + words(name || '') + ' ';
  const matches: {id:ProductTypeId;start:number;end:number}[]=[];
  for (const type of productTypesFor(category)) for (const alias of type.aliases) {
    const phrase=' '+words(alias)+' ';
    for (let at=text.indexOf(phrase);at>=0;at=text.indexOf(phrase,at+1)) matches.push({id:type.id,start:at+1,end:at+phrase.length-1});
  }
  const specific=matches.filter(match=>!matches.some(other=>other.id!==match.id && other.start<=match.start && other.end>=match.end && other.end-other.start>match.end-match.start));
  const ids=[...new Set(specific.map(match=>match.id))];
  return ids.length===1 ? ids[0] : undefined;
}
export function resolvedProductType(category?: Category | null, name?: string | null, selected?: string | null): ProductTypeId | undefined {
  if (selected === 'category') return;
  if (selected && isProductType(selected, category)) return selected as ProductTypeId;
  // Unknown or incompatible saved IDs remain neutral rather than guessing over them.
  return selected ? undefined : suggestProductType(name, category);
}
