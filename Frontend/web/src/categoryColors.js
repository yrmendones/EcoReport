export const CATEGORY_COLORS = {
  "Air Pollution":                 "#6b7280", // gray
  "Animal Waste":                  "#92400e", // brown
  "Clogged Drainage":              "#0369a1", // deep blue
  "Damaged Roads":                 "#78716c", // warm gray
  "Flooding":                      "#0ea5e9", // cyan blue
  "Fallen Trees":                  "#166534", // dark green
  "Illegal Dumping":               "#dc2626", // red
  "Improper Garbage Disposal":     "#f97316", // orange
  "Overgrown Grass":               "#84cc16", // lime green
  "Others Environmental Concerns": "#a855f7", // purple
};

// Fallback palette for any category name not in the map above.
// Uses a stable hash so an unknown category always gets the same color.
const FALLBACK_PALETTE = [
  "#4d7df0", "#d967b5", "#f4b765", "#a583e8",
  "#00bcd4", "#ed6f79", "#8bc34a", "#ffdc55",
];

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

/**
 * Return the color for a given category name.
 * Unknown categories get a deterministic fallback color.
 */
export const getCategoryColor = (category) => {
  if (!category) return "#9ca3af";
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  return FALLBACK_PALETTE[hashString(category) % FALLBACK_PALETTE.length];
};