// Benefit types for mustering out

export interface MusteringBenefit {
  type: 'cash' | 'item' | 'ship' | 'characteristic' | 'membership' | 'shares';
  value: number | string;
  description: string;
}

export interface ShipBenefit {
  shares: number;         // Ship shares accumulated
  ship?: string;          // Specific ship if granted directly
}
