type ProvinceReference = {
  name: string;
  latitude: number;
  longitude: number;
};

/**
 * Province reference points are derived from GeoNames' Türkiye ADM1 dataset
 * (CC BY 4.0, https://www.geonames.org/, retrieved 2026-08-01).
 * They are deliberately server-only, small and dependency-free: browser
 * coordinates are reduced to a province before analytics persistence.
 */
const TURKEY_PROVINCES: readonly ProvinceReference[] = [
  { name: 'Adana', latitude: 36.985, longitude: 35.28809 },
  { name: 'Adıyaman', latitude: 37.75, longitude: 38.25 },
  { name: 'Afyonkarahisar', latitude: 38.75, longitude: 30.66667 },
  { name: 'Ağrı', latitude: 39.66667, longitude: 43.16667 },
  { name: 'Aksaray', latitude: 38.36503, longitude: 34.0142 },
  { name: 'Amasya', latitude: 40.72619, longitude: 35.8867 },
  { name: 'Ankara', latitude: 39.92063, longitude: 32.85403 },
  { name: 'Antalya', latitude: 36.76984, longitude: 31.90215 },
  { name: 'Ardahan', latitude: 41.08333, longitude: 42.83333 },
  { name: 'Artvin', latitude: 41.16667, longitude: 41.83333 },
  { name: 'Aydın', latitude: 37.75, longitude: 28 },
  { name: 'Balıkesir', latitude: 39.75, longitude: 28 },
  { name: 'Bartın', latitude: 41.58333, longitude: 32.5 },
  { name: 'Batman', latitude: 38, longitude: 41.33333 },
  { name: 'Bayburt', latitude: 40.25943, longitude: 40.22624 },
  { name: 'Bilecik', latitude: 40, longitude: 30.16667 },
  { name: 'Bingöl', latitude: 39.08333, longitude: 40.83333 },
  { name: 'Bitlis', latitude: 38.34201, longitude: 42.39134 },
  { name: 'Bolu', latitude: 40.64131, longitude: 31.58216 },
  { name: 'Burdur', latitude: 37.5, longitude: 30 },
  { name: 'Bursa', latitude: 40.14201, longitude: 29.15672 },
  { name: 'Çanakkale', latitude: 40.08333, longitude: 26.83333 },
  { name: 'Çankırı', latitude: 40.66667, longitude: 33.41667 },
  { name: 'Çorum', latitude: 40.5, longitude: 34.75 },
  { name: 'Denizli', latitude: 37.84016, longitude: 29.06982 },
  { name: 'Diyarbakır', latitude: 37.96152, longitude: 40.23193 },
  { name: 'Düzce', latitude: 40.83333, longitude: 31.16667 },
  { name: 'Edirne', latitude: 41.25, longitude: 26.66667 },
  { name: 'Elazığ', latitude: 38.73695, longitude: 39.17725 },
  { name: 'Erzincan', latitude: 39.75, longitude: 39.5 },
  { name: 'Erzurum', latitude: 40, longitude: 41.5 },
  { name: 'Eskişehir', latitude: 39.66667, longitude: 31.16667 },
  { name: 'Gaziantep', latitude: 37.08333, longitude: 37.33333 },
  { name: 'Giresun', latitude: 40.5, longitude: 38.5 },
  { name: 'Gümüşhane', latitude: 40.25, longitude: 39.58333 },
  { name: 'Hakkâri', latitude: 37.58333, longitude: 44.16667 },
  { name: 'Hatay', latitude: 36.5, longitude: 36.25 },
  { name: 'Iğdır', latitude: 39.91667, longitude: 44 },
  { name: 'Isparta', latitude: 38, longitude: 31 },
  { name: 'İstanbul', latitude: 41.03508, longitude: 28.98331 },
  { name: 'İzmir', latitude: 38.46219, longitude: 27.09229 },
  { name: 'Kahramanmaraş', latitude: 38, longitude: 37 },
  { name: 'Karabük', latitude: 41.25, longitude: 32.5 },
  { name: 'Karaman', latitude: 37.08333, longitude: 33.25 },
  { name: 'Kars', latitude: 40.41667, longitude: 43.08333 },
  { name: 'Kastamonu', latitude: 41.5, longitude: 33.66667 },
  { name: 'Kayseri', latitude: 38.73695, longitude: 35.49683 },
  { name: 'Kilis', latitude: 36.73, longitude: 37.14 },
  { name: 'Kırıkkale', latitude: 39.83333, longitude: 33.75 },
  { name: 'Kırklareli', latitude: 41.66667, longitude: 27.5 },
  { name: 'Kırşehir', latitude: 39.33333, longitude: 34.16667 },
  { name: 'Kocaeli', latitude: 40.91667, longitude: 29.91667 },
  { name: 'Konya', latitude: 38.16667, longitude: 32.5 },
  { name: 'Kütahya', latitude: 39.25, longitude: 29.5 },
  { name: 'Malatya', latitude: 38.5, longitude: 38 },
  { name: 'Manisa', latitude: 38.83333, longitude: 28.16667 },
  { name: 'Mardin', latitude: 37.31775, longitude: 40.71533 },
  { name: 'Mersin', latitude: 36.86204, longitude: 34.65088 },
  { name: 'Muğla', latitude: 37.23033, longitude: 28.35571 },
  { name: 'Muş', latitude: 39, longitude: 41.75 },
  { name: 'Nevşehir', latitude: 38.91667, longitude: 34.66667 },
  { name: 'Niğde', latitude: 37.83333, longitude: 34.75 },
  { name: 'Ordu', latitude: 40.90858, longitude: 37.68448 },
  { name: 'Osmaniye', latitude: 37.23525, longitude: 36.24596 },
  { name: 'Rize', latitude: 40.90443, longitude: 40.89489 },
  { name: 'Sakarya', latitude: 40.75, longitude: 30.58333 },
  { name: 'Samsun', latitude: 41.25, longitude: 36.33333 },
  { name: 'Siirt', latitude: 37.96152, longitude: 41.9458 },
  { name: 'Sinop', latitude: 41.77106, longitude: 34.87095 },
  { name: 'Sivas', latitude: 39.79165, longitude: 37.00195 },
  { name: 'Şanlıurfa', latitude: 37.21283, longitude: 38.78174 },
  { name: 'Şırnak', latitude: 37.5, longitude: 42.5 },
  { name: 'Tekirdağ', latitude: 41, longitude: 27.5 },
  { name: 'Tokat', latitude: 40.41667, longitude: 36.58333 },
  { name: 'Trabzon', latitude: 40.86946, longitude: 39.81255 },
  { name: 'Tunceli', latitude: 39.10711, longitude: 39.54749 },
  { name: 'Uşak', latitude: 38.5, longitude: 29.41667 },
  { name: 'Van', latitude: 38.40736, longitude: 43.71779 },
  { name: 'Yalova', latitude: 40.58333, longitude: 29.16667 },
  { name: 'Yozgat', latitude: 39.58333, longitude: 35.33333 },
  { name: 'Zonguldak', latitude: 41.25, longitude: 31.83333 },
] as const;

