/* ECOREAN MiniCAD — PDF / DWG 가져오기 (2026-08-19, 대표 지시)
   로드 순서: ui.js 이후 (STATE / ensureVertex / makeWallVEF / setBgImage / zoomFit / showStatus / saveHistory 전역 사용)

   ① PDF → 밑그림(래스터): pdf.js 로 페이지를 캔버스에 렌더 → PNG dataURL → 기존 배경 이미지(setBgImage)로.
        축척(1:N)을 고르면 mm 스케일이 바로 맞고, 모르면 📐 스케일 보정으로.
   ② PDF → 선 추출(벡터): pdf.js 연산자 목록(getOperatorList)의 경로(moveTo/lineTo/curveTo)를 CTM 추적하며 선분으로 변환
        → 참조선(isLine) 또는 벽으로 생성. 채움 도형·이미지·글자는 기본 제외. 색상/굵기별 "레이어"로 묶어 선택 가능.
   ③ DWG → 선/원/호/폴리라인/문자: libredwg(WASM, 브라우저 내 변환) → DwgDatabase → 블록(INSERT) 전개 → 같은 ingest 경로.

   벤더 파일 (사이트 동봉, 외부 CDN 없음): vendor/pdfjs/ (Apache-2.0), vendor/libredwg/ (GPL-3.0) — 필요할 때만 지연 로드.
*/
'use strict';

const CAD_IMPORT={
  PDFJS_URL:'vendor/pdfjs/pdf.min.mjs',
  PDFJS_WORKER:'vendor/pdfjs/pdf.worker.min.mjs',
  LIBREDWG_URL:'vendor/libredwg/dist/libredwg-web.js',
  PT_TO_MM:25.4/72,
  _pdfjs:null,_libredwg:null,_libredwgMod:null,
  async pdfjs(){
    if(this._pdfjs) return this._pdfjs;
    const m=await import(new URL(this.PDFJS_URL,document.baseURI).href);
    m.GlobalWorkerOptions.workerSrc=new URL(this.PDFJS_WORKER,document.baseURI).href;
    this._pdfjs=m;return m;
  },
  async libredwg(){
    if(this._libredwg) return this._libredwg;
    const m=await import(new URL(this.LIBREDWG_URL,document.baseURI).href);
    this._libredwgMod=m;
    this._libredwg=await m.LibreDwg.create();
    return this._libredwg;
  },
};

/* ───────────────── 순수 함수 (테스트 가능) ───────────────── */
// 2×3 행렬 — pdf.js Util.transform 과 동일 규약: applyM(m,x,y) = (m0·x + m2·y + m4, m1·x + m3·y + m5), mulM(a,b) = a·b
function cadMulM(a,b){return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];}
function cadApplyM(m,x,y){return [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]];}
function cadMScale(m){return Math.sqrt(Math.abs(m[0]*m[3]-m[1]*m[2]))||1;}
// 3차 베지어 → 선분 N개
function cadFlattenBezier(x0,y0,x1,y1,x2,y2,x3,y3,n){
  const pts=[];n=n||8;
  for(let i=1;i<=n;i++){const t=i/n,mt=1-t;
    pts.push([mt*mt*mt*x0+3*mt*mt*t*x1+3*mt*t*t*x2+t*t*t*x3, mt*mt*mt*y0+3*mt*mt*t*y1+3*mt*t*t*y2+t*t*t*y3]);}
  return pts;
}
// 호 → 선분 (각도 rad, CCW 기준 start→end)
function cadArcPoints(cx,cy,r,a0,a1,segPerQuarter){
  let sweep=a1-a0; while(sweep<=0) sweep+=Math.PI*2; while(sweep>Math.PI*2) sweep-=Math.PI*2;
  const n=Math.max(2,Math.ceil(sweep/(Math.PI/2)*(segPerQuarter||6)));
  const pts=[];for(let i=0;i<=n;i++){const a=a0+sweep*i/n;pts.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}
  return pts;
}
// LWPOLYLINE bulge 세그먼트 → 점 목록 (bulge = tan(θ/4))
function cadBulgePoints(x1,y1,x2,y2,bulge,segPerQuarter){
  if(!bulge||Math.abs(bulge)<1e-9) return [[x2,y2]];
  const theta=4*Math.atan(bulge);
  const d=Math.hypot(x2-x1,y2-y1); if(d<1e-9) return [[x2,y2]];
  const r=d/(2*Math.sin(Math.abs(theta)/2));
  const mx=(x1+x2)/2,my=(y1+y2)/2;
  const h=Math.sqrt(Math.max(0,r*r-d*d/4))*(bulge>0?1:-1);
  const nx=-(y2-y1)/d,ny=(x2-x1)/d;
  const cx=mx+nx*h,cy=my+ny*h;
  const a0=Math.atan2(y1-cy,x1-cx);
  const n=Math.max(2,Math.ceil(Math.abs(theta)/(Math.PI/2)*(segPerQuarter||6)));
  const pts=[];for(let i=1;i<=n;i++){const a=a0+theta*i/n;pts.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}
  return pts;
}

/**
 * pdf.js 연산자 목록 → 프리미티브
 * @param fnArray/argsArray  page.getOperatorList() 결과
 * @param baseM  기준 변환 (viewport.transform: PDF 사용자좌표 → 캔버스 px, y 아래방향)
 * @param OPS    pdf.js OPS 테이블
 * @param opts   {includeFills:boolean}
 * @returns {segs:[{x1,y1,x2,y2,w,layer}], polys:[{pts:[[x,y]..],closed,layer,w}], stats}
 *   좌표 단위 = baseM 단위(px @ viewport scale). 호출자가 mm 환산.
 */
