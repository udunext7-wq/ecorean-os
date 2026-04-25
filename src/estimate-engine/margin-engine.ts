export const VERSION = '1.0.0'; // TODO: 구현 예정

export interface MarginConfig {
  baseRate: number;       // 기본 마진율 (0~1)
  gradeMultiplier?: Record<string, number>;
  areaThresholds?: { min: number; max: number; multiplier: number }[];
}

export interface MarginResult {
  cost: number;
  marginRate: number;
  marginAmount: number;
  total: number;
}

export class MarginEngine {
  constructor(private config: MarginConfig) {}

  calculate(cost: number, grade: string, area: number): MarginResult {
    let rate = this.config.baseRate;

    if (this.config.gradeMultiplier?.[grade]) {
      rate *= this.config.gradeMultiplier[grade];
    }

    if (this.config.areaThresholds) {
      for (const t of this.config.areaThresholds) {
        if (area >= t.min && area <= t.max) {
          rate *= t.multiplier;
          break;
        }
      }
    }

    const marginAmount = Math.round(cost * rate);
    return { cost, marginRate: rate, marginAmount, total: cost + marginAmount };
  }
}
