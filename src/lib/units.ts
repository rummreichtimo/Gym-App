/** Storage is always metric (kg / cm). Conversion happens at the edges. */

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export type WeightUnit = 'kg' | 'lb';
export type LengthUnit = 'cm' | 'in';

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg / KG_PER_LB : kg;
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value * KG_PER_LB : value;
}

export function cmToDisplay(cm: number, unit: LengthUnit): number {
  return unit === 'in' ? cm / CM_PER_IN : cm;
}

export function displayToCm(value: number, unit: LengthUnit): number {
  return unit === 'in' ? value * CM_PER_IN : value;
}

export function formatWeight(kg: number, unit: WeightUnit, decimals = 1): string {
  const value = kgToDisplay(kg, unit);
  const rounded = Math.round(value * 10 ** decimals) / 10 ** decimals;
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: decimals }).format(rounded)} ${unit}`;
}

export function formatLength(cm: number, unit: LengthUnit, decimals = 1): string {
  const value = cmToDisplay(cm, unit);
  const rounded = Math.round(value * 10 ** decimals) / 10 ** decimals;
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: decimals }).format(rounded)} ${unit}`;
}

/** Smallest sensible increment for the plate/dumbbell steppers. */
export function weightStep(unit: WeightUnit) {
  return unit === 'lb' ? 5 : 2.5;
}