const TURKEY_PROVINCES_BY_ISO_SUBDIVISION = new Map(
  [
    'Adana',
    'Adıyaman',
    'Afyonkarahisar',
    'Ağrı',
    'Amasya',
    'Ankara',
    'Antalya',
    'Artvin',
    'Aydın',
    'Balıkesir',
    'Bilecik',
    'Bingöl',
    'Bitlis',
    'Bolu',
    'Burdur',
    'Bursa',
    'Çanakkale',
    'Çankırı',
    'Çorum',
    'Denizli',
    'Diyarbakır',
    'Edirne',
    'Elazığ',
    'Erzincan',
    'Erzurum',
    'Eskişehir',
    'Gaziantep',
    'Giresun',
    'Gümüşhane',
    'Hakkâri',
    'Hatay',
    'Isparta',
    'Mersin',
    'İstanbul',
    'İzmir',
    'Kars',
    'Kastamonu',
    'Kayseri',
    'Kırklareli',
    'Kırşehir',
    'Kocaeli',
    'Konya',
    'Kütahya',
    'Malatya',
    'Manisa',
    'Kahramanmaraş',
    'Mardin',
    'Muğla',
    'Muş',
    'Nevşehir',
    'Niğde',
    'Ordu',
    'Rize',
    'Sakarya',
    'Samsun',
    'Siirt',
    'Sinop',
    'Sivas',
    'Tekirdağ',
    'Tokat',
    'Trabzon',
    'Tunceli',
    'Şanlıurfa',
    'Uşak',
    'Van',
    'Yozgat',
    'Zonguldak',
    'Aksaray',
    'Bayburt',
    'Karaman',
    'Kırıkkale',
    'Batman',
    'Şırnak',
    'Bartın',
    'Ardahan',
    'Iğdır',
    'Yalova',
    'Karabük',
    'Kilis',
    'Osmaniye',
    'Düzce',
  ].map((name, index) => [String(index + 1).padStart(2, '0'), name])
);

