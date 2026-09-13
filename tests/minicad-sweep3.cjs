// 일반 3D 스윕(sweepProfile3) 단위 테스트 — 직선·꺾임(마이터)·닫힌 고리·세로 경로
const SK=require('../sites/net/public/minicad/js/sketch.js');
const fail=[]; const ck=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) fail.push(m); };
const near=(a,b,t)=>Math.abs(a-b)<=t;
// 부피 (발산 정리) — 면 감김이 뒤섞여도 절대값으로
function vol(sw){ let s=0; sw.faces.forEach(f=>{ const v=f.vs.map(i=>sw.verts[i]); for(let i=1;i+1<v.length;i++){ const a=v[0],b=v[i],c=v[i+1]; s+=(a.x*(b.y*c.z-b.z*c.y)-a.y*(b.x*c.z-b.z*c.x)+a.z*(b.x*c.y-b.y*c.x)); } }); return Math.abs(s)/6; }
const box=(sw)=>{ const xs=sw.verts.map(v=>v.x),ys=sw.verts.map(v=>v.y),zs=sw.verts.map(v=>v.z); return {x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys),z0:Math.min(...zs),z1:Math.max(...zs)}; };
// 단면: x=0 평면(법선 X) 위의 100×200 사각형 (y 0..100, z 0..200)
const prof=[{x:0,y:0,z:0},{x:0,y:100,z:0},{x:0,y:100,z:200},{x:0,y:0,z:200}];
// ① 직선 경로 +x 3000
let sw=SK.sweepProfile3([{x:0,y:0,z:0},{x:3000,y:0,z:0}],false,prof);
ck(sw&&sw.verts.length===8&&sw.faces.length===6,'직선: 8꼭짓점 6면 (상자)');
ck(sw&&near(vol(sw),100*200*3000,1),'직선 부피 = 100×200×3000: '+(sw&&vol(sw)));
let b=box(sw); ck(b.x0===0&&b.x1===3000&&b.y0===0&&b.y1===100&&b.z1===200,'직선 범위 '+JSON.stringify(b));
// ② ㄱ자 경로 (+x 2000 → +y 2000): 마이터 — 부피 = 두 팔 + 모서리
sw=SK.sweepProfile3([{x:0,y:0,z:0},{x:2000,y:0,z:0},{x:2000,y:2000,z:0}],false,prof);
ck(sw&&sw.verts.length===12&&sw.faces.length===10,'ㄱ자: 12꼭짓점 10면');
// 단면 폭 100 이 y 방향(안쪽)으로 놓여 있다 → 첫 팔은 y 0..100, 둘째 팔은 x 1900..2000 (안쪽 마이터)
b=box(sw); ck(b.x1===2000&&b.y1===2000&&b.z1===200,'ㄱ자 범위 '+JSON.stringify(b));
const vL=100*200*2000 + 100*200*2000 - 100*100*200;         // 팔 A + 팔 B − 모서리 겹침 (마이터는 정확히 한 번만 채운다)
ck(sw&&near(vol(sw),vL,2),'ㄱ자 부피 = 마이터 정확 ('+vL+'): '+(sw&&Math.round(vol(sw))));
// 마디 1 의 단면이 이등분 평면(x=y+... 45°) 위에 있나: 마디 링의 네 점이 x-2000 = -(y-0)... 45° 평면 x + y = 2000 + 상수
const r1=sw.verts.slice(4,8); const onBis=r1.every(p=>near(p.x-p.y,2000-0,1)||near(p.x+p.y,2000,150));
ck(onBis||r1.every(p=>near((p.x-2000)+(p.y-0),0,101)),'꺾임 마디 단면이 이등분 평면 위 '+JSON.stringify(r1.map(p=>[p.x,p.y])));
// ③ 닫힌 사각 고리 (4000×3000) — 단면 100×200, 안쪽으로 → 사각 테두리 링
sw=SK.sweepProfile3([{x:0,y:0,z:0},{x:4000,y:0,z:0},{x:4000,y:3000,z:0},{x:0,y:3000,z:0}],true,prof);
ck(sw&&sw.verts.length===16&&sw.faces.length===16,'닫힌 고리: 16꼭짓점 16면 (뚜껑 없음)');
const ring=(4000*3000-(4000-200)*(3000-200))*200;   // 안쪽으로 폭 100 테두리 (안 상자 3800×2800) × 높이 200
ck(sw&&near(vol(sw),ring,5),'닫힌 고리 부피 (테두리 100×200): '+(sw&&Math.round(vol(sw)))+' 기대 '+ring);
// ④ 세로 경로 (+z 2500): 수평 단면(z=0 평면)을 위로 → 기둥
const prof2=[{x:0,y:0,z:0},{x:300,y:0,z:0},{x:300,y:300,z:0},{x:0,y:300,z:0}];
sw=SK.sweepProfile3([{x:0,y:0,z:0},{x:0,y:0,z:2500}],false,prof2);
ck(sw&&near(vol(sw),300*300*2500,1),'세로 경로 기둥 부피 300×300×2500: '+(sw&&vol(sw)));
// ⑤ 수평 → 수직 꺾임 (파이프가 위로 꺾인다)
sw=SK.sweepProfile3([{x:0,y:0,z:0},{x:2000,y:0,z:0},{x:2000,y:0,z:1500}],false,prof);
b=box(sw); ck(sw&&b.x1===2000&&b.z1===1500&&sw.verts.length===12,'수평→수직 꺾임 범위 '+JSON.stringify(b));
ck(sw&&vol(sw)>100*200*2000&&vol(sw)<100*200*(2000+1500)+100*200*200,'수평→수직 부피가 두 팔 사이: '+(sw&&Math.round(vol(sw))));
// ⑥ 겹친 점·너무 짧은 경로
ck(SK.sweepProfile3([{x:0,y:0,z:0},{x:0,y:0,z:0}],false,prof)===null,'같은 점 둘 = null');
ck(SK.sweepProfile3([{x:0,y:0,z:0},{x:1000,y:0,z:0},{x:1000,y:0,z:0.5},{x:2000,y:0,z:0}],false,prof).verts.length===12,'1mm 안 겹친 점은 하나로');
console.log(fail.length?('❌ '+fail.length+' 실패'):'✅ 3D 스윕 단위 테스트 통과'); process.exit(fail.length?1:0);
