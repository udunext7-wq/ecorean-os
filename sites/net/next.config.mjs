import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 모노레포 상위(core/·apps/·shared/)의 TS 소스를 직접 import (repo-boundary 2.4-2)
  experimental: { externalDir: true },
  webpack: (config) => {
    // D: 드라이브(exFAT)는 심볼릭 링크 미지원 — readlink 호출을 줄인다.
    // errno 교정은 scripts/fix-exfat-readlink.cjs (run-next.mjs가 주입) 참조.
    config.resolve.symlinks = false;
    // externalDir 소스(../../core 등)가 의존성을 찾도록 node_modules 위치를 명시.
    // 로컬은 모노레포 루트, Vercel 클라우드 빌드는 sites/net 에 설치된다.
    config.resolve.modules = [
      ...(config.resolve.modules ?? ['node_modules']),
      path.resolve('./node_modules'),
      path.resolve('../../node_modules'),
    ];
    return config;
  },
};

export default nextConfig;
