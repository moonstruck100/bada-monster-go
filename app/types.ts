export type Screen =
  | "start"
  | "home"
  | "explore"
  | "map"
  | "raid"
  | "dex"
  | "missions"
  | "safety"
  | "store"
  | "profile";

export type MonsterKey = "plastic" | "can" | "vinyl" | "cigarette" | "styrofoam" | "glass" | "net";

export interface Monster {
  key: MonsterKey;
  detected: string;
  name: string;
  emoji: string;
  image: string;
  kind: string;
  rarity: "일반" | "희귀" | "에픽";
  pollution: number;
  xp: number;
  points: number;
}

export interface UserData {
  nickname: string;
  level: number;
  xp: number;
  xpGoal: number;
  points: number;
  environmentPoints: number;
  captured: Record<string, number>;
  completedMissions: string[];
  claimedMissions: string[];
  badges: string[];
  activity: { id: string; text: string; time: string }[];
}

export interface Region {
  id: string;
  name: string;
  shortName: string;
  pollution: number;
  trashCount: number;
  participants: number;
  reports: number;
  mission: string;
  monsters: string[];
  boss: string;
  bossEmoji: string;
  bossImage?: string;
  bossHp: number;
  cleanupPoints: number;
}

export interface RiskReport {
  id: string;
  creature: string;
  location: string;
  time: string;
  severity: "주의" | "높음";
  reporters: number;
}

export interface ExchangeRecord {
  id: string;
  product: string;
  cost: number;
  time: string;
}

export interface GameState {
  user: UserData;
  regions: Region[];
  riskReports: RiskReport[];
  exchanges: ExchangeRecord[];
  raidHistory: string[];
  visitedRegions: string[];
  safetyViewed: boolean;
}
