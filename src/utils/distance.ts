// Haversine formula for calculating accurate geodesic distances between 2 GPS coordinates
export interface GpsCoordinates {
  lat: number;
  lng: number;
  city?: string;
}

export const DEFAULT_USER_GPS: GpsCoordinates = {
  lat: 34.0535,
  lng: -118.2500,
  city: 'Los Angeles (You)',
};

/**
 * Calculates distance in kilometers between two GPS coordinates using Haversine algorithm
 */
export function calculateHaversineDistance(
  coord1: GpsCoordinates,
  coord2: GpsCoordinates
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Return rounded to 2 decimals
}

/**
 * Calculates estimated travel times based on distance
 */
export function getEstimatedTravelTime(distanceKm: number): {
  driveMins: number;
  walkMins: number;
  transitMins: number;
  description: string;
} {
  const driveMins = Math.max(1, Math.round((distanceKm / 40) * 60)); // Avg 40 km/h in city
  const walkMins = Math.round((distanceKm / 4.8) * 60); // Avg 4.8 km/h walking
  const transitMins = Math.round((distanceKm / 25) * 60 + 5);

  let description = 'Nearby in your local district';
  if (distanceKm < 1) description = 'Under 1 km away • In your immediate neighborhood';
  else if (distanceKm < 5) description = 'Short 5-10 min drive away';
  else if (distanceKm < 20) description = 'Within metro area';
  else description = 'Cross-city soulmate match';

  return { driveMins, walkMins, transitMins, description };
}

/**
 * Creates Google Maps directions link
 */
export function getGoogleMapsDirectionsUrl(
  origin: GpsCoordinates,
  destination: GpsCoordinates
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
}

/**
 * Creates Google Maps search/location pin link
 */
export function getGoogleMapsPinUrl(coord: GpsCoordinates, label: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${coord.lat},${coord.lng}`;
}
