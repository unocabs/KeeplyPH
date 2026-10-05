import type { TemplateKey } from '@/features/templates';

// Stable identifiers are validated by migration 021.
export const motorcycleBrands = [
  { id: 'aprilia', label: "Aprilia", logo: '/motorcycle-brands/aprilia.webp' },
  { id: 'bajaj', label: "Bajaj", logo: '/motorcycle-brands/bajaj.webp' },
  { id: 'benelli', label: "Benelli", logo: '/motorcycle-brands/benelli.webp' },
  { id: 'benda', label: "Benda", logo: '/motorcycle-brands/benda.webp' },
  { id: 'beta', label: "Beta", logo: '/motorcycle-brands/beta.webp' },
  { id: 'bmw-motorrad', label: "BMW Motorrad", logo: '/motorcycle-brands/bmw-motorrad.webp' },
  { id: 'bristol', label: "Bristol", logo: '/motorcycle-brands/bristol.webp' },
  { id: 'bsa', label: "BSA", logo: '/motorcycle-brands/bsa.webp' },
  { id: 'cfmoto', label: "CFMOTO", logo: '/motorcycle-brands/cfmoto.webp' },
  { id: 'ducati', label: "Ducati", logo: '/motorcycle-brands/ducati.webp' },
  { id: 'ecooter', label: "Ecooter", logo: '/motorcycle-brands/ecooter.webp' },
  { id: 'euro', label: "Euro", logo: '/motorcycle-brands/euro.webp' },
  { id: 'fkm', label: "FKM", logo: '/motorcycle-brands/fkm.webp' },
  { id: 'harley-davidson', label: "Harley-Davidson", logo: '/motorcycle-brands/harley-davidson.webp' },
  { id: 'hatasu', label: "HATASU", logo: '/motorcycle-brands/hatasu.webp' },
  { id: 'hero', label: "Hero", logo: '/motorcycle-brands/hero.webp' },
  { id: 'honda', label: "Honda", logo: '/motorcycle-brands/honda.webp' },
  { id: 'husqvarna', label: "Husqvarna", logo: '/motorcycle-brands/husqvarna.webp' },
  { id: 'indian-motorcycle', label: "Indian Motorcycle", logo: '/motorcycle-brands/indian-motorcycle.webp' },
  { id: 'italjet', label: "Italjet", logo: '/motorcycle-brands/italjet.webp' },
  { id: 'kawasaki', label: "Kawasaki", logo: '/motorcycle-brands/kawasaki.webp' },
  { id: 'keeway', label: "Keeway", logo: '/motorcycle-brands/keeway.webp' },
  { id: 'kidlat', label: "Kidlat", logo: '/motorcycle-brands/kidlat.webp' },
  { id: 'kove', label: "KOVE", logo: '/motorcycle-brands/kove.webp' },
  { id: 'ktm', label: "KTM", logo: '/motorcycle-brands/ktm.webp' },
  { id: 'kymco', label: "KYMCO", logo: '/motorcycle-brands/kymco.webp' },
  { id: 'lambretta', label: "Lambretta", logo: '/motorcycle-brands/lambretta.webp' },
  { id: 'monarch', label: "Monarch", logo: '/motorcycle-brands/monarch.webp' },
  { id: 'morbidelli', label: "Morbidelli", logo: '/motorcycle-brands/morbidelli.webp' },
  { id: 'moto-guzzi', label: "Moto Guzzi", logo: '/motorcycle-brands/moto-guzzi.webp' },
  { id: 'moto-morini', label: "Moto Morini", logo: '/motorcycle-brands/moto-morini.webp' },
  { id: 'motoposh', label: "Motoposh", logo: '/motorcycle-brands/motoposh.webp' },
  { id: 'motorstar', label: "MotorStar", logo: '/motorcycle-brands/motorstar.webp' },
  { id: 'mv-agusta', label: "MV Agusta", logo: '/motorcycle-brands/mv-agusta.webp' },
  { id: 'nwow', label: "NWOW", logo: '/motorcycle-brands/nwow.webp' },
  { id: 'peugeot-motocycles', label: "Peugeot Motocycles", logo: '/motorcycle-brands/peugeot-motocycles.webp' },
  { id: 'qjmotor', label: "QJMOTOR", logo: '/motorcycle-brands/qjmotor.webp' },
  { id: 'royal-enfield', label: "Royal Enfield", logo: '/motorcycle-brands/royal-enfield.webp' },
  { id: 'rusi', label: "Rusi", logo: '/motorcycle-brands/rusi.webp' },
  { id: 'segway', label: "Segway", logo: '/motorcycle-brands/segway.webp' },
  { id: 'skygo', label: "Skygo", logo: '/motorcycle-brands/skygo.webp' },
  { id: 'sunra', label: "SUNRA", logo: '/motorcycle-brands/sunra.webp' },
  { id: 'suzuki', label: "Suzuki", logo: '/motorcycle-brands/suzuki.webp' },
  { id: 'sym', label: "SYM", logo: '/motorcycle-brands/sym.webp' },
  { id: 'triumph', label: "Triumph", logo: '/motorcycle-brands/triumph.webp' },
  { id: 'tvs', label: "TVS", logo: '/motorcycle-brands/tvs.webp' },
  { id: 'um', label: "UM", logo: '/motorcycle-brands/um.webp' },
  { id: 'ural', label: "Ural", logo: '/motorcycle-brands/ural.webp' },
  { id: 'vespa', label: "Vespa", logo: '/motorcycle-brands/vespa.webp' },
  { id: 'vinfast', label: "VinFast", logo: '/motorcycle-brands/vinfast.webp' },
  { id: 'voge', label: "VOGE", logo: '/motorcycle-brands/voge.webp' },
  { id: 'yamaha', label: "Yamaha", logo: '/motorcycle-brands/yamaha.webp' },
  { id: 'zeeho', label: "ZEEHO", logo: '/motorcycle-brands/zeeho.webp' },
  { id: 'zontes', label: "Zontes", logo: '/motorcycle-brands/zontes.webp' },
] as const;

export type MotorcycleBrandId = typeof motorcycleBrands[number]['id'] | 'other';
export function getMotorcycleBrand(value?: string | null) {
  return motorcycleBrands.find(brand => brand.id === value);
}
export function isMotorcycleBrand(value: string): value is MotorcycleBrandId {
  return value === 'other' || Boolean(getMotorcycleBrand(value));
}
export function supportsMotorcycleBrand(template: TemplateKey, preset?: string | null) {
  return template === 'motorcycle' || (template === 'other' && preset === 'motorcycle-loan');
}
