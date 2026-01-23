export interface LocationResult {
  countryCode: string;
  countryName: string;
  city: string;
  lat: number;
  lng: number;
  displayName: string;
}

type NominatimResponse = Array<{
  lat: string;
  lon: string;
  display_name: string;
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
  };
}>;

/**
 * Query the OpenStreetMap Nominatim API for a location.
 * Keeps payload tiny and defers rate-limit handling to the caller.
 */
export const searchLocationOSM = async (
  query: string
): Promise<LocationResult | null> => {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '1',
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
      console.error('OSM search failed', response.statusText);
      return null;
    }

    const data = (await response.json()) as NominatimResponse;
    const result = data?.[0];

    if (!result) {
      return null;
    }

    const address = result.address ?? {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.municipality ||
      address.county ||
      result.display_name ||
      trimmed;

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
    console.error('OSM lookup error', error);
    return null;
  }
};


