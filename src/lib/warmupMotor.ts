/**
 * Motor Humano - Warmup Engine
 * Generates organic, non-linear warmup plans based on duration and chip quality profile.
 */

export type QualityProfile = "novo" | "estavel" | "recuperacao";

export interface ProfileConfig {
  label: string;
  description: string;
  baseVolumeStart: [number, number]; // [min, max] range
  baseVolumeEnd: [number, number];
  peakMax: [number, number];
  blocksPerDay: [number, number];
  oscillation: number; // 0-1, how much daily variance
  pauseMultiplier: number; // higher = more/longer pauses
  componentsEnabled: {
    privateChat: boolean;
    groupChat: boolean;
    statusPost: boolean;
    autoReply: boolean;
  };
  errorRecoveryDays: number; // days to reduce after error
}

export const PROFILES: Record<QualityProfile, ProfileConfig> = {
  novo: {
    label: "Novo",
    description: "Chip novo, progressão conservadora",
    baseVolumeStart: [3, 6],
    baseVolumeEnd: [25, 40],
    peakMax: [40, 50],
    blocksPerDay: [2, 4],
    oscillation: 0.2,
    pauseMultiplier: 1.5,
    componentsEnabled: {
      privateChat: false,
      groupChat: true,
      statusPost: false,
      autoReply: false,
    },
    errorRecoveryDays: 3,
  },
  estavel: {
    label: "Estável",
    description: "Chip estável, progressão moderada",
    baseVolumeStart: [8, 15],
    baseVolumeEnd: [50, 80],
    peakMax: [80, 100],
    blocksPerDay: [3, 5],
    oscillation: 0.15,
    pauseMultiplier: 1.0,
    componentsEnabled: {
      privateChat: true,
      groupChat: true,
      statusPost: true,
      autoReply: false,
    },
    errorRecoveryDays: 2,
  },
  recuperacao: {
    label: "Recuperação",
    description: "Chip em recuperação, progressão mínima",
    baseVolumeStart: [2, 4],
    baseVolumeEnd: [15, 25],
    peakMax: [25, 35],
    blocksPerDay: [2, 3],
    oscillation: 0.1,
    pauseMultiplier: 2.0,
    componentsEnabled: {
      privateChat: false,
      groupChat: true,
      statusPost: false,
      autoReply: false,
    },
    errorRecoveryDays: 4,
  },
};

export const DURATION_OPTIONS = [3, 7, 14, 21, 30] as const;

/**
 * Generate a non-linear growth curve with natural oscillation.
 * Returns an array of target volumes for each day.
 */
export function generateCurve(
  days: number,
  profile: QualityProfile
): number[] {
  const cfg = PROFILES[profile];
  const startAvg = (cfg.baseVolumeStart[0] + cfg.baseVolumeStart[1]) / 2;
  const endAvg = (cfg.baseVolumeEnd[0] + cfg.baseVolumeEnd[1]) / 2;
  const peakAvg = (cfg.peakMax[0] + cfg.peakMax[1]) / 2;

  const curve: number[] = [];

  for (let i = 0; i < days; i++) {
    const t = days === 1 ? 1 : i / (days - 1); // 0 to 1

    // Ease-out curve: fast start, deceleration near peak
    const eased = 1 - Math.pow(1 - t, 2.2);

    // Base value along the curve
    let base = startAvg + (endAvg - startAvg) * eased;

    // Add oscillation (pseudo-random but deterministic per day index)
    const osc = Math.sin(i * 2.7 + 0.5) * cfg.oscillation * base;
    base += osc;

    // Occasional dip days (every ~4-6 days, reduce by 10-20%)
    if (i > 1 && (i % 4 === 3 || i % 7 === 5)) {
      base *= 0.82 + Math.random() * 0.08;
    }

    // Clamp
    base = Math.max(cfg.baseVolumeStart[0], Math.min(peakAvg, Math.round(base)));
    curve.push(base);
  }

  return curve;
}

/**
 * Get the plan summary for display in the modal.
 */
export function getPlanSummary(days: number, profile: QualityProfile) {
  const cfg = PROFILES[profile];
  const curve = generateCurve(days, profile);

  return {
    profile: cfg.label,
    profileDescription: cfg.description,
    duration: days,
    volumeStart: cfg.baseVolumeStart,
    volumeEnd: cfg.baseVolumeEnd,
    peakMax: cfg.peakMax,
    estimatedCurve: curve,
    totalEstimated: curve.reduce((a, b) => a + b, 0),
    components: cfg.componentsEnabled,
    blocksPerDay: cfg.blocksPerDay,
    protections: [
      "Pausas inteligentes entre blocos",
      "Oscilação diária (dias mais/menos ativos)",
      "Recuo automático em caso de erro",
      "Logs completos de cada ação",
    ],
  };
}

/**
 * Generate the internal parameters for a session based on profile + duration.
 * These are stored in the DB but not exposed to the user.
 */
export function getSessionParams(days: number, profile: QualityProfile) {
  const cfg = PROFILES[profile];
  const startAvg = Math.round((cfg.baseVolumeStart[0] + cfg.baseVolumeStart[1]) / 2);
  const endAvg = Math.round((cfg.baseVolumeEnd[0] + cfg.baseVolumeEnd[1]) / 2);
  const peakAvg = Math.round((cfg.peakMax[0] + cfg.peakMax[1]) / 2);

  // Calculate increment to go from start to end over the duration
  const increment = days > 1 ? Math.max(1, Math.round((endAvg - startAvg) / (days - 1))) : 0;

  // Delays: more conservative for novo/recuperacao
  const minDelay = profile === "novo" ? 45 : profile === "recuperacao" ? 60 : 30;
  const maxDelay = profile === "novo" ? 180 : profile === "recuperacao" ? 240 : 120;

  // Time window
  const startTime = "08:00";
  const endTime = profile === "recuperacao" ? "16:00" : "18:00";

  return {
    messages_per_day: startAvg,
    daily_increment: increment,
    max_messages_per_day: peakAvg,
    total_days: days,
    min_delay_seconds: minDelay,
    max_delay_seconds: maxDelay,
    start_time: startTime,
    end_time: endTime,
  };
}
