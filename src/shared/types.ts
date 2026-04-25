export const VERSION = '1.0.0'; // TODO: 구현 예정

export type SpaceType =
  | 'living'
  | 'bedroom'
  | 'bathroom'
  | 'kitchen'
  | 'balcony'
  | 'entrance'
  | 'office'
  | string;

export type GradeType = 'basic' | 'standard' | 'premium' | 'luxury';

export interface EstimateInput {
  projectName: string;
  spaceType: SpaceType;
  area: number;
  grade: GradeType;
  clientName?: string;
  requestDate?: string;
}

export interface EstimateOutput {
  estimateId: string;
  input: EstimateInput;
  items: EstimateLineItem[];
  subtotal: number;
  margin: number;
  vat: number;
  total: number;
  createdAt: string;
}

export interface EstimateLineItem {
  id: string;
  processId: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}
