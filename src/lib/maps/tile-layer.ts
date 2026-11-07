// CARTO basemaps now require an API key and serve "API KEY REQUIRED" tiles
// without one, so every Leaflet map uses the standard OpenStreetMap tiles.
// The OSM tile policy requires the attribution to stay visible.
export const MAP_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';
