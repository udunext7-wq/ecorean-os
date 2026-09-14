// 매스 면 분할 단위 테스트 — 폴리라인 분할(massSplitFaceChain) · 닫힌 고리 열쇠구멍(massInsetFace) · 점을 품은 조각 고르기(massFindFace)
//  · 일반 분할 massDivide(사슬·고리·모서리에 닿는 고리·자투리·면 밖) · 그릴 모서리 massDrawEdges
const SK=require('../sites/net/public/minicad/js/sketch.js');
const ctx={ch:2400,fh:2800,fl:0};
const fail=[]; const ck=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) fail.push(m); };
const near=(a,b,t)=>Math.abs(a-b)<=t;
const box=()=>({id:'A',name:'A',x:0,y:0,angle:0,elev_mm:0,color:'#B9C6D2',pts:[{x:-1000,y:-750},{x:1000,y:-750},{x:1000,y:750},{x:-1000,y:750}],h_mm:1000});
const vol=m=>SK.massVolume(m,ctx);
const top={x:0,y:0,z:1000}, up={x:0,y:0,z:1};
const area=f=>SK.faceArea3(f.verts,f.face.vs);
// ① 세 점 폴리라인으로 윗면을 둘로 (앞 모서리 → 안쪽 → 뒤 모서리)
let m=box(); SK.massToSolid(m,ctx); const n0=m.solidFaces.length, v0=vol(m);
let r=SK.massSplitFaceChain(m,top,up,[{x:-200,y:-750,z:1000},{x:150,y:0,z:1000},{x:300,y:750,z:1000}],ctx);
ck(r&&r.faces===2&&m.solidFaces.length===n0+1,'폴리라인 분할 → 면 +1 ('+m.solidFaces.length+')');
ck(near(vol(m),v0,1),'분할해도 부피 그대로: '+vol(m).toFixed(4));
let fL=SK.massFindFace(m,{x:-800,y:0,z:1000},up,ctx), fR=SK.massFindFace(m,{x:800,y:0,z:1000},up,ctx);
ck(fL&&fR&&fL.face!==fR.face,'같은 평면의 두 조각을 점 위치로 구분해 고른다');
ck(near(area(fL)+area(fR),2000*1500,2),'두 조각 면적 합 = 윗면 (3,000,000): '+(area(fL)+area(fR)));
const aL=area(fL); const vBefore=vol(m);
ck(!!SK.massPushFace(m,{x:-800,y:0,z:1000},up,300,ctx),'왼쪽 조각 밀기끌기 300');
ck(near(vol(m)-vBefore,aL*300*1e-9,0.002),'부피 증가 = 왼쪽 조각 면적×300: +'+((vol(m)-vBefore)).toFixed(4)+' ㎥ (기대 '+(aL*300*1e-9).toFixed(4)+')');
ck(SK.massFaceRing(m,{x:800,y:0,z:1000},up,ctx).ring.length===fR.face.vs.length&&near(SK.massFaceRing(m,{x:800,y:0,z:1000},up,ctx).area,area(fR)/1e6,1e-6),'massFaceRing 도 점을 품은 조각(오른쪽, 제자리)을 준다');
// ② 닫힌 고리(원 안쪽) → 안쪽 면 + 열쇠구멍 바깥 면
m=box(); SK.massToSolid(m,ctx);
const circ=[]; for(let i=0;i<16;i++){ const t=i/16*Math.PI*2; circ.push({x:Math.round(Math.cos(t)*300),y:Math.round(Math.sin(t)*300),z:1000}); }
const nf=m.solidFaces.length, vv=vol(m);
r=SK.massInsetFace(m,top,up,circ,ctx);
ck(r&&r.faces===2&&m.solidFaces.length===nf+1,'닫힌 고리 → 면 +1 (안쪽 + 열쇠구멍 바깥) ('+m.solidFaces.length+')');
ck(near(vol(m),vv,1),'열쇠구멍으로 나눠도 부피 그대로: '+vol(m).toFixed(4));
const fIn=SK.massFindFace(m,{x:0,y:0,z:1000},up,ctx), fOut=SK.massFindFace(m,{x:-800,y:0,z:1000},up,ctx);
ck(fIn&&fOut&&fIn.face!==fOut.face&&fIn.face.vs.length===16,'가운데 점 → 안쪽 면(16각), 바깥 점 → 열쇠구멍 면');
const aIn=area(fIn), aOut=area(fOut);
ck(near(aIn+aOut,2000*1500,5),'안쪽+바깥 면적 = 윗면: '+Math.round(aIn+aOut));
const E=SK.massEdges(m,ctx), D=SK.massDrawEdges(m,ctx);
ck(E.length===29&&D.length===28,'massDrawEdges 는 다리 변 하나만 뺀다 ('+E.length+' → '+D.length+')');
const vb=vol(m);
ck(!!SK.massPushFace(m,{x:0,y:0,z:1000},up,-300,ctx),'안쪽 면 안으로 300 (구멍)');
ck(near(vb-vol(m),aIn*300*1e-9,0.002),'부피 감소 = 안쪽 면적×300: −'+((vb-vol(m))).toFixed(4)+' ㎥');
ck(SK.massFindFace(m,{x:-800,y:0,z:1000},up,ctx).face.vs.length===fOut.face.vs.length,'바깥 면은 그 자리에');
// ③ 바깥(열쇠구멍) 면을 밀어도 안쪽은 따라가지 않는다 — 구멍이 남는다 (같은 꼭짓점이 두 번 나와도 한 번만 옮긴다)
m=box(); SK.massToSolid(m,ctx); SK.massInsetFace(m,top,up,circ,ctx);
const vOuter=vol(m);
ck(!!SK.massPushFace(m,{x:-800,y:0,z:1000},up,200,ctx),'바깥(열쇠구멍) 면을 200 위로');
ck(near(vol(m)-vOuter,(2000*1500-aIn)*200*1e-9,0.003),'부피 증가 = 바깥 면적×200 (안쪽은 제자리): +'+((vol(m)-vOuter)).toFixed(4));
ck(SK.massDrawEdges(m,ctx).length===SK.massEdges(m,ctx).length-17,'밀어 올린 뒤에도 다리 변은 안 그린다 · 구멍 벽 16장 사이(22.5°) 세로 변도 부드러운 변으로 숨긴다 ('+SK.massEdges(m,ctx).length+' → '+SK.massDrawEdges(m,ctx).length+')');
// ④ 고리 위 판정 — 같은 평면의 모든 면 고리
m=box(); SK.massToSolid(m,ctx);
ck(SK.massOnFaceRing(m,up,{x:1000,y:0,z:1000},ctx)===true&&SK.massOnFaceRing(m,up,{x:0,y:0,z:1000},ctx)===false,'massOnFaceRing: 모서리 위 true · 가운데 false');
SK.massSplitFace(m,top,up,{x:0,y:-750,z:1000},{x:0,y:750,z:1000},ctx);
ck(SK.massOnFaceRing(m,up,{x:0,y:100,z:1000},ctx)===true,'분할선 위의 점도 고리 위(두 조각이 공유)');
// ⑤ 두 점 사슬은 종전 massSplitFace 와 같다
m=box(); SK.massToSolid(m,ctx);
r=SK.massSplitFaceChain(m,top,up,[{x:0,y:-750,z:1000},{x:0,y:750,z:1000}],ctx);
ck(r&&m.solidFaces.length===7,'두 점 사슬 = 직선 분할 (면 7)');
// ⑥ 렌더 조립도 통과 (열쇠구멍 면 귀 자르기)
const MC3D=require('../sites/net/public/minicad/3d/build3d.js');
m=box(); SK.massToSolid(m,ctx); SK.massInsetFace(m,top,up,circ,ctx);
const o=MC3D._internal.buildMass(Object.assign({_ctx:ctx},JSON.parse(JSON.stringify(m))));
ck(o&&o.prims[0].tris.length>=30,'build 열쇠구멍 매스 삼각형 '+(o&&o.prims[0].tris.length));
// ⑦ massDivide — 일반 분할
//  a) 안쪽 사각 고리 → inset
m=box(); SK.massToSolid(m,ctx);
const rect=[{x:-300,y:-200,z:1000},{x:300,y:-200,z:1000},{x:300,y:200,z:1000},{x:-300,y:200,z:1000}];
r=SK.massDivide(m,up,rect,true,ctx);
ck(r&&r.inset===1&&r.splits===0&&m.solidFaces.length===7,'massDivide 안쪽 사각 고리 → 안쪽 면 (면 7) '+JSON.stringify(r&&{i:r.inset,s:r.splits,st:r.stray.length}));
ck(near(area(SK.massFindFace(m,{x:0,y:0,z:1000},up,ctx)),600*400,1),'안쪽 면 면적 600×400');
//  b) 모서리에서 시작하는 사각형(두 변이 모서리 위) → 사슬 분할 1 (자투리 0)
m=box(); SK.massToSolid(m,ctx);
const corner=[{x:-1000,y:-750,z:1000},{x:-400,y:-750,z:1000},{x:-400,y:-350,z:1000},{x:-1000,y:-350,z:1000}];
r=SK.massDivide(m,up,corner,true,ctx);
ck(r&&r.splits===1&&r.inset===0&&r.stray.length===0&&m.solidFaces.length===7,'모서리에 붙은 사각형 → 구간 분할 1 · 자투리 0 · 면 7 '+JSON.stringify(r&&{i:r.inset,s:r.splits,st:r.stray.length,n:m.solidFaces.length}));
ck(near(area(SK.massFindFace(m,{x:-700,y:-550,z:1000},up,ctx)),600*400,1),'모서리 사각 조각 면적 600×400');
//  c) 열린 사슬: 안쪽 → 모서리 → 안쪽 → 모서리 → 안쪽  = 분할 1 + 자투리 2
m=box(); SK.massToSolid(m,ctx);
const chain=[{x:-500,y:0,z:1000},{x:-300,y:-750,z:1000},{x:0,y:-100,z:1000},{x:300,y:750,z:1000},{x:600,y:0,z:1000}];
r=SK.massDivide(m,up,chain,false,ctx);
ck(r&&r.splits===1&&r.stray.length===2&&r.stray[0][0]===chain[0]&&r.stray[1][1]===chain[4]&&m.solidFaces.length===7,'열린 사슬 → 분할 1 · 자투리 2(넘긴 점 객체 그대로) '+JSON.stringify(r&&{s:r.splits,st:r.stray.map(x=>x.length)}));
//  d) 면 밖으로 나가는 고리 → null (아무것도 안 바뀐다)
m=box(); SK.massToSolid(m,ctx);
r=SK.massDivide(m,up,[{x:800,y:0,z:1000},{x:1300,y:0,z:1000},{x:1300,y:400,z:1000},{x:800,y:400,z:1000}],true,ctx);
ck(r===null&&m.solidFaces.length===6,'면 밖으로 나가는 고리 → null · 면 6 그대로');
//  e) 이미 나뉜 면 위에 다시 원 → 점을 품은 조각(왼쪽)이 나뉜다
m=box(); SK.massToSolid(m,ctx); SK.massSplitFace(m,top,up,{x:0,y:-750,z:1000},{x:0,y:750,z:1000},ctx);
const circL=circ.map(p=>({x:p.x-500,y:p.y,z:p.z}));
r=SK.massDivide(m,up,circL,true,ctx);
ck(r&&r.inset===1&&m.solidFaces.length===8,'나뉜 면의 왼쪽 조각에 원 → 면 8');
ck(SK.massFindFace(m,{x:500,y:0,z:1000},up,ctx).face.vs.length===4,'오른쪽 조각은 그대로 4각');
//  f) 안쪽 면을 300 뽑아 올리면 (돌출) 부피 +
const vE=vol(m); SK.massPushFace(m,{x:-500,y:0,z:1000},up,300,ctx);
ck(near(vol(m)-vE,aIn*300*1e-9,0.002),'원 조각 돌출 300 → 부피 +'+(vol(m)-vE).toFixed(4));
// ⑧ 그릴 모서리 — 원기둥(24각) 옆 변은 숨기고 위·아래 고리만
const cyl={id:'C',name:'C',x:0,y:0,angle:0,elev_mm:0,color:'#B9C6D2',pts:[],h_mm:1000};
for(let i=0;i<24;i++){ const t=i/24*Math.PI*2; cyl.pts.push({x:Math.round(Math.cos(t)*500),y:Math.round(Math.sin(t)*500)}); }
SK.massToSolid(cyl,ctx);
ck(SK.massEdges(cyl,ctx).length===72&&SK.massDrawEdges(cyl,ctx).length===48,'원기둥: 모서리 72 중 옆 변 24 는 숨기고 48 (15° 부드러운 변)');
console.log(fail.length?('❌ '+fail.length+' 실패'):'✅ 면 분할 단위 테스트 통과'); process.exit(fail.length?1:0);
