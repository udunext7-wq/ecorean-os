'use client';

// AI 스튜디오 공통 탭 내비게이션 (2026-08-26 실용화 패스)
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/studio/moodboards', label: '무드보드' },
  { href: '/studio/presets', label: '스타일 프리셋' },
  { href: '/studio/ontology', label: '온톨로지' },
  { href: '/studio/prompt-guide.html', label: '프롬프트 가이드' },
];

export function StudioNav() {
  const path = usePathname();
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs">
      <Link
        href="/hub"
        className="rounded-full border border-[#E8C99B]/30 px-3.5 py-1.5 text-[#e8c99b] transition hover:bg-[#E8C99B]/10"
      >
        ← 허브
      </Link>
      <span className="mx-1 hidden text-[10px] tracking-[0.3em] text-[#9BC9D8]/50 sm:inline">
        AI STUDIO
      </span>
      {TABS.map((t) => {
        const active = path?.startsWith(t.href.replace('.html', ''));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full border px-3.5 py-1.5 transition ${
              active
                ? 'border-[#9BC9D8]/60 bg-[#9BC9D8]/12 text-[#dff4fa]'
                : 'border-[#9BC9D8]/20 text-[#94aab8] hover:border-[#9BC9D8]/45 hover:text-[#c8e4ee]'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

// 업로드 전 클라이언트 리사이즈 — 대용량 AI 렌더(수 MB)를 웹용으로 자동 최적화
export async function optimizeImage(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  const passthrough = { blob: file as Blob, ext: (file.name.split('.').pop() || 'jpg').toLowerCase(), type: file.type };
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return passthrough; // gif·svg 등은 원본 유지
  if (file.size < 600 * 1024) return passthrough; // 600KB 미만은 그대로
  try {
    const bmp = await createImageBitmap(file);
    const MAX = 1920;
    const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return passthrough;
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return passthrough;
    return { blob, ext: 'jpg', type: 'image/jpeg' };
  } catch {
    return passthrough;
  }
}
