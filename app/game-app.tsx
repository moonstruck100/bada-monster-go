"use client";

import { ChangeEvent, CSSProperties, useEffect, useRef, useState } from "react";
import { INITIAL_STATE, MISSIONS, MONSTERS, PRODUCTS, REGIONS } from "./data";
import type { GameState, Monster, Screen } from "./types";

const STORAGE_KEY = "badamonstergo-state-v2";
const ANALYSIS_RESULTS = ["플라스틱병", "캔", "비닐", "담배꽁초", "폐그물", "해파리", "일반 물체"];

const cloneInitial = (): GameState => JSON.parse(JSON.stringify(INITIAL_STATE));
const totalCaptured = (state: GameState) => Object.values(state.user.captured).reduce((a, b) => a + b, 0);

function readState(): GameState {
  if (typeof window === "undefined") return cloneInitial();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return cloneInitial();
    const parsed = JSON.parse(saved) as GameState;
    return {
      ...cloneInitial(),
      ...parsed,
      regions: REGIONS.map((region) => ({ ...region, ...(parsed.regions?.find((savedRegion) => savedRegion.id === region.id) ?? {}) , boss: region.boss, bossImage: region.bossImage })),
    };
  } catch {
    return cloneInitial();
  }
}

function timeAgo(iso: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / 1440)}일 전`;
}

function pollutionLabel(value: number) {
  if (value <= 30) return { label: "깨끗함", className: "clean" };
  if (value <= 60) return { label: "보통", className: "normal" };
  return { label: "주의", className: "danger" };
}

function Toast({ message }: { message: string }) {
  return <div className="toast" role="status"><span>✓</span>{message}</div>;
}

function Progress({ value, max = 100, tone = "blue" }: { value: number; max?: number; tone?: string }) {
  return <div className={`progress ${tone}`}><span style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>;
}

function SectionTitle({ eyebrow, title, action, onAction }: { eyebrow?: string; title: string; action?: string; onAction?: () => void }) {
  return <div className="section-title"><div>{eyebrow && <p>{eyebrow}</p>}<h2>{title}</h2></div>{action && <button onClick={onAction}>{action} <span>›</span></button>}</div>;
}

export default function GameApp() {
  const [screen, setScreen] = useState<Screen>("start");
  const [state, setState] = useState<GameState>(readState);
  const [regionId, setRegionId] = useState("gwangalli");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [analysisConfidence, setAnalysisConfidence] = useState(0);
  const [captureStage, setCaptureStage] = useState<"idle" | "catching" | "success">("idle");
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const region = state.regions.find((item) => item.id === regionId) ?? state.regions[0];
  const detectedMonster = MONSTERS.find((monster) => monster.detected === result);
  const captureCount = totalCaptured(state);

  const missionProgress = (id: string): number => {
    if (id === "capture1") return Math.min(1, Math.max(0, captureCount - 4));
    if (id === "plastic") return state.user.captured.plastic > 2 ? 1 : 0;
    if (id === "visit") return state.visitedRegions.length;
    if (id === "safety") return state.safetyViewed ? 1 : 0;
    if (id === "three") return MISSIONS.slice(0, 4).filter((m) => missionProgress(m.id) >= m.target).length;
    return 0;
  };
  const completedCount = MISSIONS.filter((m) => missionProgress(m.id) >= m.target).length;

  const go = (next: Screen) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (next === "safety" && !state.safetyViewed) setState((s) => ({ ...s, safetyViewed: true }));
  };

  const visitRegion = (id: string, destination: Screen = "raid") => {
    setRegionId(id);
    setState((s) => ({ ...s, visitedRegions: s.visitedRegions.includes(id) ? s.visitedRegions : [...s.visitedRegions, id] }));
    go(destination);
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setFileName(file.name);
    setResult(null);
    setAnalysisConfidence(0);
    setCaptureStage("idle");
  };

  const analyze = () => {
    if (!preview || analyzing) return;
    setAnalyzing(true);
    setResult(null);
    setCaptureStage("idle");
    window.setTimeout(() => {
      const fileHint = fileName.toLowerCase();
      const hinted = fileHint.includes("plastic") || fileHint.includes("bottle") || fileHint.includes("병") ? "플라스틱병"
        : fileHint.includes("can") || fileHint.includes("캔") ? "캔"
        : fileHint.includes("vinyl") || fileHint.includes("plastic-bag") || fileHint.includes("비닐") ? "비닐"
        : fileHint.includes("cigarette") || fileHint.includes("담배") ? "담배꽁초"
        : fileHint.includes("net") || fileHint.includes("그물") ? "폐그물"
        : fileHint.includes("jelly") || fileHint.includes("해파리") ? "해파리" : null;
      setResult(hinted ?? ANALYSIS_RESULTS[Math.floor(Math.random() * ANALYSIS_RESULTS.length)]);
      setAnalysisConfidence(hinted ? 94 : 76);
      setAnalyzing(false);
    }, 1900);
  };

  const capture = (monster: Monster) => {
    if (captureStage !== "idle") return;
    setCaptureStage("catching");
    window.setTimeout(() => {
      setState((s) => {
        const currentRegion = s.regions.find((r) => r.id === regionId)!;
        const nextXp = s.user.xp + monster.xp;
        const leveled = nextXp >= s.user.xpGoal;
        return {
          ...s,
          regions: s.regions.map((r) => r.id === regionId ? { ...r, pollution: Math.max(0, r.pollution - 6), trashCount: r.trashCount + 1, cleanupPoints: r.cleanupPoints + monster.points } : r),
          raidHistory: [`${currentRegion.shortName}에서 ${monster.name} 포획`, ...s.raidHistory].slice(0, 20),
          user: {
            ...s.user,
            level: leveled ? s.user.level + 1 : s.user.level,
            xp: leveled ? nextXp - s.user.xpGoal : nextXp,
            xpGoal: leveled ? s.user.xpGoal + 50 : s.user.xpGoal,
            points: s.user.points + monster.points,
            environmentPoints: s.user.environmentPoints + monster.points,
            captured: { ...s.user.captured, [monster.key]: (s.user.captured[monster.key] ?? 0) + 1 },
            activity: [{ id: crypto.randomUUID(), text: `${monster.name} 포획 · ${currentRegion.shortName} 정화`, time: "방금 전" }, ...s.user.activity].slice(0, 12),
          },
        };
      });
      setCaptureStage("success");
    }, 1500);
  };

  const shareRisk = () => {
    setState((s) => ({
      ...s,
      riskReports: [{ id: crypto.randomUUID(), creature: "해파리", location: region.name, time: new Date().toISOString(), severity: "높음", reporters: 1 }, ...s.riskReports],
      regions: s.regions.map((r) => r.id === regionId ? { ...r, reports: r.reports + 1 } : r),
      user: { ...s.user, activity: [{ id: crypto.randomUUID(), text: `${region.shortName} 해파리 위험 위치를 공유했어요`, time: "방금 전" }, ...s.user.activity] },
    }));
    setToast("주변 수호대에게 위험 위치를 공유했어요");
  };

  const cleanupRaid = () => {
    const bossActive = region.pollution <= 30;
    setState((s) => {
      const target = s.regions.find((r) => r.id === regionId)!;
      const willDefeat = bossActive && target.bossHp <= 20;
      return {
        ...s,
        raidHistory: [`${target.shortName} 레이드에 50 POINT 기여`, ...s.raidHistory].slice(0, 20),
        regions: s.regions.map((r) => r.id === regionId ? {
          ...r,
          pollution: bossActive ? r.pollution : Math.max(0, r.pollution - 5),
          cleanupPoints: r.cleanupPoints + 50,
          participants: r.participants + 1,
          bossHp: bossActive ? Math.max(0, r.bossHp - 20) : r.bossHp,
        } : r),
        user: willDefeat ? {
          ...s.user,
          xp: Math.min(s.user.xpGoal - 1, s.user.xp + 150),
          points: s.user.points + 500,
          environmentPoints: s.user.environmentPoints + 500,
          badges: s.user.badges.includes(`${target.shortName} 레이드 영웅`) ? s.user.badges : [...s.user.badges, `${target.shortName} 레이드 영웅`],
          captured: { ...s.user.captured, [`boss-${target.id}`]: 1 },
          activity: [{ id: crypto.randomUUID(), text: `${target.boss} 레이드 클리어!`, time: "방금 전" }, ...s.user.activity],
        } : s.user,
      };
    });
    setToast(bossActive ? (region.bossHp <= 20 ? "보스 정화 성공! 모두에게 보상이 지급됐어요" : "보스에게 정화 에너지 20을 보냈어요") : "정화 50 POINT를 기여했어요");
  };

  const claimMission = (missionId: string) => {
    const mission = MISSIONS.find((m) => m.id === missionId)!;
    if (state.user.claimedMissions.includes(missionId) || missionProgress(missionId) < mission.target) return;
    setState((s) => ({ ...s, user: { ...s.user, xp: s.user.xp + mission.xp, points: s.user.points + mission.points, environmentPoints: s.user.environmentPoints + mission.points, claimedMissions: [...s.user.claimedMissions, missionId], badges: missionId === "safety" ? [...s.user.badges, "안전 수호대"] : s.user.badges } }));
    setToast("미션 보상을 받았어요!");
  };

  const redeem = (product: (typeof PRODUCTS)[number]) => {
    if (state.user.environmentPoints < product.cost) { setToast("환경 포인트가 부족해요"); return; }
    setState((s) => ({ ...s, exchanges: [{ id: crypto.randomUUID(), product: product.name, cost: product.cost, time: new Date().toLocaleString("ko-KR") }, ...s.exchanges], user: { ...s.user, environmentPoints: s.user.environmentPoints - product.cost, activity: [{ id: crypto.randomUUID(), text: `${product.name} 교환 완료`, time: "방금 전" }, ...s.user.activity] } }));
    setToast(`${product.name}을(를) 획득했어요!`);
  };

  const reset = () => {
    if (!window.confirm("모든 게임 데이터를 초기 상태로 되돌릴까요?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setState(cloneInitial());
    setToast("게임 데이터를 초기화했어요");
  };

  if (screen === "start") return <StartScreen onStart={() => go("home")} />;

  return (
    <div className="app-shell">
      {toast && <Toast message={toast} />}
      <header className="topbar">
        <button className="brand-mini" onClick={() => go("home")} aria-label="홈으로"><span>🌊</span><b>바다몬스터고</b></button>
        <button className="location-pill" onClick={() => go("map")}><span>⌖</span>{region.shortName}<b>⌄</b></button>
        <button className="bell" onClick={() => go("safety")} aria-label="안전 알림">♧<i>{state.riskReports.length}</i></button>
      </header>

      <main className="main-content">
        {screen === "home" && <Home state={state} region={region} captureCount={captureCount} completedCount={completedCount} go={go} />}
        {screen === "explore" && <Explore preview={preview} fileName={fileName} analyzing={analyzing} result={result} analysisConfidence={analysisConfidence} monster={detectedMonster} captureStage={captureStage} fileRef={fileRef} onFile={onFile} analyze={analyze} correctResult={(value: string) => { setResult(value); setAnalysisConfidence(99); }} capture={capture} shareRisk={shareRisk} reset={() => { setPreview(null); setResult(null); setAnalysisConfidence(0); setCaptureStage("idle"); }} />}
        {screen === "map" && <BeachMap state={state} visit={visitRegion} />}
        {screen === "raid" && <Raid region={region} cleanup={cleanupRaid} goMap={() => go("map")} />}
        {screen === "dex" && <DexV2 captured={state.user.captured} />}
        {screen === "missions" && <Missions claimed={state.user.claimedMissions} progress={missionProgress} claim={claimMission} />}
        {screen === "safety" && <SafetyMap reports={state.riskReports} goExplore={() => go("explore")} />}
        {screen === "store" && <Store state={state} redeem={redeem} />}
        {screen === "profile" && <Profile state={state} captureCount={captureCount} completedCount={completedCount} go={go} reset={reset} />}
      </main>
      <BottomNav screen={screen} go={go} />
    </div>
  );
}

function StartScreen({ onStart }: { onStart: () => void }) {
  return <main className="start-screen">
    <div className="sun" />
    <div className="start-cloud c1">☁</div><div className="start-cloud c2">☁</div>
    <div className="start-content">
      <span className="start-kicker">BUSAN OCEAN ADVENTURE</span>
      <div className="busan-start-art"><img src="busan-hero.png" alt="광안대교와 부산 바다, 갈매기 일러스트" /></div>
      <div className="start-seagull" aria-label="부산 갈매기 캐릭터"><img src="/bada-monster-go/start-seagull-card.png" alt="부산 갈매기 일러스트" /></div>
      <h1>바다몬스터<span>GO!</span></h1>
      <p>게임으로 부산 바다를 지켜요!</p>
      <button className="start-button" onClick={onStart}><span>▶</span> 게임 시작</button>
      <small>사진 한 장으로 시작하는 바다 정화 모험</small>
    </div>
    <div className="ocean-layer ocean-back" /><div className="ocean-layer ocean-front" />
    <div className="start-sand"><span>🐚</span><span>⭐</span><span>🦀</span></div>
  </main>;
}

function Home({ state, region, captureCount, completedCount, go }: { state: GameState; region: GameState["regions"][number]; captureCount: number; completedCount: number; go: (s: Screen) => void }) {
  const nextMission = MISSIONS.find((m) => !state.user.claimedMissions.includes(m.id)) ?? MISSIONS[0];
  return <>
    <section className="hero-card">
      <div className="hero-busan-image" /><div className="hero-wave" /><div className="hero-copy"><span className="hello">BUSAN OCEAN GUARDIAN · {region.shortName} 작전</span><h1>{state.user.nickname}</h1><p>오늘도 부산 바다를 함께 지켜볼까요?</p></div>
      <div className="mascot busan-mark"><span>🐬</span><i>🪼</i></div>
      <div className="level-row"><b>LV.{state.user.level}</b><Progress value={state.user.xp} max={state.user.xpGoal} tone="light" /><span>{state.user.xp} / {state.user.xpGoal} EXP</span></div>
    </section>
    <section className="stats-grid">
      <div className="stat-card"><span className="stat-icon coin">●</span><div><small>게임 포인트</small><b>{state.user.points.toLocaleString()} P</b></div></div>
      <div className="stat-card"><span className="stat-icon monster">♚</span><div><small>포획 몬스터</small><b>{captureCount} 마리</b></div></div>
    </section>
    <section className="camera-cta">
      <div><span>AI 바다 탐험</span><h2>사진 속 오염 몬스터를<br />찾아보세요!</h2><button onClick={() => go("explore")}>📷 카메라 탐험 시작 <b>›</b></button></div>
      <div className="bottle-monster">👾<i>⚡</i></div>
    </section>
    <SectionTitle eyebrow="DAILY MISSION" title="오늘의 미션" action="전체보기" onAction={() => go("missions")} />
    <section className="mission-preview">
      <div className="mission-icon">{nextMission.icon}</div><div><b>{nextMission.title}</b><p>{nextMission.reward}</p><Progress value={completedCount} max={3} tone="mint" /></div><span>{Math.min(completedCount, 3)}/3</span>
    </section>
    <SectionTitle title="부산 바다 현황" action="지도보기" onAction={() => go("map")} />
    <section className="ocean-status">
      <div><span className={`status-dot ${pollutionLabel(region.pollution).className}`} /> <b>{region.name}</b><p>수호대 {region.participants}명이 정화 중이에요</p></div><div className="pollution-score"><strong>{region.pollution}%</strong><small>오염도</small></div>
    </section>
    <section className="quick-grid">
      <button onClick={() => go("raid")}><span>⚔️</span><b>지역 레이드</b><small>함께 보스 정화</small></button>
      <button onClick={() => go("dex")}><span>📖</span><b>몬스터 도감</b><small>{captureCount}마리 포획</small></button>
      <button onClick={() => go("safety")}><span>🛟</span><b>안전 정보</b><small>{state.riskReports.length}건 공유 중</small></button>
      <button onClick={() => go("store")}><span>🎁</span><b>포인트 상점</b><small>{state.user.environmentPoints.toLocaleString()} P</small></button>
    </section>
  </>;
}

function Explore({ preview, fileName, analyzing, result, analysisConfidence, monster, captureStage, fileRef, onFile, analyze, correctResult, capture, shareRisk, reset }: any) {
  return <>
    <div className="page-heading"><span>AI CAMERA EXPLORATION</span><h1>카메라 탐험</h1><p>해변에서 발견한 쓰레기나 위험 생물을 촬영해 주세요.</p></div>
    {!preview ? <section className="upload-zone" onClick={() => fileRef.current?.click()}>
      <div className="camera-orb">📷<i>+</i></div><h2>바다의 흔적을 찍어볼까요?</h2><p>사진을 촬영하거나 갤러리에서 선택해 주세요.</p><button>사진 촬영 · 선택</button><small>JPG, PNG · 최대 10MB 권장</small>
    </section> : <section className="photo-preview">
      <img src={preview} alt="분석할 해변 사진 미리보기" /><div className="photo-label"><span>✓</span><p><b>사진 준비 완료</b><small>{fileName}</small></p><button onClick={reset}>다시 선택</button></div>
    </section>}
    <input ref={fileRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={onFile} />
    {preview && !result && <button className="primary-button analyze-button" disabled={analyzing} onClick={analyze}>{analyzing ? <><span className="spinner" /> AI가 바다 오염을 분석하고 있어요</> : <>✨ AI 분석하기</>}</button>}
    {analyzing && <div className="scan-card"><div className="scan-line" /><span>물체 형태와 해양 안전 데이터를 비교 중...</span></div>}
    {result && <div className="analysis-confidence"><span>AI DEMO MATCH</span><b>{result}</b><strong>{analysisConfidence}%</strong><small>{analysisConfidence >= 90 ? "파일명·촬영 정보 힌트를 함께 반영했어요" : "실제 서비스에서는 학습된 이미지 모델로 교체할 수 있어요"}</small></div>}{result && <section className="result-correction"><b>결과가 다르면 직접 선택해 주세요</b><div>{["플라스틱병", "캔", "비닐", "담배꽁초", "폐그물", "스티로폼", "유리", "해파리", "일반 물체"].map((item) => <button key={item} className={result === item ? "active" : ""} onClick={() => correctResult(item)}>{item}</button>)}</div></section>}
    {result === "일반 물체" && <section className="result-empty"><span>🌊</span><h2>오염 물체가 아니에요</h2><p>깨끗한 바다를 확인했어요. 다른 곳도 탐험해 보세요!</p><button onClick={reset}>새 사진 분석하기</button></section>}
    {result === "해파리" && <SafetyResult share={shareRisk} />}
    {monster && <MonsterEncounter monster={monster} stage={captureStage} onCapture={() => capture(monster)} />}
    {!preview && <section className="camera-tips"><b>💡 촬영 팁</b><ul><li>물체가 화면 중앙에 오게 해주세요.</li><li>안전한 거리에서 밝게 촬영해 주세요.</li><li>위험 생물에는 절대 가까이 가지 마세요.</li></ul></section>}
  </>;
}

function MonsterEncounter({ monster, stage, onCapture }: { monster: Monster; stage: string; onCapture: () => void }) {
  return <section className={`encounter ${stage}`}>
    {stage === "success" ? <div className="success-panel"><div className="success-burst">✨<span>{monster.emoji}</span>✨</div><span className="success-label">MISSION CLEAR</span><h2>정화 성공!</h2><p>{monster.name}이(가) 도감에 등록됐어요.</p><div className="reward-row"><div><span>⭐</span><b>+{monster.xp}</b><small>경험치</small></div><div><span>🪙</span><b>+{monster.points}</b><small>환경 포인트</small></div><div><span>📖</span><b>등록</b><small>몬스터 도감</small></div></div><div className="real-world-note">♻️ <b>현실의 쓰레기도 꼭 치워 주세요!</b><small>안전하게 분리수거함에 넣으면 진짜 정화 완료</small></div></div> : <>
      <div className="encounter-tag">⚠ 오염 몬스터 출현!</div><div className="monster-stage"><div className="monster-glow" /><img src={monster.image} alt={`${monster.name} 몬스터`} />{stage === "catching" && <div className="capture-ring" />}</div>
      <div className="monster-card"><div><span className={`rarity ${monster.rarity}`}>{monster.rarity}</span><small>{monster.kind} 오염형</small><h2>{monster.name}</h2><p>바다에 버려진 {monster.detected}에서 태어난 오염 몬스터!</p></div><div className="pollution-meter"><span>오염도</span><b>{monster.pollution}</b><Progress value={monster.pollution} tone="coral" /></div><div className="loot"><span>획득 가능</span><b>⭐ {monster.xp} EXP</b><b>🪙 {monster.points} P</b></div></div>
      <button className="capture-button" onClick={onCapture} disabled={stage === "catching"}>{stage === "catching" ? <><span className="capture-ball">◉</span> 포획 에너지 집중 중...</> : <>◉ 포획하기</>}</button>
    </>}
  </section>;
}

function SafetyResult({ share }: { share: () => void }) {
  return <section className="safety-result"><div className="danger-banner"><span>⚠</span><div><small>DANGER DETECTED</small><h2>위험 생물을 발견했습니다</h2></div></div><div className="jelly-stage">🪼<i>접근 금지</i></div><div className="safety-card"><div className="safety-title"><div><small>감지 생물</small><h2>해파리</h2></div><span>위험도 높음</span></div><dl><div><dt>발견 위치</dt><dd>현재 선택 해변 인근</dd></div><div><dt>발견 시간</dt><dd>방금 전</dd></div></dl><h3>안전 대처 방법</h3><ul><li>발견한 생물에 손대지 않기</li><li>주변 사람에게 알리기</li><li>안전요원에게 신고하기</li><li>쏘였을 경우 상처 부위를 문지르지 않기</li><li>증상이 심하면 119에 신고하기</li></ul><p className="warning-note">파도에 떠밀려온 죽은 해파리도 독침이 남아 있을 수 있어요.</p></div><button className="danger-button" onClick={share}>⌖ 위험 위치 공유하기</button></section>;
}

function BeachMap({ state, visit }: { state: GameState; visit: (id: string, destination?: Screen) => void }) {
  const mapRegions = ["songjeong", "haeundae", "gwangalli", "dadaepo"].map((id) => state.regions.find((region) => region.id === id)!).filter(Boolean);
  return <><div className="page-heading"><span>BUSAN OCEAN MAP</span><h1>부산 해변 지도</h1><p>오염도가 높을수록 지도 위 정화 영역이 넓게 표시돼요.</p></div><div className="map-visual"><div className="map-water">BUSAN<br /><b>OCEAN</b></div>{mapRegions.map((r, i) => <button key={`zone-${r.id}`} className={`map-zone zone-${i} ${pollutionLabel(r.pollution).className}`} style={{ "--pollution": `${r.pollution}%` } as CSSProperties} onClick={() => visit(r.id)}><span>{r.shortName}</span><b>{r.pollution}%</b></button>)}{mapRegions.map((r, i) => <button key={r.id} className={`map-pin pin-${i} ${pollutionLabel(r.pollution).className}`} onClick={() => visit(r.id)}><span>{r.pollution}%</span><b>{r.shortName}</b></button>)}</div><div className="map-legend"><span><i className="clean" /> 깨끗함 · 작은 영역</span><span><i className="normal" /> 보통</span><span><i className="danger" /> 주의 · 넓은 영역</span></div><div className="region-list">{state.regions.map((r) => { const status = pollutionLabel(r.pollution); return <article className="region-card" key={r.id}><div className="region-top"><div><span className={`status-badge ${status.className}`}>{status.label}</span><h2>{r.name}</h2><p>등장 몬스터 · {r.monsters.join(", ")}</p></div><div className="region-score"><b>{r.pollution}%</b><small>오염도</small></div></div><Progress value={r.pollution} tone={status.className} /><div className="region-metrics"><span>🗑️ <b>{r.trashCount}</b><small>쓰레기 발견</small></span><span>👥 <b>{r.participants}</b><small>정화 참여자</small></span><span>⚠️ <b>{r.reports}</b><small>위험 신고</small></span></div><div className="region-mission"><span>오늘 미션</span><b>{r.mission}</b></div><div className="boss-peek">{r.bossImage ? <img src={r.bossImage} alt={r.boss} /> : <span>{r.bossEmoji}</span>}<div><small>REGION BOSS</small><b>{r.boss}</b></div><button onClick={() => visit(r.id)}>레이드 ›</button></div></article>; })}</div></>;
}

function Raid({ region, cleanup, goMap }: { region: GameState["regions"][number]; cleanup: () => void; goMap: () => void }) {
  const bossActive = region.pollution <= 30;
  const defeated = region.bossHp <= 0;
  return <><div className="page-heading raid-heading"><span>CO-OP CLEANUP RAID</span><h1>{region.shortName} 해변 정화 레이드</h1><button onClick={goMap}>지역 변경 ⌄</button></div><section className="raid-hero"><div className="raid-sky">{region.bossImage ? <img className={`boss-image ${bossActive ? "boss-active" : "boss-locked"}`} src={region.bossImage} alt={region.boss} /> : <span className={bossActive ? "boss-active" : "boss-locked"}>{region.bossEmoji}</span>}<div className="raid-users">👥 {region.participants}명 참여 중</div></div><div className="raid-panel"><div className="raid-stat"><span>현재 지역 오염도</span><strong>{region.pollution}%</strong></div><Progress value={region.pollution} tone={region.pollution > 60 ? "coral" : "mint"} /><div className="threshold"><span>0% 깨끗</span><b>보스 출현 30%</b><span>100% 위험</span></div></div></section>
    {!bossActive ? <section className="boss-lock"><span className="lock-icon">🔒</span><small>출현 예정 보스</small><h2>{region.bossEmoji} {region.boss}</h2><p>지역 오염도를 <b>30% 이하</b>로 낮추면<br />봉인이 풀리고 보스가 나타나요!</p><div className="cleanup-needed"><span>필요 정화량</span><strong>{Math.max(0, (region.pollution - 30) * 10)} POINT</strong></div><button className="primary-button" onClick={cleanup}>♻️ 정화 활동 +50P</button></section> : <section className={`boss-battle ${defeated ? "defeated" : ""}`}><div className="boss-alert">{defeated ? "RAID CLEAR" : "⚡ BOSS APPEARED ⚡"}</div><div className="boss-avatar">{region.bossEmoji}</div><h2>{defeated ? `${region.boss} 정화 완료!` : region.boss}</h2><p>{defeated ? "참여한 모든 수호대에게 보상이 지급됐어요." : "수호대의 정화 에너지를 모아 보스를 물리치세요!"}</p><div className="hp-label"><span>BOSS HP</span><b>{region.bossHp} / 100</b></div><Progress value={region.bossHp} tone="coral" /><div className="raid-rewards"><span>⭐ 150 EXP</span><span>📖 희귀 도감</span><span>🪙 500 P</span></div>{!defeated && <button className="danger-button" onClick={cleanup}>⚡ 정화 에너지 공격</button>}</section>}
    <section className="raid-community"><SectionTitle title="수호대 공동 목표" /><div className="community-row"><div className="avatar-stack"><i>🧑</i><i>👩</i><i>🧒</i><i>+{Math.max(0, region.participants - 3)}</i></div><p>오늘 <b>{region.participants}명</b>이 함께<br /><span>{region.cleanupPoints.toLocaleString()} POINT</span>를 정화했어요</p></div></section></>;
}

function Dex({ captured }: { captured: Record<string, number> }) {
  const caught = MONSTERS.filter((m) => (captured[m.key] ?? 0) > 0).length;
  return <><div className="page-heading"><span>MONSTER COLLECTION</span><h1>몬스터 도감</h1><p>부산 바다 곳곳의 오염 몬스터를 발견해 보세요.</p></div><section className="dex-summary"><div><small>발견</small><b>{found}</b></div><div><small>미발견</small><b>{MONSTERS.length - found}</b></div><div><small>전체</small><b>{MONSTERS.length}</b></div></section><div className="filter-pills"><button className="active">전체</button><button>포획 완료</button><button>미발견</button></div><section className="dex-grid">{MONSTERS.map((m) => { const count = captured[m.key] ?? 0; return <article key={m.key} className={`dex-card ${count ? "found" : "unknown"}`}><div className="dex-image">{count ? <img src={m.image} alt={`${m.name} 도감 이미지`} /> : <span>?</span>}<i>{count ? "✓ 포획" : "미발견"}</i></div><div><span className={`rarity ${m.rarity}`}>{m.rarity}</span><h2>{count ? m.name : "???"}</h2><p>{count ? `${m.kind} 오염형` : "탐험으로 발견하세요"}</p><b>{count ? `포획 ${count}회` : "LOCKED"}</b></div></article>; })}</section></>;
}

function DexV2({ captured: _captured }: { captured: Record<string, number> }) {
  const [filter, setFilter] = useState<"all" | "found" | "unknown">("all");
  const demoCaptureCounts = [3, 2, 5, 1, 4, 2];
  const visible = filter === "unknown" ? [] : MONSTERS;
  return <>
    <div className="page-heading"><span>MONSTER COLLECTION</span><h1>몬스터 도감</h1><p>부산 바다에서 만난 정화 몬스터를 모아보세요.</p></div>
    <section className="dex-summary"><div><small>발견</small><b>6</b></div><div><small>미발견</small><b>0</b></div><div><small>전체</small><b>6</b></div></section>
    <div className="filter-pills"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>전체</button><button className={filter === "found" ? "active" : ""} onClick={() => setFilter("found")}>포획 완료</button><button className={filter === "unknown" ? "active" : ""} onClick={() => setFilter("unknown")}>미발견</button></div>
    <section className="dex-grid">{visible.map((m, index) => <article className="dex-card is-found" key={m.key}><div className="dex-art"><img src={m.image} alt={m.name} /></div><div className="dex-card-body"><b>{m.name}</b><small>{m.kind} · 일반</small><em>포획 {demoCaptureCounts[index]}회</em></div></article>)}</section>
  </>;
}
function Missions({ claimed, progress, claim }: { claimed: string[]; progress: (id: string) => number; claim: (id: string) => void }) {
  return <><div className="page-heading"><span>DAILY ECO MISSIONS</span><h1>미션 & 보상</h1><p>작은 실천으로 경험치와 환경 포인트를 모아보세요.</p></div><section className="mission-streak"><div><small>TODAY&apos;S PROGRESS</small><h2>오늘도 멋진 정화 중!</h2><p>미션 3개를 완료하면 특별 보상이 열려요.</p></div><span>🔥<b>{Math.min(progress("three"), 3)}/3</b></span></section><div className="mission-list">{MISSIONS.map((m) => { const value = progress(m.id); const done = value >= m.target; const isClaimed = claimed.includes(m.id); return <article key={m.id} className={done ? "complete" : ""}><div className="mission-big-icon">{m.icon}</div><div className="mission-info"><small>{done ? "미션 완료!" : "진행 중"}</small><h2>{m.title}</h2><p>{m.reward}</p><Progress value={value} max={m.target} tone={done ? "mint" : "blue"} /><span>{Math.min(value, m.target)} / {m.target}</span></div><button disabled={!done || isClaimed} onClick={() => claim(m.id)}>{isClaimed ? "수령 완료" : done ? "보상 받기" : "도전 중"}</button></article>; })}</div><section className="policy-note"><span>🌺</span><div><b>동백전 포인트 연계 예정</b><p>향후 부산시 및 동백전과 협의 후 연계 가능한 기능입니다. 현재 데모에서는 실제 동백전이 지급되지 않습니다.</p></div></section></>;
}

const CREATURE_GUIDE = [
  { emoji: "🪼", name: "해파리", risk: "높음", feature: "투명한 몸과 긴 촉수", action: "손대지 말고 안전요원에게 신고" },
  { emoji: "☠️", name: "독성 해양 생물", risk: "높음", feature: "선명한 색이나 가시가 있을 수 있음", action: "접촉하지 말고 즉시 거리 확보" },
  { emoji: "🐟", name: "가오리", risk: "주의", feature: "모래 속에 몸을 숨김", action: "발을 끌며 천천히 물 밖으로 이동" },
  { emoji: "🦈", name: "상어 출현", risk: "높음", feature: "등지느러미와 빠른 유영", action: "침착하게 물 밖으로 나와 119 신고" },
];

function SafetyMap({ reports, goExplore }: { reports: GameState["riskReports"]; goExplore: () => void }) {
  const beaches = ["해운대해수욕장", "광안리해수욕장", "송정해수욕장", "다대포해수욕장"];
  return <><div className="page-heading safety-heading"><span>REAL-TIME OCEAN SAFETY</span><h1>바다 안전 지도</h1><p>시민 수호대가 공유한 최신 위험 생물 정보예요.</p><button onClick={goExplore}>📷 위험 생물 신고하기</button></div><section className="safety-overview"><div><span className="pulse-dot" /><b>실시간 안전 현황</b><small>최근 신고 {reports.length}건</small></div><p>현장 상황은 빠르게 바뀔 수 있어요. 안전요원의 안내를 우선해 주세요.</p></section><div className="beach-safety-list">{beaches.map((beach) => { const report = reports.find((r) => r.location === beach); const status = report?.severity === "높음" ? "risk" : report ? "caution" : "safe"; return <article key={beach}><div className={`safety-state ${status}`}>{status === "risk" ? "🔴 위험" : status === "caution" ? "🟡 주의" : "🟢 안전"}</div><div className="beach-name"><span>🌊</span><div><h2>{beach}</h2>{report ? <p>⚠ {report.creature} 발견</p> : <p>현재 공유된 위험 정보가 없어요</p>}</div></div>{report && <div className="report-detail"><span><small>위험도</small><b>{report.severity}</b></span><span><small>발견 시간</small><b>{timeAgo(report.time)}</b></span><span><small>신고자</small><b>{report.reporters}명</b></span></div>}</article>; })}</div><SectionTitle eyebrow="SAFETY GUIDE" title="위험 생물 대처 가이드" /><div className="creature-guide">{CREATURE_GUIDE.map((c) => <article key={c.name}><span>{c.emoji}</span><div><div><h3>{c.name}</h3><i className={c.risk === "높음" ? "risk" : "caution"}>{c.risk}</i></div><p><b>특징</b> {c.feature}</p><p><b>대처</b> {c.action}</p></div></article>)}</div><div className="emergency">🚨 긴급 상황은 즉시 <b>119</b> 또는 현장 안전요원에게 신고하세요.</div></>;
}

function Store({ state, redeem }: { state: GameState; redeem: (product: (typeof PRODUCTS)[number]) => void }) {
  return <><div className="page-heading"><span>ECO POINT REWARD SHOP</span><h1>포인트 교환 상점</h1><p>바다를 지키며 모은 포인트를 특별한 보상으로 바꿔요.</p></div><section className="wallet-card"><div><small>나의 환경 포인트</small><strong>{state.user.environmentPoints.toLocaleString()} <i>POINT</i></strong><p>정화 활동으로 차곡차곡 모았어요 ♻</p></div><span>🪙</span></section><SectionTitle title="교환 가능한 상품" /><div className="product-list">{PRODUCTS.map((product) => { const affordable = state.user.environmentPoints >= product.cost; return <article key={product.id} className={product.color}><div className="product-emoji">{product.emoji}</div><div><small>BUSAN ECO REWARD</small><h2>{product.name}</h2><p>{product.description}</p><b>{product.cost.toLocaleString()} POINT</b></div><button disabled={!affordable} onClick={() => redeem(product)}>{affordable ? "교환하기" : "포인트 부족"}</button></article>; })}</div>{state.exchanges.length > 0 && <><SectionTitle title="나의 교환 내역" /><div className="exchange-list">{state.exchanges.map((e) => <div key={e.id}><span>✓</span><p><b>{e.product}</b><small>{e.time}</small></p><strong>-{e.cost.toLocaleString()} P</strong></div>)}</div></>}<section className="shop-note"><b>데모 교환 안내</b><p>현재 상품은 시연용이며 실제 쿠폰이 발급되지 않습니다. 향후 부산 지역 제휴처와 연계할 수 있어요.</p></section></>;
}

function Profile({ state, captureCount, completedCount, go, reset }: { state: GameState; captureCount: number; completedCount: number; go: (s: Screen) => void; reset: () => void }) {
  const diver = ["🌊","🐚","🐬","🪼"][state.user.level % 4];
  return <><section className="profile-hero"><div className="profile-avatar"><span>{["🌊","🐚","🐬","🪼"][state.user.level % 4]}</span><i>LV.{state.user.level}</i></div><small>BUSAN OCEAN GUARDIAN</small><h1>{state.user.nickname}</h1><p>부산 바다를 지키는 멋진 수호대장</p><div className="profile-xp"><span><b>다음 레벨까지</b><i>{state.user.xp} / {state.user.xpGoal} EXP</i></span><Progress value={state.user.xp} max={state.user.xpGoal} tone="light" /></div></section><section className="profile-stats"><div><span>♚</span><b>{captureCount}</b><small>포획 몬스터</small></div><div><span>✓</span><b>{completedCount}</b><small>완료 미션</small></div><div><span>♻</span><b>{state.user.environmentPoints.toLocaleString()}</b><small>환경 포인트</small></div></section><button className="eco-wallet" onClick={() => go("store")}><span>🪙</span><div><small>MY ECO POINT</small><b>{state.user.environmentPoints.toLocaleString()} POINT</b><p>포인트로 부산의 특별한 보상을 만나보세요.</p></div><i>상점 가기 ›</i></button><SectionTitle title="획득한 배지" /><section className="badge-row">{state.user.badges.map((badge, i) => <div key={`${badge}-${i}`}><span>{i % 3 === 0 ? "🌊" : i % 3 === 1 ? "♻️" : "🏆"}</span><b>{badge}</b></div>)}</section><SectionTitle title="최근 활동 기록" /><section className="activity-list">{state.user.activity.map((a) => <div key={a.id}><span>✓</span><p><b>{a.text}</b><small>{a.time}</small></p></div>)}</section><section className="settings"><button onClick={() => go("missions")}><span>🎯</span>미션 보상 관리<i>›</i></button><button onClick={() => go("safety")}><span>🛟</span>바다 안전 정보<i>›</i></button><button className="reset-button" onClick={reset}><span>↻</span>게임 데이터 초기화<i>›</i></button></section><p className="version">바다몬스터고 Demo v1.1 · Made for Busan</p></>;
}

function BottomNav({ screen, go }: { screen: Screen; go: (s: Screen) => void }) {
  const items: { id: Screen; icon: string; label: string }[] = [{ id: "home", icon: "⌂", label: "홈" }, { id: "explore", icon: "⌾", label: "탐험" }, { id: "map", icon: "⌖", label: "지도" }, { id: "dex", icon: "▣", label: "도감" }, { id: "profile", icon: "♙", label: "마이" }];
  return <nav className="bottom-nav">{items.map((item) => <button key={item.id} className={screen === item.id || (item.id === "map" && screen === "raid") ? "active" : ""} onClick={() => go(item.id)}><span>{item.icon}</span><b>{item.label}</b></button>)}</nav>;
}