function foldTurkishProvinceName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ğ/gi, 'g')
    .replace(/ş/gi, 's')
    .replace(/ç/gi, 'c')
    .replace(/ö/gi, 'o')
    .replace(/ü/gi, 'u')
    .replace(/â/gi, 'a')
    .replace(/î/gi, 'i')
    .replace(/û/gi, 'u')
    .replace(/[^a-z0-9]/gi, '')
    .toLocaleLowerCase('en-US');
}

const TURKEY_PROVINCES_BY_NAME = new Map(
  TURKEY_PROVINCES.map((province) => [
    foldTurkishProvinceName(province.name),
    province.name,
  ])
);

/** Normalizes Vercel's ISO 3166-2 subdivision value (for example 73/TR-73). */
export function normalizeTurkeyProvinceRegion(
  value: string | null | undefined
): string | null {
  const candidate = value?.trim() || '';
  if (!candidate) return null;

  const withoutCountry = candidate
    .toUpperCase()
    .replace(/^TR[-_\s]?/, '');
  const subdivision = /^\d{1,2}$/.test(withoutCountry)
    ? withoutCountry.padStart(2, '0')
    : withoutCountry;
  const bySubdivision = TURKEY_PROVINCES_BY_ISO_SUBDIVISION.get(subdivision);
  if (bySubdivision) return bySubdivision;

  return TURKEY_PROVINCES_BY_NAME.get(foldTurkishProvinceName(candidate)) || null;
}

const MAX_PROVINCE_REFERENCE_DISTANCE_KM = 175;

function haversineDistanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const startLatitude = radians(latitudeA);
  const endLatitude = radians(latitudeB);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export type TurkeyNetworkProvinceResolution = {
  province: string;
  distanceKm: number;
};

/**
 * Resolves an IP-derived edge coordinate only to a province. IP coordinates
 * are network centroids, not device positions, so district inference would
 * overstate their precision.
 */
export function resolveTurkeyNetworkProvince(
  latitude: number,
  longitude: number
): TurkeyNetworkProvinceResolution | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < 35.5 ||
    latitude > 42.3 ||
    longitude < 25.4 ||
    longitude > 45.1
  ) {
    return null;
  }

  let nearest: ProvinceReference | null = null;
  let nearestDistanceKm = Number.POSITIVE_INFINITY;
  for (const province of TURKEY_PROVINCES) {
    const distanceKm = haversineDistanceKm(
      latitude,
      longitude,
      province.latitude,
      province.longitude
    );
    if (distanceKm < nearestDistanceKm) {
      nearest = province;
      nearestDistanceKm = distanceKm;
    }
  }

  if (!nearest || nearestDistanceKm > MAX_PROVINCE_REFERENCE_DISTANCE_KM) {
    return null;
  }

  return {
    province: nearest.name,
    distanceKm: Math.round(nearestDistanceKm),
  };
}
