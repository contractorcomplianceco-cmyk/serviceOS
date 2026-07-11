// ---------------------------------------------------------------------------
// GPS / routing provider abstraction.
//
// Defines the pluggable interface for travel-time / routing estimates. The
// prototype ships a STRAIGHT-LINE estimator (haversine distance ÷ an assumed
// average speed) whose results are always labeled "estimated" — no live traffic,
// no map provider is contacted. A MANUAL provider lets a dispatcher enter a
// known ETA. Swapping in a real routing API means implementing RoutingProvider.
// ---------------------------------------------------------------------------

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface RouteEstimate {
  distanceKm: number;
  etaMinutes: number;
  provider: string;
  /** Always true for the built-in estimator — surfaced in the UI as "est.". */
  estimated: boolean;
  note: string;
}

export interface RoutingProvider {
  name: string;
  estimate(from: GeoPoint, to: GeoPoint): Promise<RouteEstimate>;
}

const EARTH_RADIUS_KM = 6371;
const ASSUMED_AVG_SPEED_KMH = 40;

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export const straightLineRoutingProvider: RoutingProvider = {
  name: "Straight-line estimator",
  async estimate(from, to) {
    const distanceKm = haversineKm(from, to);
    const etaMinutes = Math.round((distanceKm / ASSUMED_AVG_SPEED_KMH) * 60);
    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      etaMinutes,
      provider: this.name,
      estimated: true,
      note: `Estimated (straight-line ÷ ${ASSUMED_AVG_SPEED_KMH}km/h — no live traffic)`,
    };
  },
};

export interface ManualEta {
  etaMinutes: number;
}

export function manualRoutingProvider(input: ManualEta): RoutingProvider {
  return {
    name: "Manual dispatcher entry",
    async estimate() {
      return {
        distanceKm: 0,
        etaMinutes: input.etaMinutes,
        provider: "Manual dispatcher entry",
        estimated: false,
        note: "Entered by dispatcher",
      };
    },
  };
}

let activeProvider: RoutingProvider = straightLineRoutingProvider;

export function setRoutingProvider(provider: RoutingProvider): void {
  activeProvider = provider;
}

export async function estimateEta(
  from: GeoPoint,
  to: GeoPoint,
): Promise<RouteEstimate> {
  return activeProvider.estimate(from, to);
}
