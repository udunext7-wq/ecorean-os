'use client';

// 업무 허브 v8 — 잡고 돌리는 3단 깊이 팬 카루셀 (대표 지시 2026-08-25)
// 5장이 모두 정면을 향해 서 있고(글씨 항상 가독), 크기 3단계: 중앙 > 안쪽 한 쌍 > 바깥 한 쌍.
// 마우스로 잡고 좌우로 돌리면 회전, 놓으면 가장 가까운 카드가 중앙에 스냅. 자동 회전 없음.
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
} from 'react';
import { Cinzel, JetBrains_Mono, Noto_Sans_KR } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400'], display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['300', '400'], display: 'swap' });
const noto = Noto_Sans_KR({ subsets: ['latin'], weight: ['300', '400', '500', '700'], display: 'swap' });

export type TreeItem = { href: string; name: string; desc: string; admin?: boolean };
export type TreeSection = { title: string; desc: string; items: TreeItem[] };

type Slot = { kind: 'section'; sec: TreeSection } | { kind: 'ghost' };

const SEL_KEY = 'ecorean.hubFan.section';
const ANIM_MS = 520;

function mod(a: number, b: number) {
  return ((a % b) + b) % b;
}

export function HubFan({ sections }: { sections: TreeSection[] }) {
  // 배치: 중앙(0)·우안쪽(1)·우바깥(2)·좌바깥(3)·좌안쪽(4)
  const slots: Slot[] = [
    sections[0] ? { kind: 'section', sec: sections[0] } : { kind: 'ghost' },
    sections[1] ? { kind: 'section', sec: sections[1] } : { kind: 'ghost' },
    sections[2] ? { kind: 'section', sec: sections[2] } : { kind: 'ghost' },
    { kind: 'ghost' },
    sections[3] ? { kind: 'section', sec: sections[3] } : { kind: 'ghost' },
  ];
  const n = slots.length;
  const step = 360 / n;
  const [rot, setRot] = useState(0);
  const [vw, setVw] = useState(1280);
  const rotRef = useRef(0);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<{ x: number; rot0: number; moved: boolean } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const dragEndAt = useRef(0);
  const prevFront = useRef<number | null>(null);
  const pendingRot = useRef(0);
  const moveRaf = useRef(0);
  const animRaf = useRef(0);
  const vel = useRef(0); // px/ms (지수 평활)
  const lastMove = useRef<{ t: number; x: number } | null>(null);
  rotRef.current = rot;

  useEffect(
    () => () => {
      cancelAnimationFrame(moveRaf.current);
      cancelAnimationFrame(animRaf.current);
    },
    [],
  );

  function ensureCtx(): AudioContext | null {
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
      return ctx;
    } catch {
      return null;
    }
  }

  // 바람(휘익) — 묵직한 저역 노이즈 스윕 (창 넘어갈 때)
  function playWhoosh() {
    const ctx = ensureCtx();
    if (!ctx) return;
    try {
      const dur = 1.05;
      const t0 = ctx.currentTime;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = 0.6;
      band.frequency.setValueAtTime(90, t0);
      band.frequency.exponentialRampToValueAtTime(420, t0 + dur * 0.45);
      band.frequency.exponentialRampToValueAtTime(80, t0 + dur);
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 650;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.17, t0 + dur * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(band);
      band.connect(low);
      low.connect(gain);
      gain.connect(ctx.destination);
      src.start(t0);
      src.stop(t0 + dur);
    } catch {
      /* 사운드는 장식 — 실패해도 무시 */
    }
  }

  // 저음 "둥" 합성 공통부 — 사인 기본음(피치 하강) + 옅은 배음, 로우패스로 각을 죽인다
  // (대표 지시 2026-08-25: 삑삑이 대신 고급스러운 저음 타격감)
  function playThud(
    ctx: AudioContext,
    opts: { f0: number; f1: number; dur: number; gain: number; harm: number },
  ) {
    const t0 = ctx.currentTime;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 520;
    const master = ctx.createGain();
    master.gain.value = 1;
    low.connect(master);
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(opts.f0, t0);
    osc.frequency.exponentialRampToValueAtTime(opts.f1, t0 + opts.dur * 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(g);
    g.connect(low);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.02);

    // 옅은 옥타브 배음 — 울림의 몸통
    const h = ctx.createOscillator();
    h.type = 'sine';
    h.frequency.setValueAtTime(opts.f0 * 2, t0);
    h.frequency.exponentialRampToValueAtTime(opts.f1 * 2, t0 + opts.dur * 0.6);
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(0.0001, t0);
    hg.gain.exponentialRampToValueAtTime(opts.gain * opts.harm, t0 + 0.015);
    hg.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur * 0.65);
    h.connect(hg);
    hg.connect(low);
    h.start(t0);
    h.stop(t0 + opts.dur);
  }

  // 효과음 샘플 캐시 — 호버(심장박동)·클릭(모던 클릭) 실제 샘플 (대표 지시 2026-08-25)
  const HEART_SFX = '/audio/sfx-heartbeat.mp3';
  const CLICK_SFX = '/audio/sfx-click.wav';
  const sfxBufs = useRef<Record<string, AudioBuffer | undefined>>({});
  const sfxLoading = useRef<Record<string, boolean>>({});

  function loadSfx(ctx: AudioContext, url: string) {
    if (sfxBufs.current[url] || sfxLoading.current[url]) return;
    sfxLoading.current[url] = true;
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((ab) => ctx.decodeAudioData(ab))
      .then((buf) => {
        sfxBufs.current[url] = buf;
      })
      .catch(() => {
        sfxLoading.current[url] = false; // 실패 시 재시도 허용
      });
  }

  // 진입 시 미리 디코드 (AudioContext 는 제스처 전엔 suspended 로 생성돼도 디코드는 가능)
  useEffect(() => {
    const ctx = ensureCtx();
    if (ctx) {
      loadSfx(ctx, HEART_SFX);
      loadSfx(ctx, CLICK_SFX);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 샘플 재생 — 아직 로드 전이면 false (호출부가 합성음 폴백)
  function playSample(url: string, gain: number): boolean {
    const ctx = ensureCtx();
    if (!ctx) return false;
    const buf = sfxBufs.current[url];
    if (!buf) {
      loadSfx(ctx, url);
      return false;
    }
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(g);
      g.connect(ctx.destination);
      src.start();
      return true;
    } catch {
      return false;
    }
  }

  // 모듈 줄 호버 — 심장박동
  const lastBlip = useRef(0);
  function playBlip() {
    const now = performance.now();
    if (now - lastBlip.current < 280) return; // 연타 방지
    lastBlip.current = now;
    if (!playSample(HEART_SFX, 0.5)) {
      const ctx = ensureCtx();
      if (ctx) playThud(ctx, { f0: 210, f1: 140, dur: 0.22, gain: 0.05, harm: 0.25 });
    }
  }

  // 모듈 클릭 — 모던 클릭 샘플 (MA_BANT Modern Clicks And Beeps 3)
  function playSelect() {
    if (!playSample(CLICK_SFX, 0.55)) {
      const ctx = ensureCtx();
      if (ctx) playThud(ctx, { f0: 160, f1: 82, dur: 0.5, gain: 0.13, harm: 0.2 });
    }
  }

  // 클릭음의 몸통이 들린 뒤 이동 (여운은 페이지 전환과 겹쳐 자연 소멸)
  function onItemClick(e: ReactMouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    playSelect();
    window.setTimeout(() => {
      window.location.href = href;
    }, 190);
  }

  useEffect(() => {
    function measure() {
      setVw(window.innerWidth);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SEL_KEY);
      const i = slots.findIndex((s) => s.kind === 'section' && s.sec.title === saved);
      if (i >= 0) setRot(-i * step);
    } catch {
      /* no-op */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const front = mod(Math.round(-rot / step), n);

  // 창이 한 칸 넘어갈 때마다 바람소리 1회 (드래그로 여러 칸 지나면 칸마다)
  useEffect(() => {
    if (prevFront.current === null) {
      prevFront.current = front;
      return;
    }
    if (prevFront.current !== front) {
      prevFront.current = front;
      playWhoosh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front]);

  // 목표 회전각으로 JS 프레임 감속 애니메이션 — 회전각을 직접 보간하므로
  // 몇 칸을 돌든 카드가 항상 원호(궤도)를 따라 움직인다 (CSS 직선 보간 붕괴 방지)
  function animateTo(target: number, durSec: number) {
    cancelAnimationFrame(animRaf.current);
    const startRot = rotRef.current;
    const t0 = performance.now();
    const durMs = durSec * 1000;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3.4); // 긴 감속 꼬리
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / durMs);
      setRot(startRot + (target - startRot) * ease(t));
      if (t < 1) animRaf.current = requestAnimationFrame(frame);
    };
    animRaf.current = requestAnimationFrame(frame);
    const idx = mod(Math.round(-target / step), n);
    const slot = slots[idx];
    try {
      localStorage.setItem(SEL_KEY, slot.kind === 'section' ? slot.sec.title : '__reserved');
    } catch {
      /* no-op */
    }
  }

  function snapTo(i: number) {
    const r = rotRef.current;
    const delta = mod(-i * step - r + 180, 360) - 180;
    animateTo(r + delta, ANIM_MS / 1000);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    // 여기서 pointer capture 를 걸면 카드 안 링크 클릭이 가로채져 안 열린다 —
    // 실제 드래그가 시작된 순간(onPointerMove)에만 capture 한다.
    cancelAnimationFrame(animRaf.current); // 회전 중 잡으면 그 자리에서 멈춰 이어잡기
    dragging.current = { x: e.clientX, rot0: rotRef.current, moved: false };
    vel.current = 0;
    lastMove.current = { t: performance.now(), x: e.clientX };
  }
  // 시차 틸트 없음 — 드래그 외에는 무대가 완전히 정지 (안정감 유지, 대표 지시)
  // 드래그 갱신은 rAF 스로틀 — 모바일에서 프레임당 1회만 렌더해 부드럽게
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = dragging.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      try {
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
    }
    if (d.moved) {
      // 민감도: 폰은 짧은 스와이프로 한 칸, 데스크톱도 기존보다 기민하게 (대표 지시 2026-08-25)
      const sens = vw < 640 ? 0.55 : 0.38;
      pendingRot.current = d.rot0 + dx * sens;
      // 속도 추적 (관성용)
      const now = performance.now();
      const lm = lastMove.current;
      if (lm) {
        const dt = Math.max(1, now - lm.t);
        vel.current = vel.current * 0.75 + ((e.clientX - lm.x) / dt) * 0.25;
      }
      lastMove.current = { t: now, x: e.clientX };
      if (!moveRaf.current) {
        moveRaf.current = requestAnimationFrame(() => {
          moveRaf.current = 0;
          setRot(pendingRot.current);
        });
      }
    }
  }
  function onPointerUp() {
    const d = dragging.current;
    dragging.current = null;
    if (!d?.moved) return;
    dragEndAt.current = Date.now();
    // 관성 감속: 놓는 순간 속도만큼 더 돌다가 부드럽게 멈춘다 (대표 지시 2026-08-25)
    const sens = vw < 640 ? 0.55 : 0.38;
    let extra = vel.current * sens * 300; // 관성 이동각 (deg)
    const maxExtra = step * 3;
    extra = Math.max(-maxExtra, Math.min(maxExtra, extra));
    const projected = pendingRot.current + extra;
    const target = Math.round(projected / step) * step;
    const distSteps = Math.abs(target - pendingRot.current) / step;
    const dur = Math.min(1.15, 0.42 + distSteps * 0.22);
    animateTo(target, dur);
  }
  function onLeave() {
    onPointerUp();
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') snapTo(front + 1);
    if (e.key === 'ArrowLeft') snapTo(front - 1);
  }

  // 반응형 무대 — 화면 폭에 비례해 같은 3D 구도를 축소 (모바일·탭 동일 경험, 대표 지시 2026-08-25)
  // 폰에서는 반경을 더 좁혀 측면 카드를 뒤로 접어 여백 확보
  const RX = vw < 640 ? Math.max(104, vw * 0.28) : Math.min(470, Math.max(180, vw * 0.36));
  const RZ = RX * 0.575; // 깊이 반경

  return (
    <div className={`hubc ${noto.className}`}>
      <header className="hubc-head">
        <div className="hubc-hairline" aria-hidden />
        {/* 워드마크 클릭 → 고객 사이트 ecorean.kr (대표 지시 2026-08-25) */}
        <a
          href="https://ecorean.kr"
          target="_blank"
          rel="noopener noreferrer"
          title="ecorean.kr — 고객 사이트로 이동"
          className={`${cinzel.className} hubc-brand hubc-brand-link`}
        >
          ECOREAN
        </a>
        <p className={`${mono.className} hubc-sub`}>WORK HUB · OPERATION DECK</p>
        <div className="hubc-hairline hubc-hairline-btm" aria-hidden />
      </header>

      <div
        ref={stageRef}
        className="hubf-stage"
        role="listbox"
        aria-label="업무 섹션"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onLeave}
        onKeyDown={onKeyDown}
        onClickCapture={(e) => {
          // 드래그 직후의 클릭은 오조작 — 링크·카드 이동 모두 무시
          if (Date.now() - dragEndAt.current < 250) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div className="hubc-spot" aria-hidden />
        <div className="hubc-glowpool" aria-hidden />
        <div className="hubf-fan">
          {slots.map((slot, i) => {
            const theta = ((i * step + rot) * Math.PI) / 180;
            const depth = (Math.cos(theta) + 1) / 2; // 1 정면, 0.65 안쪽, 0.1 바깥
            const x = Math.sin(theta) * RX;
            const y = (1 - depth) * -44;
            const z = (Math.cos(theta) - 1) * RZ;
            // 중앙 근접 시 연속 확대(최대 +12%) — 단계 점프 없이 안정적으로 커진 채 유지
            const centerBoost = Math.max(0, (depth - 0.8) / 0.2) * 0.12;
            const scale = 0.5 + 0.5 * depth + centerBoost; // 중앙 1.12 > 안쪽 0.83 > 바깥 0.55
            const isFront = i === front;
            return (
              <div
                key={i}
                className={`hubf-cardw ${isFront ? 'is-front' : ''}`}
                style={{
                  transform: `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) scale(${scale.toFixed(3)})`,
                  opacity: 0.72 + 0.28 * depth,
                  filter: `brightness(${(0.68 + 0.32 * depth).toFixed(3)})`,
                }}
                role="option"
                aria-selected={isFront}
                onClick={() => {
                  // 중앙이 아닌 카드는 어디를 눌러도 중앙으로 회전 (대표 지시 2026-08-25)
                  if (isFront) return;
                  if (!dragging.current?.moved) snapTo(i);
                }}
              >
                <div className={`hubf-card ${slot.kind === 'ghost' ? 'is-ghost' : ''}`}>
                  <span className="hubc-tick hubc-tick-tl" aria-hidden />
                  <span className="hubc-tick hubc-tick-tr" aria-hidden />
                  <span className="hubc-tick hubc-tick-bl" aria-hidden />
                  <span className="hubc-tick hubc-tick-br" aria-hidden />
                  {slot.kind === 'ghost' ? (
                    <div className="hubc-ghost-body">
                      <span className={`${mono.className} hubc-card-no`}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className={`${mono.className} hubc-ghost-label`}>RESERVED</span>
                      <span className="hubc-ghost-desc">확장 슬롯 · 대기 중</span>
                    </div>
                  ) : (
                    <>
                      <div className="hubc-card-head">
                        <span className={`${mono.className} hubc-card-no`}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="hubc-card-title">{slot.sec.title}</span>
                        <span className={`${mono.className} hubc-card-desc`}>{slot.sec.desc}</span>
                      </div>
                      <div className="hubc-card-body">
                        <ul className="hubc-list">
                          {slot.sec.items
                            .filter((it) => !it.admin)
                            .map((item) => (
                              <li key={item.href}>
                                <a
                                  href={item.href}
                                  className="hubc-item"
                                  draggable={false}
                                  onMouseEnter={playBlip}
                                  onClick={(e) => onItemClick(e, item.href)}
                                >
                                  <span className="hubc-item-name">{item.name}</span>
                                  <span className="hubc-item-desc">{item.desc}</span>
                                </a>
                              </li>
                            ))}
                          {slot.sec.items
                            .filter((it) => it.admin)
                            .map((item) => (
                              <li key={item.href}>
                                <a
                                  href={item.href}
                                  className="hubc-item is-admin"
                                  draggable={false}
                                  onMouseEnter={playBlip}
                                  onClick={(e) => onItemClick(e, item.href)}
                                >
                                  <span className="hubc-item-name">{item.name}</span>
                                  <span className="hubc-item-desc">{item.desc}</span>
                                  <span className={`${mono.className} hubc-item-tag`}>ADMIN</span>
                                </a>
                              </li>
                            ))}
                        </ul>
                      </div>
                      <div className={`${mono.className} hubc-card-foot`}>
                        {slot.sec.items.length} MODULES · AUTHORIZED
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
