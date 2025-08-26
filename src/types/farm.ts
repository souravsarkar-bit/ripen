export type GeoJsonPolygon = {
  type: 'Feature';
  properties: {
    name?: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // [ [ [lng, lat], ... ] ]
  };
};

export type Farm = {
  id: string;
  name: string;
  country?: string;
  crops?: string[];
  primaryCrop?: string;
  plantingDate?: string; // ISO date
  thumbnailUrl?: string;
  mapCenter?: { lat: number; lng: number; zoom?: number };
  polygon?: GeoJsonPolygon | null;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
};

export type StoredState = {
  farms: Farm[];
};

export const EMPTY_STATE: StoredState = { farms: [] };


