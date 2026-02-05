import { createLogger } from '../lib/logger';

const log = createLogger({ component: 'osmService' });

export interface LocationResult {
  countryCode: string;
  countryName: string;
  city: string;
  lat: number;
  lng: number;
  displayName: string;
  state?: string;
}

const PLACE_TYPES = new Set([
  'city',
  'town',
  'village',
  'hamlet',
  'municipality',
  'county',
  'state',
  'province',
  'region',
  'country',
  'island',
]);

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getPrimaryName = (
  address: NominatimResponse[number]['address'] | undefined,
  fallback: string
) =>
  address?.city ||
  address?.town ||
  address?.village ||
  address?.hamlet ||
  address?.municipality ||
  address?.county ||
  address?.island ||
  address?.state ||
  address?.country ||
  fallback;

const shouldKeepResult = (result: NominatimResponse[number]) => {
  const address = result.address ?? {};
  const placeType = result.addresstype ?? result.type ?? '';

  if (PLACE_TYPES.has(placeType)) return true;

  return Boolean(
    address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.municipality ||
      address.county ||
      address.island ||
      address.state ||
      address.country
  );
};

const rankResults = (data: NominatimResponse, query: string) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return data.filter(shouldKeepResult);

  const seen = new Set<string>();

  return data
    .filter(shouldKeepResult)
    .map((result) => {
      const primaryName = getPrimaryName(
        result.address,
        result.name || result.display_name
      );
      const normalizedPrimary = normalizeText(primaryName);
      const normalizedDisplay = normalizeText(result.display_name);
      let score = 0;

      if (normalizedPrimary === normalizedQuery) score += 1000;
      else if (normalizedDisplay.startsWith(normalizedQuery)) score += 800;
      else if (normalizedPrimary.startsWith(normalizedQuery)) score += 700;
      else if (normalizedDisplay.includes(` ${normalizedQuery} `)) score += 300;
      else if (normalizedDisplay.includes(normalizedQuery)) score += 200;

      if (typeof result.importance === 'number') {
        score += result.importance * 100;
      }

      score -= Math.min(normalizedPrimary.length, 40);

      return { result, score, primaryName };
    })
    .sort((a, b) => b.score - a.score)
    .filter(({ result, primaryName }) => {
      const key = `${result.lat}-${result.lon}-${primaryName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ result }) => result);
};

/**
 * Reverse geocode: get location details from coordinates
 */
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<LocationResult | null> => {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    addressdetails: '1',
    'accept-language': 'en',
  });

  const contactEmail = process.env.NEXT_PUBLIC_OSM_CONTACT_EMAIL as
    | string
    | undefined;
  if (contactEmail) {
    params.set('email', contactEmail);
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    if (!result || result.error) return null;

    const address = result.address ?? {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.municipality ||
      address.county ||
      address.island ||
      '';

    const countryName = address.country ?? '';
    const countryCode = address.country_code
      ? address.country_code.toUpperCase()
      : '';

    return {
      countryCode,
      countryName,
      city,
      state: address.state,
      lat: Number(result.lat),
      lng: Number(result.lon),
      displayName: result.display_name,
    };
  } catch {
    return null;
  }
};

type NominatimResponse = Array<{
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  class?: string;
  type?: string;
  addresstype?: string;
  importance?: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
    island?: string;
  };
}>;

/**
 * Query the OpenStreetMap Nominatim API for a location.
 * Keeps payload tiny and defers rate-limit handling to the caller.
 */
/**
 * Search for multiple location suggestions (autocomplete)
 */
export const searchLocationSuggestions = async (
  query: string,
  limit: number = 5
): Promise<LocationResult[]> => {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const expandedLimit = Math.min(Math.max(limit * 3, 12), 20);
  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(expandedLimit),
    'accept-language': 'en',
  });

  const contactEmail = process.env.NEXT_PUBLIC_OSM_CONTACT_EMAIL as
    | string
    | undefined;
  if (contactEmail) {
    params.set('email', contactEmail);
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      log.error('OSM suggestions failed', undefined, response.statusText);
      return [];
    }

    const data = (await response.json()) as NominatimResponse;

    const rankedResults = rankResults(data, trimmed).slice(0, limit);

    return rankedResults.map((result) => {
      const address = result.address ?? {};
      const city = getPrimaryName(
        address,
        result.name || result.display_name || trimmed
      );

      const countryName = address.country ?? '';
      const countryCode = address.country_code
        ? address.country_code.toUpperCase()
        : '';

      return {
        countryCode,
        countryName,
        city,
        lat: Number(result.lat),
        lng: Number(result.lon),
        displayName: result.display_name,
      };
    });
  } catch (error) {
    log.error('OSM suggestions error', undefined, error);
    return [];
  }
};

export const searchLocationOSM = async (
  query: string
): Promise<LocationResult | null> => {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '10',
    'accept-language': 'en',
  });

  const contactEmail = process.env.NEXT_PUBLIC_OSM_CONTACT_EMAIL as
    | string
    | undefined;
  if (contactEmail) {
    params.set('email', contactEmail);
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      log.error('OSM search failed', undefined, response.statusText);
      return null;
    }

    const data = (await response.json()) as NominatimResponse;
    const [result] = rankResults(data, trimmed);

    if (!result) {
      return null;
    }

    const address = result.address ?? {};
    const city = getPrimaryName(
      address,
      result.name || result.display_name || trimmed
    );

    const countryName = address.country ?? '';
    const countryCode = address.country_code
      ? address.country_code.toUpperCase()
      : '';

    return {
      countryCode,
      countryName,
      city,
      lat: Number(result.lat),
      lng: Number(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    log.error('OSM lookup error', undefined, error);
    return null;
  }
};

