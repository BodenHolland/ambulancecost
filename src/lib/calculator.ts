export type LocalityType = 'urban' | 'rural' | 'super-rural';

// 2026 CMS Constants (used only as fallback when no DB data is available)
export const CMS_2026 = {
  CONVERSION_FACTOR: 284.56, // Base Rate (annual conversion factor)
  MILEAGE_RATE:       9.15,  // Ground mileage per loaded mile
  RVU_BLS:            1.60,  // BLS Emergency (A0429)
  RVU_ALS:            1.90,  // ALS Emergency (A0427)
  ADDON_URBAN:        1.02,
  ADDON_RURAL:        1.03,
  ADDON_SUPER_RURAL_BONUS: 0.226, // applied on top of rural rate
};

export interface AfsRates {
  bls_urban:       number | null;
  bls_rural:       number | null;
  bls_super_rural: number | null;
  als_urban:       number | null;
  als_rural:       number | null;
  als_super_rural: number | null;
  mileage_urban:   number | null;
  mileage_rural:   number | null;
  gpci:            number;
}

export interface CalculationResult {
  medicareRate:    number;
  privatePrice:    number;
  baseRate:        number;
  mileageRate:     number;
  gpci:            number;
  localityType:    LocalityType;
  isFromAfs:       boolean; // true = live CMS data, false = fallback formula
  adjustments: {
    baseRateMultiplier: number;
    mileageMultiplier:  number;
  };
}

/**
 * Calculate ambulance Medicare estimate.
 *
 * When `afsRates` is provided (served from actual AFS PUF data via the DB),
 * uses those authoritative pre-computed values.
 *
 * Falls back to the formula calculation if afsRates is absent (e.g., zip not in DB).
 */
export function calculateEstimate(
  type: 'BLS' | 'ALS',
  miles: number,
  localityType: LocalityType,
  afsRates?: AfsRates | null,
  verifiedMarket?: { bls_base: number; als_base?: number; mileage: number } | null
): CalculationResult {
  let finalBaseRate: number;
  let finalMileageRate: number;
  let gpci = afsRates?.gpci ?? 1.0;
  let isFromAfs = false;
  let baseRateMultiplier = 1.0;
  let mileageMultiplier = 1.0;

  if (afsRates) {
    // ── Live CMS path ────────────────────────────────────────────────────────
    isFromAfs = true;

    if (localityType === 'super-rural') {
      finalBaseRate = type === 'ALS'
        ? (afsRates.als_super_rural ?? afsRates.als_rural ?? 0)
        : (afsRates.bls_super_rural ?? afsRates.bls_rural ?? 0);
      finalMileageRate = (afsRates.mileage_rural ?? 0) * miles;
      baseRateMultiplier = 1.226;
      mileageMultiplier  = 1.03;
    } else if (localityType === 'rural') {
      finalBaseRate = type === 'ALS'
        ? (afsRates.als_rural ?? 0)
        : (afsRates.bls_rural ?? 0);
      finalMileageRate = (afsRates.mileage_rural ?? 0) * miles;
      baseRateMultiplier = 1.03;
      mileageMultiplier  = 1.03;
    } else {
      // urban (default)
      finalBaseRate = type === 'ALS'
        ? (afsRates.als_urban ?? 0)
        : (afsRates.bls_urban ?? 0);
      finalMileageRate = (afsRates.mileage_urban ?? 0) * miles;
      baseRateMultiplier = 1.02;
      mileageMultiplier  = 1.02;
    }
  } else {
    // ── Fallback formula path ──────────────────────────────────────────────
    // Rate = (RVU × (0.3 + 0.7 × GPCI)) × BASE_RATE × ADD_ON
    const rvu = type === 'ALS' ? CMS_2026.RVU_ALS : CMS_2026.RVU_BLS;

    if (localityType === 'urban') {
      baseRateMultiplier = CMS_2026.ADDON_URBAN;
      mileageMultiplier  = CMS_2026.ADDON_URBAN;
    } else if (localityType === 'rural') {
      baseRateMultiplier = CMS_2026.ADDON_RURAL;
      mileageMultiplier  = CMS_2026.ADDON_RURAL;
    } else {
      // super-rural: formula gives rural base + 22.6% bonus
      baseRateMultiplier = CMS_2026.ADDON_RURAL * (1 + CMS_2026.ADDON_SUPER_RURAL_BONUS);
      mileageMultiplier  = CMS_2026.ADDON_RURAL;
    }

    finalBaseRate    = rvu * (0.3 + 0.7 * gpci) * CMS_2026.CONVERSION_FACTOR * baseRateMultiplier;
    finalMileageRate = CMS_2026.MILEAGE_RATE * mileageMultiplier * miles;
  }

  const medicareRate = finalBaseRate + finalMileageRate;
  // Market sticker price: 3× Medicare (industry average) UNLESS we have verified data
  let privatePrice: number;
  if (verifiedMarket) {
    // Pick the correct base override based on service type (BLS or ALS)
    const baseValue = type === 'ALS' ? (verifiedMarket.als_base || 0) : verifiedMarket.bls_base;
    
    // Only override if the value is non-zero, otherwise fall back to 3x Medicare for that specific component
    const baseOverride = baseValue > 0 ? baseValue : (finalBaseRate * 3);
    const mileageOverride = (verifiedMarket.mileage > 0 ? verifiedMarket.mileage : (finalMileageRate / miles * 3 || 25)) * miles;
    
    privatePrice = baseOverride + mileageOverride;
  } else {
    privatePrice = medicareRate * 3;
  }

  return {
    medicareRate,
    privatePrice,
    baseRate: finalBaseRate,
    mileageRate: finalMileageRate,
    gpci,
    localityType,
    isFromAfs,
    adjustments: { baseRateMultiplier, mileageMultiplier },
  };
}