function cadPdfOpsToPrims(fnArray,argsArray,baseM,OPS,opts){
  opts=opts||{};
  const DRAW={moveTo:0,lineTo:1,curveTo:2,quadraticCurveTo:3,closePath:4};
  const strokeOps=new Set([OPS.stroke,OPS.closeStroke,OPS.fillStroke,OPS.eoFillStroke,OPS.closeFillStroke,OPS.closeEOFillStroke]);
  const fillOps=new Set([OPS.fill,OPS.eoFill,OPS.fillStroke,OPS.eoFillStroke,OPS.closeFillStroke,OPS.closeEOFillStroke,OPS.rawFillPath].filter(x=>x!=null));
  let ctm=baseM.slice();const stack=[];
  let lineWidth=1,strokeRGB='#000000',fillRGB='#000000';
  const gsStack=[];
  const segs=[],polys=[];const stats={paths:0,strokePaths:0,fillPaths:0,skippedFills:0,forms:0};
  const hex=(r,g,b)=>'#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
  const colorArg=(a,cur)=>{
    if(!a||!a.length) return cur;
    if(typeof a[0]==='string'){const m=a[0].match(/^#([0-9a-f]{6})/i);if(m) return '#'+m[1].toLowerCase();
      const r=a[0].match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);if(r) return hex(+r[1],+r[2],+r[3]);return cur;}
    if(a.length>=3) return hex(a[0],a[1],a[2]);
    return cur;
  };
  for(let i=0;i<fnArray.length;i++){
    const fn=fnArray[i],args=argsArray[i];
    switch(fn){
      case OPS.save: stack.push(ctm.slice());gsStack.push({lineWidth,strokeRGB,fillRGB});break;
      case OPS.restore: if(stack.length){ctm=stack.pop();const g=gsStack.pop();if(g){lineWidth=g.lineWidth;strokeRGB=g.strokeRGB;fillRGB=g.fillRGB;}}break;
      case OPS.transform: if(args&&args.length>=6) ctm=cadMulM(ctm,Array.from(args));break;
      case OPS.paintFormXObjectBegin:{
        stats.forms++;stack.push(ctm.slice());gsStack.push({lineWidth,strokeRGB,fillRGB});
        const m=args&&args[0];if(m&&m.length>=6) ctm=cadMulM(ctm,Array.from(m));
        break;}
      case OPS.paintFormXObjectEnd: if(stack.length){ctm=stack.pop();const g=gsStack.pop();if(g){lineWidth=g.lineWidth;strokeRGB=g.strokeRGB;fillRGB=g.fillRGB;}}break;
      case OPS.setLineWidth: lineWidth=+args[0]||0;break;
      // pdf.js 5+/6: 색상 op 인자는 CSS 문자열 1개('#rrggbb'); 구버전은 [r,g,b] — 둘 다 처리
      case OPS.setStrokeRGBColor: strokeRGB=colorArg(args,strokeRGB);break;
      case OPS.setFillRGBColor: fillRGB=colorArg(args,fillRGB);break;
      case OPS.setStrokeGray: if(args&&args.length){const g=args[0]<=1?args[0]*255:args[0];strokeRGB=typeof args[0]==='string'?args[0]:hex(g,g,g);}break;
      case OPS.setFillGray: if(args&&args.length){const g=args[0]<=1?args[0]*255:args[0];fillRGB=typeof args[0]==='string'?args[0]:hex(g,g,g);}break;
      case OPS.constructPath:{
        if(!args) break;
        const paintOp=args[0];const data=args[1]&&args[1][0];
        if(!data||!data.length) break;
        stats.paths++;
        const isStroke=strokeOps.has(paintOp),isFill=fillOps.has(paintOp);
        if(!isStroke&&!isFill) break; // endPath / clip 등
        if(!isStroke&&isFill&&!opts.includeFills){stats.skippedFills++;break;}
        if(isStroke) stats.strokePaths++; else stats.fillPaths++;
        const w=lineWidth*cadMScale(ctm);
        const layer=(isStroke?strokeRGB:fillRGB)+(isStroke?'':' (채움)');
        // 서브패스 순회
        let cur=null,start=null,pts=[];
        const flush=(closed)=>{
          if(pts.length>=2){
            const poly={pts:pts.slice(),closed:!!closed,layer,w,fill:!isStroke};
            polys.push(poly);const polyId=polys.length-1;
            for(let k=0;k+1<pts.length;k++) segs.push({x1:pts[k][0],y1:pts[k][1],x2:pts[k+1][0],y2:pts[k+1][1],w,layer,fill:!isStroke,polyId});
            if(closed&&pts.length>=3){const a=pts[pts.length-1],b=pts[0];segs.push({x1:a[0],y1:a[1],x2:b[0],y2:b[1],w,layer,fill:!isStroke,polyId});}
          }
          pts=[];
        };
        for(let k=0;k<data.length;){
          const op=data[k++];
          if(op===DRAW.moveTo){flush(false);const p=cadApplyM(ctm,data[k],data[k+1]);k+=2;cur=p;start=p;pts=[p];}
          else if(op===DRAW.lineTo){const p=cadApplyM(ctm,data[k],data[k+1]);k+=2;if(!cur){cur=p;start=p;pts=[p];}else{pts.push(p);cur=p;}}
          else if(op===DRAW.curveTo){
            const c1=cadApplyM(ctm,data[k],data[k+1]),c2=cadApplyM(ctm,data[k+2],data[k+3]),e=cadApplyM(ctm,data[k+4],data[k+5]);k+=6;
            if(!cur){cur=c1;start=c1;pts=[c1];}
            cadFlattenBezier(cur[0],cur[1],c1[0],c1[1],c2[0],c2[1],e[0],e[1],8).forEach(p=>pts.push(p));cur=e;}
          else if(op===DRAW.quadraticCurveTo){
            const c=cadApplyM(ctm,data[k],data[k+1]),e=cadApplyM(ctm,data[k+2],data[k+3]);k+=4;
            if(!cur){cur=c;start=c;pts=[c];}
            // 2차 → 3차 승격
            const c1=[cur[0]+2/3*(c[0]-cur[0]),cur[1]+2/3*(c[1]-cur[1])],c2=[e[0]+2/3*(c[0]-e[0]),e[1]+2/3*(c[1]-e[1])];
            cadFlattenBezier(cur[0],cur[1],c1[0],c1[1],c2[0],c2[1],e[0],e[1],6).forEach(p=>pts.push(p));cur=e;}
          else if(op===DRAW.closePath){flush(true);if(start){cur=start;pts=[start];}}
          else break; // 알 수 없는 op → 중단
        }
        flush(paintOp===OPS.closeStroke||paintOp===OPS.closeFillStroke||paintOp===OPS.closeEOFillStroke);
        break;}
      default: break;
    }
  }
  return {segs,polys,stats};
}

