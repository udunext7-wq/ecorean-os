'use client';

// 허브 BGM — "Build The Space" (대표 자작곡, 대표 지시 2026-08-25)
// 차분한 볼륨으로 루프 재생. 자동재생이 차단되면 첫 클릭/키 입력에서 시작.
// 토글 상태는 브라우저에 저장 (기본 켬). 페이드인 3초.
import { useEffect, useRef, useState } from 'react';

const KEY = 'ecorean.hubBgm';
const TARGET_VOLUME = 0.22;

export function HubBgm() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fade = useRef<number | null>(null);
  const [on, setOn] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === 'off') setOn(false);
    } catch {
      /* no-op */
    }
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;

    function stopFade() {
      if (fade.current !== null) {
        window.clearInterval(fade.current);
        fade.current = null;
      }
    }
    function fadeIn() {
      stopFade();
      fade.current = window.setInterval(() => {
        const a = audioRef.current;
        if (!a) return;
        a.volume = Math.min(TARGET_VOLUME, a.volume + TARGET_VOLUME / 30);
        if (a.volume >= TARGET_VOLUME) stopFade();
      }, 100);
    }
    const tryPlay = () => {
      el.volume = 0;
      el.play()
        .then(() => {
          removeListeners();
          fadeIn();
        })
        .catch(() => {
          /* 자동재생 차단 — 다음 상호작용 대기 */
        });
    };
    const removeListeners = () => {
      window.removeEventListener('pointerdown', tryPlay);
      window.removeEventListener('keydown', tryPlay);
    };

    if (!on) {
      stopFade();
      el.pause();
      removeListeners();
      return undefined;
    }
    tryPlay();
    window.addEventListener('pointerdown', tryPlay);
    window.addEventListener('keydown', tryPlay);
    return () => {
      stopFade();
      removeListeners();
    };
  }, [on]);

  function toggle() {
    setOn((v) => {
      const next = !v;
      try {
        localStorage.setItem(KEY, next ? 'on' : 'off');
      } catch {
        /* no-op */
      }
      return next;
    });
  }

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- 배경음악 */}
      <audio ref={audioRef} src="/audio/bgm-build-the-space.mp3" loop preload="auto" />
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        title={on ? '배경음악 끄기' : '배경음악 켜기'}
        className="hubc-bgm"
      >
        {on ? '♪ BGM ON' : '♪ BGM OFF'}
      </button>
    </>
  );
}
