/**
 * CHED-Adapted Faculty Evaluation Tool - Master Calculation Logic
 *
 * Qualitative-to-Numerical Mapping (5-point Rating Scale):
 *   Excellent (5)           = 5
 *   Very Satisfactory (4)   = 4
 *   Satisfactory (3)        = 3
 *   Fair (2)                = 2
 *   Poor (1)                = 1
 *
 * Area Weights (40-20-20-10-10):
 *   A: Instructional Competence             = 0.40
 *   B: Classroom Management                 = 0.20
 *   C: Professionalism & Personal Qualities = 0.20
 *   D: Student Support & Development        = 0.10
 *   E: Research                             = 0.10
 */

// ── Numerical mapping ──────────────────────────────────────────────

export const ANSWER_VALUES: Record<string, number> = {
  "Excellent": 5,
  "Very Satisfactory": 4,
  "Satisfactory": 3,
  "Fair": 2,
  "Poor": 1,
}

/** Ordered list of answer labels for display (highest to lowest) */
export const ANSWER_LABELS = ["Excellent", "Very Satisfactory", "Satisfactory", "Fair", "Poor"] as const
export type AnswerLabel = typeof ANSWER_LABELS[number]

/** Convert a Likert answer string to its numerical value. Returns 0 if unrecognised. */
export function answerToValue(answer: string): number {
  return ANSWER_VALUES[answer] ?? 0
}

// ── Interpretation ─────────────────────────────────────────────────

export interface Interpretation {
  label: string
  color: string
}

export function getInterpretation(rating: number): Interpretation {
  if (rating >= 4.50) return { label: "Excellent", color: "#10b981" }
  if (rating >= 3.50) return { label: "Very Good", color: "#3b82f6" }
  if (rating >= 2.50) return { label: "Good", color: "#8b5cf6" }
  if (rating >= 1.50) return { label: "Fair", color: "#f59e0b" }
  return { label: "Poor", color: "#ef4444" }
}

// ── Area weight configuration ──────────────────────────────────────

export interface AreaWeightConfig {
  weight: number
  /** Alternative names that should map to this slot */
  aliases: string[]
}

/**
 * Canonical area slots with their weights and known name variants.
 * Any section name that includes the alias substring (case-insensitive)
 * will be mapped to that slot.
 */
export const AREA_WEIGHTS: Record<string, AreaWeightConfig> = {
  "Instructional Competence": {
    weight: 0.40,
    aliases: [
      "instructional competence",
      "instructional",
    ],
  },
  "Classroom Management": {
    weight: 0.20,
    aliases: [
      "classroom management",
      "classroom",
    ],
  },
  "Professionalism & Personal Qualities": {
    weight: 0.20,
    aliases: [
      "professionalism",
      "personal qualities",
      "personal & professional",
      "professional qualities",
    ],
  },
  "Student Support & Development": {
    weight: 0.10,
    aliases: [
      "student support",
      "student development",
      "student engagement",
    ],
  },
  "Research": {
    weight: 0.10,
    aliases: [
      "research",
    ],
  },
}

/** Resolve a section name from data to its canonical area key. Returns null if no match. */
export function resolveAreaKey(sectionName: string): string | null {
  const lower = sectionName.toLowerCase()
  for (const [key, config] of Object.entries(AREA_WEIGHTS)) {
    if (config.aliases.some(alias => lower.includes(alias))) {
      return key
    }
  }
  return null
}

// ── Response interface ─────────────────────────────────────────────

export interface EvalResponse {
  answer: string
  questionText: string
  questionType: string
  section?: string
}

// ── Computation helpers ────────────────────────────────────────────

/**
 * Compute the Item Mean for a single question across all respondents.
 *
 * Item Mean = Σ(freq × value) / totalRespondents
 */
export function computeItemMean(answers: string[]): number {
  if (answers.length === 0) return 0
  const sum = answers.reduce((acc, a) => acc + answerToValue(a), 0)
  return sum / answers.length
}

/**
 * Compute the Area Mean = average of all Item Means within the area.
 */
export function computeAreaMean(responses: EvalResponse[]): number {
  // Group by question
  const questionMap = new Map<string, string[]>()
  for (const r of responses) {
    if (r.questionType === "text") continue
    const val = answerToValue(r.answer)
    if (val === 0) continue // skip unrecognised answers
    if (!questionMap.has(r.questionText)) questionMap.set(r.questionText, [])
    questionMap.get(r.questionText)!.push(r.answer)
  }

  if (questionMap.size === 0) return 0

  let sumOfItemMeans = 0
  for (const answers of questionMap.values()) {
    sumOfItemMeans += computeItemMean(answers)
  }
  return sumOfItemMeans / questionMap.size
}

