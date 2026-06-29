export type MapViewMode = 'status' | 'availability';

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
  imageCount?: number;
}

export interface ProgressImage {
  id: number;
  status: SquareStatus;
  caption?: string;
  createdAt: string;
}

export interface AdminProgressImage {
  id: number;
  status: SquareStatus;
  caption?: string;
  createdAt: string;
  squareIds: number[];
}

export const STATUS_LABELS: Record<SquareStatus, string> = {
  [SquareStatus.NogNieBeginNie]: 'Nog nie begin nie',
  [SquareStatus.Voorberei]: 'Voorberei',
  [SquareStatus.BesigOmTeTeer]: 'Besig om te teer',
  [SquareStatus.KlaarGeteer]: 'Klaar geteer'
};

export const STATUS_COLORS: Record<number, string> = {
  [SquareStatus.NogNieBeginNie]: '#D4C4A8',
  [SquareStatus.Voorberei]: '#B5651D',
  [SquareStatus.BesigOmTeTeer]: '#8B7355',
  [SquareStatus.KlaarGeteer]: '#6B7B3C',
};
