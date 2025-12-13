/**
 * AQI (Air Quality Index) Constants
 */

export const AQI_LEVELS = {
  GOOD: '1',
  MODERATE: '2',
  UNHEALTHY_SENSITIVE: '3',
  UNHEALTHY: '4',
  VERY_UNHEALTHY: '5',
  HAZARDOUS: '6',
};

export const AQI_COLORS = {
  [AQI_LEVELS.GOOD]: '#00E400',
  [AQI_LEVELS.MODERATE]: '#FFFF00',
  [AQI_LEVELS.UNHEALTHY_SENSITIVE]: '#FF7E00',
  [AQI_LEVELS.UNHEALTHY]: '#FF0000',
  [AQI_LEVELS.VERY_UNHEALTHY]: '#8F3F97',
  [AQI_LEVELS.HAZARDOUS]: '#7E0023',
};

export const AQI_LABELS = {
  [AQI_LEVELS.GOOD]: 'Good',
  [AQI_LEVELS.MODERATE]: 'Moderate',
  [AQI_LEVELS.UNHEALTHY_SENSITIVE]: 'Unhealthy for Sensitive Groups',
  [AQI_LEVELS.UNHEALTHY]: 'Unhealthy',
  [AQI_LEVELS.VERY_UNHEALTHY]: 'Very Unhealthy',
  [AQI_LEVELS.HAZARDOUS]: 'Hazardous',
};

export const AQI_RANGES = {
  [AQI_LEVELS.GOOD]: '0-50',
  [AQI_LEVELS.MODERATE]: '51-100',
  [AQI_LEVELS.UNHEALTHY_SENSITIVE]: '101-150',
  [AQI_LEVELS.UNHEALTHY]: '151-200',
  [AQI_LEVELS.VERY_UNHEALTHY]: '201-300',
  [AQI_LEVELS.HAZARDOUS]: '301+',
};

export const AQI_DESCRIPTIONS = {
  [AQI_LEVELS.GOOD]: 'Air quality is satisfactory, and air pollution poses little or no risk.',
  [AQI_LEVELS.MODERATE]: 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.',
  [AQI_LEVELS.UNHEALTHY_SENSITIVE]: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.',
  [AQI_LEVELS.UNHEALTHY]: 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.',
  [AQI_LEVELS.VERY_UNHEALTHY]: 'Health alert: The risk of health effects is increased for everyone.',
  [AQI_LEVELS.HAZARDOUS]: 'Health warning of emergency conditions: everyone is more likely to be affected.',
};

export const DEFAULT_AQI_COLOR = '#808080'; // Gray for unknown
