// 25차 단위: 반으로 나뉜 윗면 가운데 원 → 반원 둘 + 바깥 둘, 가로선은 분할선·반원과 교차, 단순 케이스는 종전 경로
const SK=require('../sites/net/public/minicad/js/sketch.js');
const ctx={ch:2400,fh:2800,fl:0};
const box=()=>({id:'A',x:0,y:0,angle:0,elev_mm:0,pts:[{x:-1000,y:-750},{x:1000,y:-750},{x:1000,y:750},{x:-1000,y:750}],h_mm:1000});
const up={x:0,y:0,z:1}; const vol=m=>SK.massVolume(m,ctx);
const fail=[]; const ck=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) fail.push(m); };
const near=(a,b,t)=>Math.abs(a-b)<=t;
let m=box();
let r=SK.massDivide(m,up,[{x:0,y:-750,z:1000},{x:0,y:750,z:1000}],false,ctx);
ck(r&&r.splits===1&&m.solidFaces.length===7,'세로선으로 윗면 반 나누기 → 면 7');
const circ=[]; for(let i=0;i<16;i++){ const t=i/16*Math.PI*2; circ.push({x:Math.round(Math.cos(t)*300),y:Math.round(Math.sin(t)*300),z:1000}); }
const v0=vol(m); r=SK.massDivide(m,up,circ,true,ctx);
const S=SK.massSolid(m,ctx); const tops=S.faces.filter(f=>f.role==='ceil'); const areas=tops.map(f=>Math.round(SK.faceArea3(S.verts,f.vs))).sort((a,b)=>a-b);
ck(r&&r.graph&&tops.length===4,'분할선 가운데 원 → 윗면 조각 4 (반원 둘 + 바깥 둘): '+JSON.stringify(r)+' 조각 '+tops.length);
const half=Math.round(0.5*16*300*300*Math.sin(Math.PI/8)/2);   // 16각형(외접 300) 넓이의 절반 — 꼭짓점이 정수 mm 라 ±100
ck(near(areas[0],half,100)&&near(areas[1],half,100),'반원 둘 면적 = 16각형 절반 ('+areas.slice(0,2)+' ≈ '+half+')');
ck(near(areas[0]+areas[1]+areas[2]+areas[3],2000*1500,5),'조각 넷 합 = 윗면 (3,000,000): '+(areas[0]+areas[1]+areas[2]+areas[3]));
ck(near(vol(m),v0,1e-6),'부피 그대로 '+vol(m).toFixed(4));
const fr=SK.massFindFace(m,{x:150,y:0,z:1000},up,ctx), fl=SK.massFindFace(m,{x:-150,y:0,z:1000},up,ctx);
ck(fr&&fl&&fr.face!==fl.face&&near(SK.faceArea3(fr.verts,fr.face.vs),half,100),'오른쪽·왼쪽 반원이 각각 잡힌다');
const aR=SK.faceArea3(fr.verts,fr.face.vs), vb=vol(m);
ck(!!SK.massPushFace(m,{x:150,y:0,z:1000},up,200,ctx)&&near(vol(m)-vb,aR*200*1e-9,0.0011),'오른쪽 반원만 200 밀기끌기 → 부피 +반원×200: +'+(vol(m)-vb).toFixed(5));
const S2=SK.massSolid(m,ctx);
ck(S2.faces.every(f=>SK.facePlanarDev(S2.verts,f.vs)<1.5),'전 면 평평');
ck(near(SK.faceArea3(SK.massFindFace(m,{x:-150,y:0,z:1000},up,ctx).verts,SK.massFindFace(m,{x:-150,y:0,z:1000},up,ctx).face.vs),half,100),'왼쪽 반원은 그대로 (제자리·면적 유지)');
const D=SK.massDrawEdges(m,ctx); ck(D.length>=30,'분할선·반원 호가 그릴 모서리에 있다 ('+D.length+')');
// 가로선이 분할선과 두 반원을 가로지른다 → 8조각
m=box(); SK.massDivide(m,up,[{x:0,y:-750,z:1000},{x:0,y:750,z:1000}],false,ctx); SK.massDivide(m,up,circ,true,ctx);
r=SK.massDivide(m,up,[{x:-1000,y:0,z:1000},{x:1000,y:0,z:1000}],false,ctx); const S3=SK.massSolid(m,ctx);
ck(r&&r.graph&&S3.faces.filter(f=>f.role==='ceil').length===8&&near(vol(m),v0,1e-6),'가로선(모서리→모서리)이 분할선·반원과 교차 → 윗면 조각 8, 부피 그대로');
// 원이 면 밖으로 반 나가면: 안쪽 반만 나뉘고 바깥 구간은 stray
m=box(); const circE=circ.map(p=>({x:p.x+1000,y:p.y,z:p.z}));
r=SK.massDivide(m,up,circE,true,ctx); const S4=SK.massSolid(m,ctx);
ck(r&&r.graph&&S4.faces.filter(f=>f.role==='ceil').length===2&&r.stray.length>=6&&near(vol(m),v0,1e-6),'모서리에 걸친 원 → 안쪽 반원 + 바깥, 밖 구간 stray '+(r&&r.stray.length));
// 단순 케이스는 종전 경로
m=box(); r=SK.massDivide(m,up,circ,true,ctx); ck(r&&r.inset===1&&!r.graph,'면 안쪽 원은 종전(열쇠구멍) 경로');
m=box(); r=SK.massDivide(m,up,[{x:-1000,y:100,z:1000},{x:1000,y:-200,z:1000}],false,ctx); ck(r&&r.splits===1&&!r.graph,'모서리→모서리 선은 종전 경로');
console.log(fail.length?('❌ '+fail.length+' 실패'):'✅ 25차 단위 통과'); process.exit(fail.length?1:0);
