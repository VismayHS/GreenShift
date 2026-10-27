// Diverging field: deep green (low carbon) through a neutral chart grey to brick
// (high carbon), split near the 2024-25 national mean (127 gCO2/kWh).
export const THRESHOLDS = [0, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 400]
const STEPS = ['#1a5e41', '#2f7a55', '#4f956c', '#7cb08d', '#b3cbb4', '#d6dbd2', '#e3cdbd', '#d9a68b', '#c9805f', '#b45c3f', '#973f28', '#74301f']

export function bandColor(v: number): string {
  let i = 0
  while (i + 1 < THRESHOLDS.length && v >= THRESHOLDS[i + 1]) i++
  return STEPS[i]
}

export const LEGEND = THRESHOLDS.map((t, i) => ({ from: t, to: THRESHOLDS[i + 1] ?? null, color: STEPS[i] }))

// Validated categorical slots (dataviz reference palette), fixed order, for series.
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
