import { AQI_COLORS, AQI_LABELS, AQI_RANGES, AQI_DESCRIPTIONS, DEFAULT_AQI_COLOR } from '../constants/aqi';

/**
 * Get AQI color based on color ID
 * @param {string} colorId - AQI color ID (1-6)
 * @returns {string} - Hex color code
 */
export const getAQIColor = (colorId) => {
  return AQI_COLORS[colorId] || DEFAULT_AQI_COLOR;
};

/**
 * Get AQI level text based on color ID
 * @param {string} colorId - AQI color ID (1-6)
 * @returns {string} - AQI level label
 */
export const getAQILabel = (colorId) => {
  return AQI_LABELS[colorId] || 'Unknown';
};

/**
 * Get AQI range text based on color ID
 * @param {string} colorId - AQI color ID (1-6)
 * @returns {string} - AQI range (e.g., "0-50")
 */
export const getAQIRange = (colorId) => {
  return AQI_RANGES[colorId] || 'N/A';
};

/**
 * Get AQI description based on color ID
 * @param {string} colorId - AQI color ID (1-6)
 * @returns {string} - AQI description
 */
export const getAQIDescription = (colorId) => {
  return AQI_DESCRIPTIONS[colorId] || 'No information available';
};

/**
 * Get all AQI levels for legend/display
 * @returns {Array} - Array of AQI level objects
 */
export const getAllAQILevels = () => {
  return Object.entries(AQI_LABELS).map(([colorId, label]) => ({
    colorId,
    label,
    range: AQI_RANGES[colorId],
    color: AQI_COLORS[colorId],
    description: AQI_DESCRIPTIONS[colorId],
  }));
};
