// 24차-2 단위 테스트 — 스케치 면의 구멍: 면 안의 닫힌 고리는 바깥 면에 구멍(skDetectFaces holes) · 조립(poly holes·면적) · 뽑기(관통 구멍)
const SK=require('../sites/net/public/minicad/js/sketch.js');
const MC3D=require('../sites/net/public/minicad/3d/build3d.js');
const ctx={ch:2400,fh:2800,fl:0};
const fail=[]; const ck=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) fail.push(m); };
const near=(a,b,t)=>Math.abs(a-b)<=t;
const bag=()=>({sketchPts:[],sketchEdges:[],sketchFaces:[],masses:[]});
const circle=(cx,cy,r,n)=>{ const out=[]; for(let i=0;i<n;i++){ const t=i/n*Math.PI*2; out.push({x:Math.round(cx+Math.cos(t)*r),y:Math.round(cy+Math.sin(t)*r)}); } return out; };
// ① 사각형 + 안쪽 원 → 원은 사각형의 구멍
let B=bag(); SK.skAddPoly([{x:0,y:0},{x:3000,y:0},{x:3000,y:2000},{x:0,y:2000}],B); SK.skAddPoly(circle(1500,1000,400,16),B);
let outer=B.sketchFaces.find(f=>f.pts.length===4), inner=B.sketchFaces.find(f=>f.pts.length===16);
ck(B.sketchFaces.length===2&&outer&&inner,'사각형 + 원 → 면 2');
ck(outer.holes.length===1&&outer.holes[0]===inner.id&&inner.holes.length===0,'원은 사각형의 구멍 (holes=[원]) · 원 자신은 구멍 없음');
ck(SK.skFaceHoles(outer,B).length===1&&SK.skFaceHoles(outer,B)[0].length===16,'skFaceHoles → 구멍 다각형 16점');
// ② 원을 지우면 구멍도 사라진다
SK.skRemoveFace(inner.id,B);
outer=B.sketchFaces.find(f=>f.pts.length===4);
ck(B.sketchFaces.length===1&&outer.holes.length===0,'원 삭제 → 구멍 없음');
// ③ 모서리에 닿는(점을 공유하는) 안쪽 면은 구멍이 아니라 분할 — 대각선으로 나뉜 두 삼각형은 서로 구멍 아님
B=bag(); SK.skAddPoly([{x:0,y:0},{x:3000,y:0},{x:3000,y:2000},{x:0,y:2000}],B); SK.skAddEdge(0,0,3000,2000,B);
ck(B.sketchFaces.length===2&&B.sketchFaces.every(f=>f.holes.length===0),'대각선 분할 → 두 삼각형, 구멍 아님');
// ④ 중첩: 큰 사각 ⊃ 중간 원 ⊃ 작은 원 → 단계별
B=bag(); SK.skAddPoly([{x:0,y:0},{x:3000,y:0},{x:3000,y:2000},{x:0,y:2000}],B); SK.skAddPoly(circle(1500,1000,600,16),B); SK.skAddPoly(circle(1500,1000,200,12),B);
outer=B.sketchFaces.find(f=>f.pts.length===4); const mid=B.sketchFaces.find(f=>f.pts.length===16), small=B.sketchFaces.find(f=>f.pts.length===12);
ck(outer.holes.length===1&&outer.holes[0]===mid.id&&mid.holes.length===1&&mid.holes[0]===small.id&&small.holes.length===0,'중첩 구멍은 단계별 (F.holes=[H], H.holes=[G])');
// ⑤ 조립: 바닥 면 prim 에 구멍 · 면적 = 바깥 − 구멍
B=bag(); SK.skAddPoly([{x:0,y:0},{x:3000,y:0},{x:3000,y:2000},{x:0,y:2000}],B); SK.skAddPoly(circle(1500,1000,400,16),B);
outer=B.sketchFaces.find(f=>f.pts.length===4); inner=B.sketchFaces.find(f=>f.pts.length===16);
const doc=MC3D.normalizeDoc({sketchPts:B.sketchPts,sketchEdges:B.sketchEdges,sketchFaces:B.sketchFaces,masses:[],walls:[],spaces:[]});
const nf=doc.sketchFaces.find(f=>f.id===outer.id);
ck(nf&&nf.holes.length===1&&nf.holes[0].length===16,'normalizeDoc: 바깥 면에 구멍 다각형');
const o=MC3D._internal.buildSketchFace(nf);
const aCirc=Math.abs(SK.skPolyArea(circle(1500,1000,400,16)));
ck(o.prims[0].holes.length===1&&near(o.meta.area,6000000-aCirc,1),'buildSketchFace: prim.holes 1 · 면적 = 6,000,000 − 원 ('+Math.round(o.meta.area)+')');
// ⑥ 뽑기: 구멍 난 면 → 관통 구멍 매스 (부피 = (바깥−구멍)×z · 면 = 6 + 벽 16)
const m=SK.massFromPoly(SK.skFacePoly(outer,B),1000,B,SK.skFaceHoles(outer,B));
const vol=SK.massVolume(m,ctx);
ck(near(vol,(6000000-aCirc)*1000*1e-9,0.002),'관통 구멍 매스 부피 = (6㎡ − 원)×1m = '+vol.toFixed(4));
ck(SK.massSolid(m,ctx).faces.length===6+16,'면 = 상자 6(위·아래는 열쇠구멍) + 구멍 벽 16 ('+SK.massSolid(m,ctx).faces.length+')');
ck(!!SK.massFindFace(m,{x:0,y:0,z:1000},{x:0,y:0,z:1},ctx)&&SK.massFindFace(m,{x:0,y:0,z:1000},{x:0,y:0,z:1},ctx).face.vs.length===4+16+2,'윗면 가운데는 열쇠구멍 면(구멍 뚫림)');
const built=MC3D._internal.buildMass(Object.assign({_ctx:ctx},JSON.parse(JSON.stringify(m))));
ck(built&&built.prims[0].tris.length>=40,'관통 구멍 매스 조립 삼각형 '+(built&&built.prims[0].tris.length));
// ⑦ 그릴 모서리: 다리 2 (위·아래) 는 안 그리고, 구멍 벽 사이 세로 변(22.5°)은 부드러운 변
const E=SK.massEdges(m,ctx).length, D=SK.massDrawEdges(m,ctx).length;
ck(E-D===2+16,'massDrawEdges: 다리 2 + 구멍 세로 변 16 숨김 ('+E+' → '+D+')');
// ⑧ 벽면(종이) 면의 구멍 → 법선 뽑기도 관통
const pl={id:'pl1',origin:{x:0,y:0,z:0},ex:{x:1,y:0,z:0},ey:{x:0,y:0,z:1},n:{x:0,y:-1,z:0},sketchPts:[],sketchEdges:[],sketchFaces:[]};
SK.skAddPoly([{x:0,y:0},{x:3000,y:0},{x:3000,y:2000},{x:0,y:2000}],pl); SK.skAddPoly(circle(1500,1000,400,16),pl);
const po=pl.sketchFaces.find(f=>f.pts.length===4);
const free={masses:[]}; const pm=SK.planeExtrude(pl,po,500,free);
ck(pm&&near(SK.massVolume(pm,ctx),(6000000-aCirc)*500*1e-9,0.002)&&SK.massSolid(pm,ctx).faces.length===6+16,'벽면 면(구멍) 법선 뽑기 500 → 관통 구멍 매스 '+(pm&&SK.massVolume(pm,ctx).toFixed(4)));
console.log(fail.length?('❌ '+fail.length+' 실패'):'✅ 스케치 면 구멍 단위 테스트 통과'); process.exit(fail.length?1:0);