// ── Full evaluation computation ────────────────────────────────────

export interface AreaResult {
  canonicalName: string
  dataSectionName: string
  weight: number
  areaMean: number
  weightedScore: number
  interpretation: Interpretation
}

export interface EvaluationSummary {
  areas: AreaResult[]
  finalRating: number
  interpretation: Interpretation
  totalRespondents: number
}

/**
 * Compute the full CHED-adapted evaluation from raw responses.
 *
 *  1. Group responses by section.
 *  2. Map each section to a canonical area (with weight).
 *  3. Compute Area Mean for each.
 *  4. Final Weighted Rating = Σ(areaMean × weight).
 *  5. Interpret.
 */
export function computeEvaluation(
  allResponses: EvalResponse[],
  totalRespondents: number,
): EvaluationSummary {
  // 1. Group rating responses by section
  const sectionMap = new Map<string, EvalResponse[]>()
  for (const r of allResponses) {
    if (!r.section) continue
    if (r.questionType === "text") continue
    const lower = r.section.toLowerCase()
    if (lower === "verbal interpretation" || lower === "comments") continue
    if (!sectionMap.has(r.section)) sectionMap.set(r.section, [])
    sectionMap.get(r.section)!.push(r)
  }

  // 2-3. Map to canonical areas and compute means
  const areas: AreaResult[] = []
  // Track which canonical keys we've already processed (in case multiple data-sections map to same canonical)
  const processedKeys = new Set<string>()

  for (const [dataSectionName, responses] of sectionMap) {
    const canonicalKey = resolveAreaKey(dataSectionName)
    if (!canonicalKey) continue
    if (processedKeys.has(canonicalKey)) {
      // Merge responses into existing area
      const existing = areas.find(a => a.canonicalName === canonicalKey)!
      // Recompute with merged data
      const merged = [...allResponses.filter(r =>
        r.section && resolveAreaKey(r.section) === canonicalKey &&
        r.questionType !== "text" &&
        r.section.toLowerCase() !== "verbal interpretation" &&
        r.section.toLowerCase() !== "comments"
      )]
      const newMean = computeAreaMean(merged)
      existing.areaMean = newMean
      existing.weightedScore = parseFloat((newMean * existing.weight).toFixed(4))
      existing.interpretation = getInterpretation(newMean)
      continue
    }

    const config = AREA_WEIGHTS[canonicalKey]
    const areaMean = computeAreaMean(responses)
    const weightedScore = parseFloat((areaMean * config.weight).toFixed(4))

    areas.push({
      canonicalName: canonicalKey,
      dataSectionName,
      weight: config.weight,
      areaMean: parseFloat(areaMean.toFixed(2)),
      weightedScore,
      interpretation: getInterpretation(areaMean),
    })
    processedKeys.add(canonicalKey)
  }

  // 4. Final Weighted Rating
  const finalRating = parseFloat(
    areas.reduce((sum, a) => sum + a.weightedScore, 0).toFixed(2)
  )

  // 5. Interpret
  const interpretation = getInterpretation(finalRating)

  return {
    areas,
    finalRating,
    interpretation,
    totalRespondents,
  }
}

/**
 * Compute a single section/area mean from responses (for display in section summary cards).
 */
export function computeSectionMean(responses: EvalResponse[]): {
  mean: number
  interpretation: Interpretation
  totalResponses: number
  totalQuestions: number
} {
  const ratingResponses = responses.filter(
    r => r.questionType !== "text" &&
      r.section?.toLowerCase() !== "verbal interpretation" &&
      r.section?.toLowerCase() !== "comments"
  )

  const questionMap = new Map<string, string[]>()
  for (const r of ratingResponses) {
    const val = answerToValue(r.answer)
    if (val === 0) continue
    if (!questionMap.has(r.questionText)) questionMap.set(r.questionText, [])
    questionMap.get(r.questionText)!.push(r.answer)
  }

  if (questionMap.size === 0) {
    return {
      mean: 0,
      interpretation: getInterpretation(0),
      totalResponses: 0,
      totalQuestions: 0,
    }
  }

  let sumOfItemMeans = 0
  for (const answers of questionMap.values()) {
    sumOfItemMeans += computeItemMean(answers)
  }
  const mean = parseFloat((sumOfItemMeans / questionMap.size).toFixed(2))

  return {
    mean,
    interpretation: getInterpretation(mean),
    totalResponses: ratingResponses.length,
    totalQuestions: questionMap.size,
  }
}
