export type HealthSummary = {
  available: boolean
  authorized: boolean
  stepsToday: number | null
  activeEnergyToday: number | null
  latestWeightKg: number | null
  latestBodyFatPct: number | null
  restingHeartRate: number | null
}

export async function requestHealthAccessAndRead(): Promise<HealthSummary> {
  return {
    available: false,
    authorized: false,
    stepsToday: null,
    activeEnergyToday: null,
    latestWeightKg: null,
    latestBodyFatPct: null,
    restingHeartRate: null,
  }
}
