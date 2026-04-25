export const VERSION = '1.0.0'; // TODO: 구현 예정

export interface Rule {
  id: string;
  name: string;
  condition: (context: RuleContext) => boolean;
  action: (context: RuleContext) => void;
  priority?: number;
}

export interface RuleContext {
  spaceType: string;
  area: number;
  grade: string;
  [key: string]: unknown;
}

export class RuleEngine {
  private rules: Rule[] = [];

  addRule(rule: Rule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  evaluate(context: RuleContext): void {
    for (const rule of this.rules) {
      if (rule.condition(context)) {
        rule.action(context);
      }
    }
  }
}