/**
 * libredwg DwgDatabase → 프리미티브 (도면 단위 그대로, y 위방향 = DWG 좌표계)
 * @returns {segs,polys,circles:[{cx,cy,r,layer}],arcs:[{cx,cy,r,a0,a1,layer}],texts:[{x,y,text,h,layer}],stats,unitFactor,layers:{name:count}}
 */
function cadDwgDbToPrims(db,opts){
  opts=opts||{};
  const INSUNITS=(db&&db.header&&db.header.INSUNITS)||0;
  const UNIT={0:1,4:1,5:10,6:1000,1:25.4,2:304.8,3:1609344,7:1e6,8:0.0000254,9:0.0254,10:914.4,14:0.1};
  const unitFactor=UNIT[INSUNITS]!=null?UNIT[INSUNITS]:1;
  const blocks=new Map();
  try{((db.tables&&db.tables.BLOCK_RECORD&&db.tables.BLOCK_RECORD.entries)||[]).forEach(b=>{if(b&&b.name) blocks.set(b.name,b);});}catch(e){}
  const out={segs:[],polys:[],circles:[],arcs:[],texts:[],stats:{entities:0,inserts:0,skipped:{}},unitFactor,layers:{}};
  const bump=(layer)=>{out.layers[layer]=(out.layers[layer]||0)+1;};
  const skip=(t)=>{out.stats.skipped[t]=(out.stats.skipped[t]||0)+1;};
  const I=[1,0,0,1,0,0];
  function walk(ents,m,depth,layerOverride){
    if(!ents||depth>8) return;
    ents.forEach(e=>{
      if(!e||e.isInPaperSpace) return;
      if(e.isVisible===false) return;
      out.stats.entities++;
      const layer=(e.layer&&e.layer!=='0'?e.layer:(layerOverride||e.layer||'0'));
      const P=(p)=>cadApplyM(m,p.x||0,p.y||0);
      switch(e.type){
        case 'LINE':{const a=P(e.startPoint||{}),b=P(e.endPoint||{});out.segs.push({x1:a[0],y1:a[1],x2:b[0],y2:b[1],w:0,layer});bump(layer);break;}
        case 'LWPOLYLINE':
        case 'POLYLINE2D':{
          const vs=(e.vertices||[]).map(v=>({x:v.x!=null?v.x:(v.point&&v.point.x)||0,y:v.y!=null?v.y:(v.point&&v.point.y)||0,bulge:v.bulge||0}));
          if(vs.length<2){skip(e.type);break;}
          const closed=!!((e.flag||0)&1);
          const pts=[];pts.push([vs[0].x,vs[0].y]);
          const n=vs.length;
          for(let k=0;k<(closed?n:n-1);k++){
            const a=vs[k],b=vs[(k+1)%n];
            cadBulgePoints(a.x,a.y,b.x,b.y,a.bulge,6).forEach(p=>pts.push(p));
          }
          const tp=pts.map(p=>cadApplyM(m,p[0],p[1]));
          out.polys.push({pts:tp,closed,layer,w:e.constantWidth||0});
          for(let k=0;k+1<tp.length;k++) out.segs.push({x1:tp[k][0],y1:tp[k][1],x2:tp[k+1][0],y2:tp[k+1][1],w:0,layer,polyId:out.polys.length-1});
          bump(layer);break;}
        case 'CIRCLE':{const c=P(e.center||{});out.circles.push({cx:c[0],cy:c[1],r:(e.radius||0)*cadMScale(m),layer});bump(layer);break;}
        case 'ARC':{const c=P(e.center||{});const rot=Math.atan2(m[1],m[0]);const mirrored=(m[0]*m[3]-m[1]*m[2])<0;
          let a0=(e.startAngle||0),a1=(e.endAngle||0);
          if(mirrored){const t=-a0;a0=-a1;a1=t;}
          out.arcs.push({cx:c[0],cy:c[1],r:(e.radius||0)*cadMScale(m),a0:a0+rot,a1:a1+rot,layer});bump(layer);break;}
        case 'ELLIPSE':{ // 근사: 중심·장축·비율 → 폴리라인
          const c=P(e.center||{});const mj=e.majorAxisEndPoint||{x:1,y:0};const ratio=e.axisRatio||1;
          const a0=e.startAngle||0,a1=e.endAngle!=null?e.endAngle:Math.PI*2;
          const pts=[];const n=32;let sweep=a1-a0;if(sweep<=0) sweep+=Math.PI*2;
          for(let k=0;k<=n;k++){const t=a0+sweep*k/n;const lx=Math.cos(t),ly=Math.sin(t)*ratio;
            const x=(e.center.x||0)+lx*mj.x-ly*mj.y,y=(e.center.y||0)+lx*mj.y+ly*mj.x;pts.push(cadApplyM(m,x,y));}
          out.polys.push({pts,closed:Math.abs(sweep-Math.PI*2)<1e-6,layer,w:0});
          for(let k=0;k+1<pts.length;k++) out.segs.push({x1:pts[k][0],y1:pts[k][1],x2:pts[k+1][0],y2:pts[k+1][1],w:0,layer});
          bump(layer);break;}
        case 'SPLINE':{const src=(e.fitPoints&&e.fitPoints.length>=2)?e.fitPoints:(e.controlPoints||[]);
          if(src.length<2){skip(e.type);break;}
          const pts=src.map(p=>P(p));
          for(let k=0;k+1<pts.length;k++) out.segs.push({x1:pts[k][0],y1:pts[k][1],x2:pts[k+1][0],y2:pts[k+1][1],w:0,layer});
          bump(layer);break;}
        case 'TEXT':
        case 'MTEXT':{const p=P(e.startPoint||e.insertionPoint||{});const txt=(e.text||'').replace(/\\P/g,'\n').replace(/\\[A-Za-z][^;]*;/g,'').replace(/[{}]/g,'');
          if(txt.trim()){out.texts.push({x:p[0],y:p[1],text:txt.trim(),h:(e.textHeight||e.height||250)*cadMScale(m),layer});bump(layer);}
          break;}
        case 'INSERT':{
          const b=blocks.get(e.name);
          if(!b||!b.entities){skip('INSERT:'+e.name);break;}
          out.stats.inserts++;
          const ip=e.insertionPoint||{x:0,y:0},sx=e.xScale||1,sy=e.yScale||1,rot=e.rotation||0;
          const cos=Math.cos(rot),sin=Math.sin(rot);
          const bp=b.basePoint||{x:0,y:0};
          // m · T(ip) · R(rot) · S(sx,sy) · T(-bp)
          let mm=cadMulM(m,[1,0,0,1,ip.x||0,ip.y||0]);
          mm=cadMulM(mm,[cos,sin,-sin,cos,0,0]);
          mm=cadMulM(mm,[sx,0,0,sy,0,0]);
          mm=cadMulM(mm,[1,0,0,1,-(bp.x||0),-(bp.y||0)]);
          const cols=Math.max(1,e.columnCount||1),rows=Math.max(1,e.rowCount||1);
          for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
            const off=cadMulM(mm,[1,0,0,1,(c*(e.columnSpacing||0)),(r*(e.rowSpacing||0))]);
            walk(b.entities,off,depth+1,layer);
          }
          break;}
        default: skip(e.type);
      }
    });
  }
  walk((db&&db.entities)||[],I,0,null);
  return out;
}

