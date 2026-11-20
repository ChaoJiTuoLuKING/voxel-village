import type { FarmTool } from './farmState';
// Native cursors keep up with the pointer without React state or animation-frame allocations.
const drawings: Record<FarmTool, string> = {
  seed: '<path d="M10 9h23l-2 28H13Z" fill="#c3945b" stroke="#674b30" stroke-width="2"/><path d="M10 9h23v7H10Z" fill="#ead397"/><path d="M21 31V19m0 6c-8 0-7-8-7-8 6 0 7 4 7 8Zm0-3c7 0 8-7 8-7-6 0-8 3-8 7Z" fill="#587d3d"/>',
  water:
    '<path d="M8 16h20v19H8Zm20 4 11-8v7L28 29Z" fill="#79ada4" stroke="#365f59" stroke-width="2"/><path d="M9 18C0 16 0 33 9 31M13 15V7h10v9" fill="none" stroke="#365f59" stroke-width="3"/><path d="m38 25-2 7m7-4-2 7" stroke="#78c1dd" stroke-width="3"/>',
  harvest:
    '<path d="m11 35-6-14q0-5 4-2l4 5V10q0-5 4-3v13-15q4-4 4 1v14-11q4-4 4 1v12-7q5-2 4 3v14l-6 7Z" fill="#e6c591" stroke="#775532" stroke-width="2"/>',
};
export const farmCursors = Object.fromEntries(
  Object.entries(drawings).map(([tool, drawing]) => [
    tool,
    `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><path d="M1 1v10l3-4 5-2Z" fill="white" stroke="#344e3e"/>${drawing}</svg>`)}") 2 2, crosshair`,
  ]),
) as Record<FarmTool, string>;
