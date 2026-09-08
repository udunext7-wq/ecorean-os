const SK=require('../sites/net/public/minicad/js/sketch.js');
const ctx={ch:2400,fh:2800,fl:0};
const box=(id,x,y,w,d,h,el)=>({id,name:id,x,y,angle:0,elev_mm:el||0,color:'#B9C6D2',pts:[{x:-w/2,y:-d/2},{x:w/2,y:-d/2},{x:w/2,y:d/2},{x:-w/2,y:d/2}],h_mm:h});
const A=box('A',0,0,2000,2000,1000), B=box('B',1000,0,2000,2000,1000);
const vol=m=>SK.massVolume(m,ctx);
const near=(a,b,t)=>Math.abs(a-b)<=t;
const fail=[]; const ck=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) fail.push(m); };
const u=SK.massCSG('union',A,B,ctx); ck(u.length===1&&near(vol(u[0]),6,0.01),'union 부피 6 ㎥: '+(u[0]&&vol(u[0]).toFixed(3))+' 면 '+(u[0]&&u[0].solidFaces.length));
const s=SK.massCSG('subtract',A,B,ctx); ck(s.length===1&&near(vol(s[0]),2,0.01),'subtract(B−A) 부피 2: '+(s[0]&&vol(s[0]).toFixed(3))+' 면 '+(s[0]&&s[0].solidFaces.length));
const i=SK.massCSG('intersect',A,B,ctx); ck(i.length===1&&near(vol(i[0]),2,0.01),'intersect 부피 2: '+(i[0]&&vol(i[0]).toFixed(3)));
const sp=SK.massCSG('split',A,B,ctx); ck(sp.length===3&&near(sp.reduce((a,m)=>a+vol(m),0),6,0.02),'split 3조각 합 6: '+sp.map(m=>vol(m).toFixed(2)).join('/'));
// 관통 구멍: 큰 상자에서 작은 기둥 빼기 (구멍 면 = 열쇠구멍 고리)
const C=box('C',0,0,3000,3000,500), D=box('D',0,0,600,600,800,-100);
const h=SK.massCSG('subtract',D,C,ctx); ck(h.length===1&&near(vol(h[0]),4.5-0.18,0.01),'관통 구멍 부피 4.32: '+(h[0]&&vol(h[0]).toFixed(3))+' 면 '+(h[0]&&h[0].solidFaces.length));
// 렌더 조립도 통과하는가 (build3d)
const MC3D=require('../sites/net/public/minicad/3d/build3d.js');
[u[0],s[0],h[0]].forEach((m,k)=>{ const o=MC3D._internal.buildMass(Object.assign({_ctx:ctx},JSON.parse(JSON.stringify(m)))); ck(o&&o.prims[0].tris.length>=12,'build '+k+' 삼각형 '+(o&&o.prims[0].tris.length)); });
// 회전·띄움 매스
const R=Object.assign(box('R',500,500,1500,800,600,200),{angle:30}); const r=SK.massCSG('union',A,R,ctx); ck(r.length===1&&vol(r[0])>4&&vol(r[0])<4.8,'회전 매스 union 부피 '+(r[0]&&vol(r[0]).toFixed(3)));
console.log(fail.length?('❌ '+fail.length+' 실패'):'✅ CSG 단위 테스트 통과'); process.exit(fail.length?1:0);
