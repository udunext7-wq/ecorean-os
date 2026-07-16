/** @type {import('next').NextConfig} */
const nextConfig = {
  // 모노레포 상위(core/·apps/·shared/)의 TS 소스를 직접 import (repo-boundary 2.4-2)
  experimental: { externalDir: true },
  // D: 드라이브(exFAT)는 심볼릭 링크 미지원 — readlink 호출을 줄인다.
  // errno 교정은 scripts/fix-exfat-readlink.cjs (run-next.mjs가 주입) 참조.
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
