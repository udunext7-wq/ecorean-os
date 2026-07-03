export const VERSION = '1.0.0'; // TODO: 구현 예정

export interface ProcessItem {
  id: string;
  name: string;
  category: string;
  spaceTypes: string[];
  required?: boolean;
  unitPrice: number;
  unit: string;
}

export interface SelectionCriteria {
  spaceType: string;
  grade: string;
  includeOptional?: boolean;
}

export class ProcessSelector {
  constructor(private processes: ProcessItem[]) {}

  select(criteria: SelectionCriteria): ProcessItem[] {
    return this.processes.filter((p) => {
      const matchesSpace =
        p.spaceTypes.includes(criteria.spaceType) ||
        p.spaceTypes.includes('*');
      if (!matchesSpace) return false;
      if (!criteria.includeOptional && p.required === false) return false;
      return true;
    });
  }

  getByCategory(category: string): ProcessItem[] {
    return this.processes.filter((p) => p.category === category);
  }
}
