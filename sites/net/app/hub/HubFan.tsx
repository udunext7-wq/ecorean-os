'use client';

// 업무 허브 v8 — 잡고 돌리는 3단 깊이 팬 카루셀 (대표 지시 2026-08-25)
// 5장이 모두 정면을 향해 서 있고(글씨 항상 가독), 크기 3단계: 중앙 > 안쪽 한 쌍 > 바깥 한 쌍.
// 마우스로 잡고 좌우로 돌리면 회전, 놓으면 가장 가까운 카드가 중앙에 스냅. 자동 회전 없음.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
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
  const [animAll, setAnimAll] = useState(false);
  const rotRef = useRef(0);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<{ x: number; rot0: number; moved: boolean } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const dragEndAt = useRef(0);
  const prevFront = useRef<number | null>(null);
  const pendingRot = useRef(0);
  const moveRaf = useRef(0);
  rotRef.current = rot;

  useEffect(() => () => cancelAnimationFrame(moveRaf.current), []);

  // 바람(휘익) 사운드 — 파일 없이 노이즈 + 밴드패스 스윕으로 합성
  function playWhoosh() {
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
      // 묵직한 저역 바람: 저주파 밴드 스윕 + 로우패스로 고역을 걷어낸다
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

  function snapTo(i: number) {
    const r = rotRef.current;
    const delta = mod(-i * step - r + 180, 360) - 180;
    setAnimAll(true);
    setRot(r + delta);
    const slot = slots[mod(i, n)];
    try {
      localStorage.setItem(SEL_KEY, slot.kind === 'section' ? slot.sec.title : '__reserved');
    } catch {
      /* no-op */
    }
    window.setTimeout(() => setAnimAll(false), ANIM_MS);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    // 여기서 pointer capture 를 걸면 카드 안 링크 클릭이 가로채져 안 열린다 —
    // 실제 드래그가 시작된 순간(onPointerMove)에만 capture 한다.
    dragging.current = { x: e.clientX, rot0: rotRef.current, moved: false };
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
    if (d?.moved) {
      dragEndAt.current = Date.now();
      snapTo(mod(Math.round(-rotRef.current / step), n));
    }
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
        <p className={`${cinzel.className} hubc-brand`}>ECOREAN</p>
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
                className={`hubf-cardw ${isFront ? 'is-front' : ''} ${animAll ? 'is-anim' : ''}`}
                style={{
                  transform: `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) scale(${scale.toFixed(3)})`,
                  opacity: 0.72 + 0.28 * depth,
                  filter: `brightness(${(0.68 + 0.32 * depth).toFixed(3)})`,
                }}
                role="option"
                aria-selected={isFront}
                onClick={(e) => {
                  if (isFront) return;
                  if ((e.target as HTMLElement).closest('a')) return;
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
                                <a href={item.href} className="hubc-item" draggable={false}>
                                  <span className="hubc-item-name">{item.name}</span>
                                  <span className="hubc-item-desc">{item.desc}</span>
                                </a>
                              </li>
                            ))}
                          {slot.sec.items
                            .filter((it) => it.admin)
                            .map((item) => (
                              <li key={item.href}>
                                <a href={item.href} className="hubc-item is-admin" draggable={false}>
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
