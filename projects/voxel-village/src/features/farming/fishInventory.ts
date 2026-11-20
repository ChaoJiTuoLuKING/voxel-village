export const lakeFish = { name: '湖鱼', sellPrice: 24 } as const;
export interface FishInventory {
  stock: number;
  caught: number;
  kept: number;
  released: number;
  pending: boolean;
}
export const emptyFishInventory = (): FishInventory => ({
  stock: 0,
  caught: 0,
  kept: 0,
  released: 0,
  pending: false,
});
export interface FishingLedger {
  read(): FishInventory & { coins: number; saveStatus: string };
  sync(): void;
  land(): void;
  resolve(keep: boolean): boolean;
}