/**
 * 프리미티브 → STATE 객체 생성 (공용 ingest)
 * @param prims {segs,polys,circles,arcs,texts}  — 좌표는 "도면 원시 단위", toMm(x,y)→[mm_x, mm_y(아래방향)] 로 환산
 * @param opts {toMm, scale(r/길이 환산 배수), mode:'line'|'wall', closedToSpace:boolean, layers:Set|null, minLenMm:number, label:string}
 * @returns {walls,spaces,circles,arcs,texts} 생성 수
 */
function cadIngestPrims(prims,opts){
  const toMm=opts.toMm,k=opts.scale||1,minLen=opts.minLenMm!=null?opts.minLenMm:50;
  const allow=(layer)=>!opts.layers||opts.layers.has(layer);
  const res={walls:0,spaces:0,circles:0,arcs:0,texts:0,dropped:0};
  // 로컬 버텍스 병합(격자 해시, tol 60mm) — ensureVertex O(n) 회피
  const grid=new Map();const TOL=60;
  const vkey=(x,y)=>Math.floor(x/TOL)+','+Math.floor(y/TOL);
  function vertexAt(x,y){
    x=Math.round(x);y=Math.round(y);
    const gx=Math.floor(x/TOL),gy=Math.floor(y/TOL);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const arr=grid.get((gx+dx)+','+(gy+dy));if(!arr)continue;
      for(const v of arr){if(Math.hypot(v.x-x,v.y-y)<TOL) return v;}}
    const v={id:makeId('v'),x,y};STATE.vertices.push(v);
    const kk=vkey(x,y);if(!grid.has(kk)) grid.set(kk,[]);grid.get(kk).push(v);
    return v;
  }
  const seenSeg=new Set();
  const layerTag=opts.label||'IMPORT';
  // 닫힌 폴리라인 → 공간
  const polyAsSpace=new Set();
  if(opts.closedToSpace&&prims.polys){
    prims.polys.forEach((p,idx)=>{
      if(!p.closed||p.pts.length<3||!allow(p.layer)) return;
      const poly=p.pts.map(pt=>{const m=toMm(pt[0],pt[1]);return {x:Math.round(m[0]),y:Math.round(m[1])};});
      // 닫힘 표현으로 마지막 점이 첫 점과 같으면 제거 (중복 꼭짓점 방지)
      while(poly.length>3&&Math.hypot(poly[poly.length-1].x-poly[0].x,poly[poly.length-1].y-poly[0].y)<2) poly.pop();
      if(poly.length<3) return;
      // 너무 작은 폴리곤(문·가구 심볼)은 제외: 면적 < 0.5㎡
      let a=0;for(let i=0;i<poly.length;i++){const j=(i+1)%poly.length;a+=poly[i].x*poly[j].y-poly[j].x*poly[i].y;}
      if(Math.abs(a)/2<0.5e6) return;
      const spType='LIVING';const sp=SPACE_TYPES[spType];const cnt=(STATE.spaces.filter(s=>s.type===spType).length)+1;
      const dm=(typeof defaultMaterials==='function')?defaultMaterials(spType):{floor:'STRONG'};
      STATE.spaces.push({id:makeId('s'),type:spType,polygon:poly,typeIndex:cnt,code:sp.code,
        layerName:'A-AREA-'+sp.code+'-'+String(cnt).padStart(2,'0'),name:'',ceilingHeight:sp.ceil||STATE.ceilingHeight,
        waterproofRecommended:sp.waterproof?'CONDITIONAL':false,floorMaterial:dm.floor,color:sp.color,importedFrom:layerTag});
      polyAsSpace.add(idx);res.spaces++;
    });
  }
  (prims.segs||[]).forEach(s=>{
    if(!allow(s.layer)) return;
    if(s.polyId!=null&&polyAsSpace.has(s.polyId)) return;
    const a=toMm(s.x1,s.y1),b=toMm(s.x2,s.y2);
    const len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(len<minLen){res.dropped++;return;}
    const ax=Math.round(a[0]),ay=Math.round(a[1]),bx=Math.round(b[0]),by=Math.round(b[1]);
    const key=ax<bx||(ax===bx&&ay<by)?ax+','+ay+'|'+bx+','+by:bx+','+by+'|'+ax+','+ay;
    if(seenSeg.has(key)){res.dropped++;return;}
    seenSeg.add(key);
    const v1=vertexAt(ax,ay),v2=vertexAt(bx,by);
    if(v1===v2){res.dropped++;return;}
    const w=makeWallVEF(v1.id,v2.id,{thickness:opts.mode==='wall'?STATE.wallThickness:50,layerName:s.layer||layerTag,spaceId:null,wallType:'standard'});
    if(opts.mode!=='wall') w.isLine=true;
    w.importedFrom=layerTag;
    STATE.walls.push(w);res.walls++;
  });
  (prims.circles||[]).forEach(c=>{
    if(!allow(c.layer)) return;const m=toMm(c.cx,c.cy);const r=Math.round(c.r*k);if(r<10) return;
    STATE.circles.push({id:makeId('cir'),x:Math.round(m[0]),y:Math.round(m[1]),radius_mm:r,layerName:c.layer,spaceId:null,importedFrom:layerTag});res.circles++;
  });
  (prims.arcs||[]).forEach(ar=>{
    if(!allow(ar.layer)) return;const m=toMm(ar.cx,ar.cy);const r=Math.round(ar.r*k);if(r<10) return;
    // DWG 각도는 y-위 좌표계(rad, CCW). MiniCAD 는 y-아래 화면좌표 deg → 부호 반전 (importDXF 와 동일 규약: startAngle:-ea, endAngle:-sa)
    const sa=ar.a0*180/Math.PI,ea=ar.a1*180/Math.PI;
    STATE.arcs.push({id:makeId('arc'),x:Math.round(m[0]),y:Math.round(m[1]),radius_mm:r,startAngle:-ea,endAngle:-sa,layerName:ar.layer,spaceId:null,importedFrom:layerTag});res.arcs++;
  });
  (prims.texts||[]).forEach(t=>{
    if(!allow(t.layer)) return;const m=toMm(t.x,t.y);
    const fs=Math.max(8,Math.min(48,Math.round((t.h*k)/25)));// 250mm 글자 ≈ 10px
    STATE.texts.push({id:makeId('t'),x:Math.round(m[0]),y:Math.round(m[1]),text:t.text,fontSize:fs,layerName:t.layer,importedFrom:layerTag});res.texts++;
  });
  return res;
}

