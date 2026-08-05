import type { GameState, Monster, Region } from "./types";

export const MONSTERS: Monster[] = [
  { key: "plastic", detected: "플라스틱병", name: "부산 물떡 슬라임", emoji: "🫧", image: "monsters/mud-slime.png", kind: "플라스틱", rarity: "일반", pollution: 35, xp: 40, points: 120 },
  { key: "can", detected: "캔", name: "부산 어묵 게", emoji: "🦀", image: "monsters/fishcake-crab.png", kind: "금속", rarity: "일반", pollution: 42, xp: 45, points: 140 },
  { key: "vinyl", detected: "비닐", name: "자갈치 비닐 유령", emoji: "👻", image: "monsters/vinyl-ghost.png", kind: "비닐", rarity: "희귀", pollution: 55, xp: 60, points: 180 },
  { key: "cigarette", detected: "담배꽁초", name: "해운대 소금 연기 악마", emoji: "😈", image: "monsters/salt-smoke-imp.png", kind: "담배꽁초", rarity: "희귀", pollution: 68, xp: 70, points: 200 },
  { key: "net", detected: "폐그물", name: "영도 어망 크라켄", emoji: "🐙", image: "monsters/sea-net-kraken.png", kind: "폐어구", rarity: "에픽", pollution: 85, xp: 100, points: 280 },
];

export const REGIONS: Region[] = [
  { id: "haeundae", name: "해운대해수욕장", shortName: "해운대", pollution: 34, trashCount: 184, participants: 96, reports: 2, mission: "플라스틱병 20개 정화", monsters: ["부산 물떡 슬라임", "부산 어묵 게"], boss: "부산항 플라스틱 고래", bossEmoji: "🐋", bossHp: 100, cleanupPoints: 330 },
  { id: "gwangalli", name: "광안리해수욕장", shortName: "광안리", pollution: 60, trashCount: 267, participants: 128, reports: 4, mission: "비닐 쓰레기 집중 수거", monsters: ["자갈치 비닐 유령", "해운대 소금 연기 악마"], boss: "오염 크라켄", bossEmoji: "🐙", bossHp: 100, cleanupPoints: 240 },
  { id: "songjeong", name: "송정해수욕장", shortName: "송정", pollution: 22, trashCount: 91, participants: 54, reports: 1, mission: "폐그물 흔적 찾기", monsters: ["영도 어망 크라켄", "부산항 플라스틱 고래"], boss: "심해 오염왕", bossEmoji: "👑", bossHp: 72, cleanupPoints: 410 },
  { id: "dadaepo", name: "다대포해수욕장", shortName: "다대포", pollution: 76, trashCount: 318, participants: 73, reports: 3, mission: "갯벌 오염물 30개 정화", monsters: ["오일 슬라임", "독연기 드래곤"], boss: "블랙 웨일", bossEmoji: "🐳", bossHp: 100, cleanupPoints: 120 },
];

export const INITIAL_STATE: GameState = {
  user: {
    nickname: "부산바다수호대",
    level: 3,
    xp: 120,
    xpGoal: 200,
    points: 850,
    environmentPoints: 3500,
    captured: { plastic: 2, can: 1, vinyl: 1 },
    completedMissions: [],
    claimedMissions: [],
    badges: ["첫 정화", "해운대 탐험가"],
    activity: [
      { id: "a1", text: "광안리 정화 레이드에 참여했어요", time: "오늘 09:42" },
      { id: "a2", text: "플라슬라임을 포획했어요", time: "어제 16:18" },
    ],
  },
  regions: REGIONS,
  riskReports: [
    { id: "r1", creature: "해파리", location: "해운대해수욕장", time: new Date(Date.now() - 10 * 60_000).toISOString(), severity: "높음", reporters: 4 },
    { id: "r2", creature: "가오리", location: "송정해수욕장", time: new Date(Date.now() - 65 * 60_000).toISOString(), severity: "주의", reporters: 2 },
  ],
  exchanges: [],
  raidHistory: [],
  visitedRegions: ["haeundae"],
  safetyViewed: false,
};

export const MISSIONS = [
  { id: "capture1", icon: "⚔️", title: "오염 몬스터 1마리 포획하기", target: 1, reward: "EXP 50 · 100P", xp: 50, points: 100 },
  { id: "plastic", icon: "🫧", title: "플라스틱 몬스터 발견하기", target: 1, reward: "EXP 40 · 첫 발견 배지", xp: 40, points: 80 },
  { id: "visit", icon: "📍", title: "새로운 해변 방문하기", target: 2, reward: "EXP 60 · 150P", xp: 60, points: 150 },
  { id: "safety", icon: "🛟", title: "위험 생물 정보 확인하기", target: 1, reward: "EXP 30 · 안전 수호 배지", xp: 30, points: 70 },
  { id: "three", icon: "🏆", title: "오늘의 미션 3개 완료하기", target: 3, reward: "EXP 100 · 300P", xp: 100, points: 300 },
];

export const PRODUCTS = [
  { id: "coffee", emoji: "☕", name: "카페 음료 쿠폰", description: "부산 제휴 카페에서 시원한 한 잔", cost: 1000, color: "coral" },
  { id: "food", emoji: "🍔", name: "음식점 할인 쿠폰", description: "부산 맛집에서 사용하는 할인권", cost: 3000, color: "mint" },
  { id: "souvenir", emoji: "🎁", name: "부산 관광 기념품", description: "바다몬스터고 한정 굿즈", cost: 5000, color: "blue" },
];
