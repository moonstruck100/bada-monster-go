import type { Metadata } from "next";
import GameApp from "./game-app";

export const metadata: Metadata = {
  title: "바다몬스터고 | 게임으로 부산 바다를 지켜요!",
  description: "AI 카메라 탐험과 협동 레이드로 부산 바다를 지키는 환경보호 게임",
};

export default function Home() {
  return <GameApp />;
}
