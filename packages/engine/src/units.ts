type UnitCategory = "mass" | "volume" | "count"

const TO_GRAMS: Record<string, number> = { g: 1, kg: 1000 }
const TO_ML: Record<string, number> = { ml: 1, l: 1000 }
const CATEGORY: Record<string, UnitCategory> = {
  g: "mass", kg: "mass",
  ml: "volume", l: "volume",
  pcs: "count",
}

export function unitCategory(unit: string): UnitCategory {
  const cat = CATEGORY[unit]
  if (!cat) throw new Error(`Unknown unit: "${unit}"`)
  return cat
}

export function baseUnit(unit: string): string {
  const cat = unitCategory(unit)
  if (cat === "mass") return "g"
  if (cat === "volume") return "ml"
  return "pcs"
}

export function convert(
  qty: number,
  from: string,
  to: string,
  bridge?: { density?: number; unitWeight?: number },
): number {
  const fromCat = unitCategory(from)
  const toCat = unitCategory(to)

  if (fromCat === toCat) {
    if (fromCat === "mass") return qty * (TO_GRAMS[from]! / TO_GRAMS[to]!)
    if (fromCat === "volume") return qty * (TO_ML[from]! / TO_ML[to]!)
    return qty // count → count
  }

  // Cross-category: bridge through grams
  let grams: number
  if (fromCat === "mass") {
    grams = qty * (TO_GRAMS[from] ?? 1)
  } else if (fromCat === "volume") {
    if (!bridge?.density) throw new Error(`Converting ${from} → ${to} requires ingredient density (g/ml)`)
    grams = qty * (TO_ML[from] ?? 1) * bridge.density
  } else {
    if (!bridge?.unitWeight) throw new Error(`Converting ${from} → ${to} requires ingredient unitWeight (g/piece)`)
    grams = qty * bridge.unitWeight
  }

  if (toCat === "mass") return grams / (TO_GRAMS[to] ?? 1)
  if (toCat === "volume") {
    if (!bridge?.density) throw new Error(`Converting ${from} → ${to} requires ingredient density (g/ml)`)
    return grams / bridge.density / (TO_ML[to] ?? 1)
  }
  // to count
  if (!bridge?.unitWeight) throw new Error(`Converting ${from} → ${to} requires ingredient unitWeight (g/piece)`)
  return grams / bridge.unitWeight
}
