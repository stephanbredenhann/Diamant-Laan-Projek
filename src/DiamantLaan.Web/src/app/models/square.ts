export enum SquareStatus {
  NogNieBeginNie = 0,
  Voorberei = 1,
  BesigOmTeTeer = 2,
  KlaarGeteer = 3
}

export interface Square {
  id: number;
  status: SquareStatus;
  isSold?: boolean;
}

export const STATUS_LABELS: Record<SquareStatus, string> = {
  [SquareStatus.NogNieBeginNie]: 'Nog nie begin nie',
  [SquareStatus.Voorberei]: 'Voorberei',
  [SquareStatus.BesigOmTeTeer]: 'Besig om te teer',
  [SquareStatus.KlaarGeteer]: 'Klaar geteer'
};
