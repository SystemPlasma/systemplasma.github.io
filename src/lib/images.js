import imageMap from "../assets/data/image-map.json";
// Map shape: { [id: string]: string } where value is a project-relative path
const map = imageMap;
/**
 * Returns an absolute URL for an image id using the generated image map.
 * Example: getImageUrl("thetrickster_ensnare_1") -> "<base>/assets/thetrickster_ensnare_1.png"
 */
export function getImageUrl(id) {
    const rel = map[id];
    if (!rel)
        return undefined;
    return new URL(rel, import.meta.env.BASE_URL).toString();
}
/**
 * Returns the raw project-relative path for an image id (e.g., "assets/..png").
 */
export function getImagePath(id) {
    return map[id];
}
/**
 * Expose the map for advanced usages (listing, searching, etc.).
 */
export const imagesIndex = map;