/* ───────────────── 모달 UI ───────────────── */
function cadHideModal(){const m=document.getElementById('cad-import-modal');if(m) m.remove();}
function cadShowModal(title,bodyHTML,footHTML){
  cadHideModal();
  const modal=document.createElement('div');modal.id='cad-import-modal';modal.className='sc-overlay visible';
  modal.innerHTML='<div class="sc-modal" style="max-width:640px;width:min(96vw,640px)">'+
    '<div class="sc-header"><div class="sc-title">'+title+'</div><button class="sc-close" id="cad-import-close">✕</button></div>'+
    '<div id="cad-import-body" style="padding:14px 18px;max-height:min(70vh,640px);overflow:auto;font-size:12px;color:var(--ink-2);line-height:1.6">'+bodyHTML+'</div>'+
    (footHTML?'<div id="cad-import-foot" style="padding:10px 18px;border-top:1px solid var(--stroke-1);display:flex;gap:8px;justify-content:flex-end;align-items:center">'+footHTML+'</div>':'')+
    '</div>';
  document.body.appendChild(modal);
  modal.querySelector('#cad-import-close').addEventListener('click',cadHideModal);
  modal.addEventListener('click',e=>{if(e.target===modal) cadHideModal();});
  return modal;
}
function cadProgress(msg){
  let m=document.getElementById('cad-import-modal');
  if(!m){cadShowModal('가져오는 중…','<div id="cad-progress">'+msg+'</div>');return;}
  const p=m.querySelector('#cad-progress');if(p) p.textContent=msg; else {const b=m.querySelector('#cad-import-body');if(b) b.innerHTML='<div id="cad-progress">'+msg+'</div>';}
}
const CAD_SCALES=[{v:20,l:'1:20'},{v:30,l:'1:30'},{v:50,l:'1:50'},{v:60,l:'1:60'},{v:100,l:'1:100'},{v:150,l:'1:150'},{v:200,l:'1:200'},{v:300,l:'1:300'},{v:500,l:'1:500'}];
function cadScaleSelectHTML(id,def){
  return '<select id="'+id+'" class="ipt" style="min-width:90px">'+CAD_SCALES.map(s=>'<option value="'+s.v+'"'+(s.v===def?' selected':'')+'>'+s.l+'</option>').join('')+'<option value="custom">직접 입력</option></select>'+
    ' <input type="number" id="'+id+'-custom" class="ipt" placeholder="1:N 의 N" min="1" max="5000" style="width:90px;display:none">';
}
function cadReadScale(id){
  const sel=document.getElementById(id);if(!sel) return 100;
  if(sel.value==='custom'){const c=parseFloat((document.getElementById(id+'-custom')||{}).value);return c>0?c:100;}
  return parseFloat(sel.value)||100;
}
function cadLayerListHTML(layers){ // {name:count}
  const names=Object.keys(layers).sort((a,b)=>layers[b]-layers[a]);
  if(!names.length) return '<div style="color:var(--ink-3)">레이어 정보 없음</div>';
  return '<div style="display:flex;gap:6px;margin-bottom:6px"><button type="button" class="btn sm" id="cad-lyr-all">전체 선택</button><button type="button" class="btn sm" id="cad-lyr-none">전체 해제</button><span style="color:var(--ink-3);margin-left:auto">'+names.length+'개 레이어</span></div>'+
    '<div id="cad-lyr-list" style="max-height:180px;overflow:auto;border:1px solid var(--stroke-1);border-radius:6px;padding:6px 8px;background:var(--surface-2)">'+
    names.map((n,i)=>{
      const isDim=/dim|text|txt|hatch|해치|치수|문자|title|주석|anno/i.test(n);
      const sw=/^#[0-9a-f]{6}/i.test(n)?'<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+n.slice(0,7)+';border:1px solid #555;vertical-align:middle;margin-right:4px"></span>':'';
      return '<label style="display:flex;gap:8px;align-items:center;font-size:11px;padding:2px 0"><input type="checkbox" class="cad-lyr" data-layer="'+n.replace(/"/g,'&quot;')+'"'+(isDim?'':' checked')+'> '+sw+'<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+n.replace(/</g,'&lt;')+'</span><span style="color:var(--ink-3)">'+layers[n]+'</span></label>';
    }).join('')+'</div>';
}
function cadBindLayerButtons(modal){
  const all=modal.querySelector('#cad-lyr-all'),none=modal.querySelector('#cad-lyr-none');
  if(all) all.addEventListener('click',()=>modal.querySelectorAll('.cad-lyr').forEach(c=>c.checked=true));
  if(none) none.addEventListener('click',()=>modal.querySelectorAll('.cad-lyr').forEach(c=>c.checked=false));
}
function cadSelectedLayers(modal){
  const boxes=Array.from(modal.querySelectorAll('.cad-lyr'));
  if(!boxes.length) return null;
  return new Set(boxes.filter(b=>b.checked).map(b=>b.dataset.layer));
}
function cadBindScaleCustom(modal,id){
  const sel=modal.querySelector('#'+id),cus=modal.querySelector('#'+id+'-custom');
  if(sel&&cus) sel.addEventListener('change',()=>{cus.style.display=sel.value==='custom'?'inline-block':'none';if(sel.value==='custom') cus.focus();});
}
function cadFinish(res,label){
  STATE.videoSequenceOrder=null;
  if(typeof saveHistory==='function') saveHistory();
  if(typeof zoomFit==='function') zoomFit(); else if(typeof renderAll==='function') renderAll();
  if(typeof refreshUI==='function') refreshUI();
  const parts=[];
  if(res.walls) parts.push((res.mode==='wall'?'벽 ':'참조선 ')+res.walls+'개');
  if(res.spaces) parts.push('공간 '+res.spaces+'개');
  if(res.circles) parts.push('원 '+res.circles+'개');
  if(res.arcs) parts.push('호 '+res.arcs+'개');
  if(res.texts) parts.push('문자 '+res.texts+'개');
  if(res.dropped) parts.push('제외 '+res.dropped+'개(짧음·중복)');
  const msg=label+' 가져오기 완료 — '+(parts.join(' · ')||'가져온 객체 없음');
  if(typeof showStatus==='function') showStatus(msg);
  if(typeof cmdToast==='function') cmdToast(msg);
}

/* ───────────────── ① ② PDF ───────────────── */
async function importPDFFile(file){
  let pdfjs;
  try{cadProgress('PDF 엔진 로딩 중…');pdfjs=await CAD_IMPORT.pdfjs();}
  catch(err){cadHideModal();alert('PDF 엔진(pdf.js) 로드 실패: '+err.message);return;}
  let doc;
  try{
    cadProgress('PDF 읽는 중… ('+file.name+')');
    const buf=await file.arrayBuffer();
    doc=await pdfjs.getDocument({data:buf,isEvalSupported:false}).promise;
  }catch(err){cadHideModal();alert('PDF 열기 실패: '+err.message);return;}
  const n=doc.numPages;
  // 1페이지 미리보기 썸네일 + 벡터 선 개수 (선 추출 가능 여부 안내)
  let vecInfo='';
  try{
    const page=await doc.getPage(1);
    const ol=await page.getOperatorList();
    const prims=cadPdfOpsToPrims(ol.fnArray,ol.argsArray,page.getViewport({scale:1}).transform,pdfjs.OPS,{includeFills:false});
    vecInfo=prims.segs.length?('선 '+prims.segs.length.toLocaleString()+'개 감지 — 선 추출 가능'):'벡터 선 없음(스캔 PDF) — 밑그림으로만 가져올 수 있습니다';
    page.cleanup();
  }catch(e){vecInfo='벡터 분석 실패: '+e.message;}
  const body=
    '<div style="margin-bottom:10px;color:var(--ink-3)">'+file.name.replace(/</g,'&lt;')+' · '+n+'페이지 · '+vecInfo+'</div>'+
    '<div class="field" style="margin-bottom:8px"><label class="field-label">페이지</label> <input type="number" id="cad-pdf-page" class="ipt" value="1" min="1" max="'+n+'" style="width:70px"> / '+n+'</div>'+
    '<div class="field" style="margin-bottom:8px"><label class="field-label">방식</label> '+
      '<label style="margin-right:12px"><input type="radio" name="cad-pdf-mode" value="vector" '+(vecInfo.startsWith('선 ')?'checked':'')+'> 선 추출 (벡터 → 참조선/벽)</label>'+
      '<label><input type="radio" name="cad-pdf-mode" value="raster" '+(vecInfo.startsWith('선 ')?'':'checked')+'> 밑그림 (이미지로 깔기)</label></div>'+
    '<div class="field" style="margin-bottom:8px"><label class="field-label">도면 축척</label> '+cadScaleSelectHTML('cad-pdf-scale',100)+
      ' <span style="color:var(--ink-3)">(종이 1mm = 실제 N mm. 모르면 1:100 후 📐 스케일 보정)</span></div>'+
    '<div id="cad-pdf-vec-opts">'+
      '<div class="field" style="margin-bottom:8px"><label class="field-label">선 종류</label> '+
        '<label style="margin-right:12px"><input type="radio" name="cad-pdf-kind" value="line" checked> 참조선 (얇게, 추적용)</label>'+
        '<label><input type="radio" name="cad-pdf-kind" value="wall"> 벽 (두께 '+STATE.wallThickness+'mm)</label></div>'+
      '<div class="field" style="margin-bottom:8px"><label><input type="checkbox" id="cad-pdf-fills"> 채움 도형 외곽선도 포함 (해치·굵은 벽 표현이 채움인 PDF)</label></div>'+
      '<div class="field" style="margin-bottom:8px"><label><input type="checkbox" id="cad-pdf-closed"> 닫힌 도형(0.5㎡ 이상) → 공간으로</label></div>'+
      '<div class="field" style="margin-bottom:8px"><label class="field-label">최소 길이</label> <input type="number" id="cad-pdf-minlen" class="ipt" value="100" min="0" step="10" style="width:80px"> mm 미만 선 제외</div>'+
      '<div id="cad-pdf-layers" style="margin-top:6px"></div>'+
    '</div>'+
    '<div id="cad-pdf-ras-opts" style="display:none">'+
      '<div class="field" style="margin-bottom:8px"><label class="field-label">해상도</label> <select id="cad-pdf-dpi" class="ipt"><option value="100">100 dpi (가벼움)</option><option value="150" selected>150 dpi</option><option value="200">200 dpi</option><option value="300">300 dpi (선명, 큼)</option></select></div>'+
    '</div>';
  const modal=cadShowModal('📄 PDF 가져오기',body,'<button type="button" class="btn" id="cad-pdf-cancel">취소</button><button type="button" class="btn gold" id="cad-pdf-go">가져오기</button>');
  cadBindScaleCustom(modal,'cad-pdf-scale');
  const syncMode=()=>{const v=modal.querySelector('input[name=cad-pdf-mode]:checked').value;
    modal.querySelector('#cad-pdf-vec-opts').style.display=v==='vector'?'':'none';
    modal.querySelector('#cad-pdf-ras-opts').style.display=v==='raster'?'':'none';};
  modal.querySelectorAll('input[name=cad-pdf-mode]').forEach(r=>r.addEventListener('change',syncMode));syncMode();
  // 벡터 레이어(색상/굵기) 목록은 페이지 바뀔 때 갱신
  let lastPrims=null,lastPageNo=0,lastPage=null;
  async function analyze(){
    const pno=Math.max(1,Math.min(n,parseInt(modal.querySelector('#cad-pdf-page').value)||1));
    if(pno===lastPageNo&&lastPrims) return lastPrims;
    const page=await doc.getPage(pno);
    const ol=await page.getOperatorList();
    const fills=modal.querySelector('#cad-pdf-fills').checked;
    const prims=cadPdfOpsToPrims(ol.fnArray,ol.argsArray,page.getViewport({scale:1}).transform,pdfjs.OPS,{includeFills:fills});
    // 레이어 = 색상 + 굵기 구간
    const layers={};
    prims.segs.forEach(s=>{const wmm=s.w*CAD_IMPORT.PT_TO_MM;const cls=wmm>=0.5?' 굵게':wmm>=0.25?' 보통':' 가늘게';s.layer=s.layer.slice(0,7)+(s.fill?' (채움)':cls);layers[s.layer]=(layers[s.layer]||0)+1;});
    prims.polys.forEach(p=>{const wmm=p.w*CAD_IMPORT.PT_TO_MM;const cls=wmm>=0.5?' 굵게':wmm>=0.25?' 보통':' 가늘게';p.layer=p.layer.slice(0,7)+(p.fill?' (채움)':cls);});
    lastPrims={prims,layers,page,pno};lastPageNo=pno;lastPage=page;
    const box=modal.querySelector('#cad-pdf-layers');if(box){box.innerHTML='<div class="field-label" style="margin-bottom:4px">색상·굵기별 선택 ('+prims.segs.length.toLocaleString()+'개 선)</div>'+cadLayerListHTML(layers);cadBindLayerButtons(modal);}
    return lastPrims;
  }
  const reanalyze=()=>{lastPrims=null;analyze().catch(()=>{});};
  modal.querySelector('#cad-pdf-page').addEventListener('change',reanalyze);
  modal.querySelector('#cad-pdf-fills').addEventListener('change',reanalyze);
  analyze().catch(()=>{});
  modal.querySelector('#cad-pdf-cancel').addEventListener('click',cadHideModal);
  modal.querySelector('#cad-pdf-go').addEventListener('click',async()=>{
    const mode=modal.querySelector('input[name=cad-pdf-mode]:checked').value;
    const S=cadReadScale('cad-pdf-scale');
    const pno=Math.max(1,Math.min(n,parseInt(modal.querySelector('#cad-pdf-page').value)||1));
    try{
      if(mode==='raster'){
        const dpi=parseFloat(modal.querySelector('#cad-pdf-dpi').value)||150;
        const page=await doc.getPage(pno);
        const renderScale=dpi/72;
        const vp=page.getViewport({scale:renderScale});
        const MAX=4096;let rs=renderScale;
        if(vp.width>MAX||vp.height>MAX){rs=renderScale*Math.min(MAX/vp.width,MAX/vp.height);}
        const vp2=page.getViewport({scale:rs});
        cadProgress('렌더링 중… '+Math.round(vp2.width)+'×'+Math.round(vp2.height)+'px');
        const canvas=document.createElement('canvas');canvas.width=Math.round(vp2.width);canvas.height=Math.round(vp2.height);
        const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
        await page.render({canvasContext:ctx,viewport:vp2}).promise;
        const dataURL=canvas.toDataURL('image/png');
        // 이미지 1px = (1/rs) pt = (25.4/72/rs) mm(종이) × S (실제)
        const mmPerPx=CAD_IMPORT.PT_TO_MM/rs*S;
        cadHideModal();
        setBgImage(dataURL,file.name+' p'+pno);
        // setBgImage 는 비동기 onload 에서 STATE.bgImage 를 만들므로 잠시 후 스케일 적용
        const applyScale=()=>{if(STATE.bgImage&&STATE.bgImage.filename===file.name+' p'+pno){STATE.bgImage.scale=mmPerPx/1000*STATE.scale;if(typeof drawGrid==='function') drawGrid();if(typeof refreshBgImageUI==='function') refreshBgImageUI();if(typeof zoomFit==='function'&&STATE.spaces.length===0){/* 빈 도면이면 밑그림이 보이도록 */STATE.zoom=clampZoom(Math.min((stage.width()-100)/(canvas.width*mmPerPx/1000*STATE.scale),(stage.height()-100)/(canvas.height*mmPerPx/1000*STATE.scale)));STATE.offsetX=50;STATE.offsetY=50;drawGrid();renderAll();const z=document.getElementById('zoom-pct');if(z) z.textContent=Math.round(STATE.zoom*100)+'%';}
          showStatus('PDF 밑그림 — p'+pno+' · 1:'+S+' · '+canvas.width+'×'+canvas.height+'px · 1px='+mmPerPx.toFixed(2)+'mm');}else setTimeout(applyScale,60);};
        setTimeout(applyScale,60);
        page.cleanup();
        return;
      }
      // 벡터
      const info=await analyze();
      const kind=modal.querySelector('input[name=cad-pdf-kind]:checked').value;
      const closed=modal.querySelector('#cad-pdf-closed').checked;
      const minLen=parseFloat(modal.querySelector('#cad-pdf-minlen').value)||0;
      const layers=cadSelectedLayers(modal);
      cadProgress('선 생성 중… ('+info.prims.segs.length.toLocaleString()+'개)');
      const kMm=CAD_IMPORT.PT_TO_MM*S; // viewport scale 1 → 1px = 1pt
      const toMm=(x,y)=>[x*kMm,y*kMm]; // viewport.transform 이 이미 y-아래 방향
      const res=cadIngestPrims(info.prims,{toMm,scale:kMm,mode:kind,closedToSpace:closed,layers,minLenMm:minLen,label:'PDF:'+file.name});
      res.mode=kind;
      cadHideModal();
      cadFinish(res,'PDF p'+pno);
    }catch(err){cadHideModal();alert('PDF 가져오기 실패: '+err.message);console.error(err);}
  });
}

/* ───────────────── ③ DWG ───────────────── */
async function importDWGFile(file){
  let lib;
  try{cadProgress('DWG 엔진(libredwg WASM ~10MB) 로딩 중… 처음 한 번만 내려받습니다');lib=await CAD_IMPORT.libredwg();}
  catch(err){cadHideModal();alert('DWG 엔진 로드 실패: '+err.message+'\n(네트워크 상태를 확인하거나 DXF로 변환해서 가져와 주세요)');return;}
  let db;
  try{
    cadProgress('DWG 해석 중… ('+file.name+')');
    const buf=await file.arrayBuffer();
    const Dwg_File_Type=CAD_IMPORT._libredwgMod.Dwg_File_Type;
    const dwg=lib.dwg_read_data(buf,Dwg_File_Type.DWG);
    if(!dwg) throw new Error('파일을 해석할 수 없습니다 (손상됐거나 지원되지 않는 버전)');
    db=lib.convert(dwg);
    try{lib.dwg_free(dwg);}catch(e){}
  }catch(err){cadHideModal();alert('DWG 해석 실패: '+err.message+'\n\nR14 이하 구버전·암호화·교육용 워터마크 DWG 는 지원되지 않을 수 있습니다. AutoCAD/ODA 로 DXF 저장 후 가져와 주세요.');console.error(err);return;}
  const prims=cadDwgDbToPrims(db,{});
  const unitName={1:'mm',10:'cm',1000:'m',25.4:'inch',304.8:'ft'}[prims.unitFactor]||('×'+prims.unitFactor);
  const skippedStr=Object.entries(prims.stats.skipped).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>k+' '+v).join(', ');
  const body=
    '<div style="margin-bottom:10px;color:var(--ink-3)">'+file.name.replace(/</g,'&lt;')+' · 객체 '+prims.stats.entities.toLocaleString()+'개 · 블록 전개 '+prims.stats.inserts+'회 · 단위 '+unitName+
      (skippedStr?'<br>미지원/건너뜀: '+skippedStr:'')+'</div>'+
    '<div style="margin-bottom:8px">선 '+prims.segs.length.toLocaleString()+' · 원 '+prims.circles.length+' · 호 '+prims.arcs.length+' · 문자 '+prims.texts.length+'</div>'+
    '<div class="field" style="margin-bottom:8px"><label class="field-label">단위</label> <select id="cad-dwg-unit" class="ipt">'+
      [[1,'mm'],[10,'cm'],[1000,'m'],[25.4,'inch'],[304.8,'ft']].map(([v,l])=>'<option value="'+v+'"'+(v===prims.unitFactor?' selected':'')+'>'+l+(v===prims.unitFactor?' (파일 설정)':'')+'</option>').join('')+
      '</select> <span style="color:var(--ink-3)">도면 1단위 = 실제 몇 mm</span></div>'+
    '<div class="field" style="margin-bottom:8px"><label class="field-label">선 종류</label> '+
      '<label style="margin-right:12px"><input type="radio" name="cad-dwg-kind" value="line" checked> 참조선 (얇게)</label>'+
      '<label><input type="radio" name="cad-dwg-kind" value="wall"> 벽 (두께 '+STATE.wallThickness+'mm)</label></div>'+
    '<div class="field" style="margin-bottom:8px"><label><input type="checkbox" id="cad-dwg-closed"> 닫힌 폴리라인(0.5㎡ 이상) → 공간으로</label></div>'+
    '<div class="field" style="margin-bottom:8px"><label><input type="checkbox" id="cad-dwg-text" checked> 문자(TEXT/MTEXT) 가져오기</label></div>'+
    '<div class="field" style="margin-bottom:8px"><label class="field-label">최소 길이</label> <input type="number" id="cad-dwg-minlen" class="ipt" value="50" min="0" step="10" style="width:80px"> mm 미만 선 제외</div>'+
    '<div class="field-label" style="margin:8px 0 4px">레이어 선택 (치수·문자·해치 레이어는 기본 해제)</div>'+cadLayerListHTML(prims.layers);
  const modal=cadShowModal('📐 DWG 가져오기',body,'<button type="button" class="btn" id="cad-dwg-cancel">취소</button><button type="button" class="btn gold" id="cad-dwg-go">가져오기</button>');
  cadBindLayerButtons(modal);
  modal.querySelector('#cad-dwg-cancel').addEventListener('click',cadHideModal);
  modal.querySelector('#cad-dwg-go').addEventListener('click',()=>{
    try{
      const unit=parseFloat(modal.querySelector('#cad-dwg-unit').value)||1;
      const kind=modal.querySelector('input[name=cad-dwg-kind]:checked').value;
      const closed=modal.querySelector('#cad-dwg-closed').checked;
      const withText=modal.querySelector('#cad-dwg-text').checked;
      const minLen=parseFloat(modal.querySelector('#cad-dwg-minlen').value)||0;
      const layers=cadSelectedLayers(modal);
      // DWG 좌표 y-위 → MiniCAD y-아래 (importDXF 와 동일하게 y 반전)
      const toMm=(x,y)=>[x*unit,-y*unit];
      const p2={segs:prims.segs,polys:prims.polys,circles:prims.circles,arcs:prims.arcs,texts:withText?prims.texts:[]};
      cadProgress('객체 생성 중…');
      const res=cadIngestPrims(p2,{toMm,scale:unit,mode:kind,closedToSpace:closed,layers,minLenMm:minLen,label:'DWG:'+file.name});
      res.mode=kind;
      cadHideModal();
      cadFinish(res,'DWG');
    }catch(err){cadHideModal();alert('DWG 가져오기 실패: '+err.message);console.error(err);}
  });
}

// 가져온 객체 일괄 삭제 (실수로 너무 많이 들어왔을 때) — 명령창/콘솔에서 호출 가능
function cadRemoveImported(tag){
  const hit=o=>o.importedFrom&&(!tag||o.importedFrom===tag);
  let n=0;
  ['walls','spaces','circles','arcs','texts'].forEach(k=>{const before=STATE[k].length;STATE[k]=STATE[k].filter(o=>!hit(o));n+=before-STATE[k].length;});
  if(typeof cleanupOrphanVertices==='function') cleanupOrphanVertices();
  if(typeof saveHistory==='function') saveHistory();
  if(typeof renderAll==='function') renderAll();
  if(typeof refreshUI==='function') refreshUI();
  if(typeof showStatus==='function') showStatus('가져온 객체 '+n+'개 삭제');
  return n;
}
window.importPDFFile=importPDFFile;window.importDWGFile=importDWGFile;window.cadRemoveImported=cadRemoveImported;
