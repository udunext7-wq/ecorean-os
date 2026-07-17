'use strict';
// ===== v5.9+: 자동 견적 엔진 (AutoEstimate) =====
// 헌법 준수: 단가는 절대 추정하지 않는다.
//  - 단가의 유일한 원천 = 사용자 단가표(PRICE_TABLE, localStorage + JSON 가져오기/내보내기)
//  - 단가 미입력 항목 = NEEDS_RESEARCH 그대로 유지 (금액 계산 제외)
//  - 이 엔진의 역할 = 도면 → 물량 자동 산출(computeQty) × 사용자 단가 = 금액 (결정론적 곱셈뿐)
// 도면이 바뀔 때마다 refreshEstimate 훅으로 실시간 재계산된다.

// ===== 단가표 (사용자/BOC 관리) =====
const PRICE_TABLE_KEY='ecorean_price_table_v1';
const PRICE_TABLE=(function load(){
  const def={items:{},config:{overheadPct:10,vatPct:10}}; // items: {'FLOORING.STRONG': 45000, ...}
  try{
    const raw=localStorage.getItem(PRICE_TABLE_KEY);
    if(raw){
      const p=JSON.parse(raw);
      return {items:p.items||{},config:Object.assign({},def.config,p.config||{})};
    }
  }catch(e){console.warn('[AutoEstimate] 단가표 로드 실패:',e.message);}
  return def;
})();
function savePriceTable(){
  try{localStorage.setItem(PRICE_TABLE_KEY,JSON.stringify(PRICE_TABLE));}catch(e){}
}
function priceKeyOf(catalogKey,option){return option?catalogKey+'.'+option:catalogKey;}
function getUnitPrice(catalogKey,option){
  const v=PRICE_TABLE.items[priceKeyOf(catalogKey,option)];
  return (typeof v==='number'&&isFinite(v)&&v>=0)?v:null;
}
function setUnitPrice(priceKey,price){
  if(price==null){delete PRICE_TABLE.items[priceKey];}
  else{PRICE_TABLE.items[priceKey]=Math.round(price);} // 헌법: 원 단위 정수
  savePriceTable();
  proposePriceToDB(priceKey,price==null?null:Math.round(price));
}

// ===== DB 연동 (2026-07-17, BOC 방식) =====
// 읽기: 승인 단가(v_minicad_price_table) + 설정을 서버에서 로드 — 전사 공유.
//       로컬(localStorage)은 오프라인 캐시. 승인 단가가 로컬 값을 덮는다.
// 쓰기: 입력한 단가는 본인 화면에 즉시 반영 + DB에 '제안'으로 저장.
//       admin이 BOC(/boc/minicad-prices)에서 승인해야 전 직원 공식 단가가 된다 (헌법 3조).
let DB_PRICE_STATUS='offline';
async function loadPriceTableFromDB(){
  try{
    const r=await fetch('/api/minicad/price-table',{credentials:'same-origin'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const d=await r.json();
    if(d&&d.items&&typeof d.items==='object'){
      Object.assign(PRICE_TABLE.items,d.items); // 승인 단가 우선
      if(d.config){Object.assign(PRICE_TABLE.config,d.config);}
      DB_PRICE_STATUS='ok';
      savePriceTable();
      if(typeof renderAutoEstimate==='function'){try{renderAutoEstimate();}catch(_){}}
      console.log('[AutoEstimate] DB 승인 단가 '+Object.keys(d.items).length+'건 적용');
    }
  }catch(e){
    DB_PRICE_STATUS='offline';
    console.warn('[AutoEstimate] DB 단가 로드 실패 — 로컬 단가표로 동작:',e.message);
  }
}
function proposePriceToDB(priceKey,price){
  if(price==null) return; // 삭제는 로컬만 — DB 제안 철회·삭제는 BOC에서
  fetch('/api/minicad/price-table',{
    method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({priceKey:priceKey,price:price})
  }).then(r=>{
    if(!r.ok) console.warn('[AutoEstimate] 단가 제안 저장 실패 HTTP '+r.status);
    else console.log('[AutoEstimate] 단가 제안 저장:',priceKey,price,'(승인 대기)');
  }).catch(e=>console.warn('[AutoEstimate] 단가 제안 저장 실패:',e.message));
}
loadPriceTableFromDB();

// ===== 견적 산출 (결정론적) =====
function buildAutoEstimate(){
  const items=[];
  Object.entries(CATALOG).forEach(([k,c])=>{
    const qty=computeQty(k,c);
    if(qty<=0) return; // 물량 없는 공정은 견적서에서 제외
    const cfg=STATE.estimateConfig[k]||{};
    const opt=cfg.option||(c.options?Object.keys(c.options)[0]:null);
    const pk=priceKeyOf(k,opt);
    const up=getUnitPrice(k,opt);
    items.push({
      catalogKey:k,category:c.cat,name:c.name,
      option:opt,
      optionName:opt&&c.options?c.options[opt]:null,
      optionConfirmed:!!cfg.option, // false = 기본 옵션일 뿐, 사용자 미확정 (헌법: 미확정 명시)
      unit:c.unit,tag:c.tag,
      quantity:parseFloat(qty.toFixed(4)),
      priceKey:pk,
      unitPrice:up!=null?up:'NEEDS_RESEARCH',
      amount:up!=null?Math.round(qty*up):null,
    });
  });
  const priced=items.filter(i=>i.amount!=null);
  const subtotal=priced.reduce((s,i)=>s+i.amount,0);
  const overheadPct=PRICE_TABLE.config.overheadPct||0;
  const vatPct=PRICE_TABLE.config.vatPct||0;
  const overhead=Math.round(subtotal*overheadPct/100);
  const vat=Math.round((subtotal+overhead)*vatPct/100);
  return{
    items,
    subtotal,                       // 직접공사비 (단가 입력된 항목만)
    overheadPct,overhead,           // 공과잡비/경비
    vatPct,vat,                     // 부가세
    total:subtotal+overhead+vat,
    missingPriceCount:items.length-priced.length, // NEEDS_RESEARCH 잔여
    complete:items.length>0&&items.length===priced.length,
    priceSource:'USER_PRICE_TABLE', // 헌법: 프로그램 추정 아님 — 사용자 입력 단가만
  };
}

// ===== 렌더링 (견적 탭 자동 견적서 카드) =====
function fmtWon(n){return n==null?'—':n.toLocaleString('ko-KR');}
function renderAutoEstimate(){
  const el=document.getElementById('auto-estimate');
  if(!el) return;
  const ae=buildAutoEstimate();
  if(ae.items.length===0){
    el.innerHTML='<div class="hint">공간을 그리면 견적이 자동 생성됩니다.</div>';
    return;
  }
  let html='<table class="tbl"><thead><tr><th>항목</th><th style="text-align:right">수량</th><th style="text-align:right">단가(원)</th><th style="text-align:right">금액(원)</th></tr></thead><tbody>';
  CAT_ORDER.forEach(cat=>{
    const group=ae.items.filter(i=>i.category===cat);
    if(group.length===0) return;
    html+='<tr><td colspan="4" style="color:var(--gold,#C9A961);font-weight:600;padding-top:6px">'+escapeHtml(cat)+'</td></tr>';
    group.forEach(it=>{
      const nm=it.name+(it.optionName?' · '+it.optionName:'')+(it.optionConfirmed?'':' <span style="opacity:.5" title="옵션 미확정 (기본값)">?</span>');
      html+='<tr><td>'+nm+'</td>'
        +'<td style="text-align:right;white-space:nowrap">'+it.quantity+' '+escapeHtml(it.unit)+'</td>'
        +'<td style="text-align:right"><input type="text" class="ae-price" data-pk="'+escapeHtml(it.priceKey)+'" value="'+(typeof it.unitPrice==='number'?it.unitPrice.toLocaleString('ko-KR'):'')+'" placeholder="미입력" inputmode="numeric" style="width:76px;text-align:right;background:transparent;border:1px solid var(--stroke-1,#333);border-radius:3px;color:inherit;padding:2px 4px;font-size:11px"></td>'
        +'<td style="text-align:right;white-space:nowrap">'+(it.amount!=null?fmtWon(it.amount):'<span style="color:#E2725B;font-size:10px" title="단가 미입력 — 프로그램은 단가를 추정하지 않습니다 (헌법)">N_R</span>')+'</td></tr>';
    });
  });
  html+='</tbody></table>';
  // 합계 블록
  html+='<div style="border-top:1px solid var(--stroke-1,#333);margin-top:8px;padding-top:6px;font-size:12px">'
    +'<div style="display:flex;justify-content:space-between"><span>직접공사비</span><b>'+fmtWon(ae.subtotal)+'</b></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px"><span>공과잡비 <input type="text" id="ae-overhead-pct" value="'+ae.overheadPct+'" inputmode="numeric" style="width:34px;text-align:right;background:transparent;border:1px solid var(--stroke-1,#333);border-radius:3px;color:inherit;font-size:11px;padding:1px 3px">%</span><span>'+fmtWon(ae.overhead)+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px"><span>부가세 <input type="text" id="ae-vat-pct" value="'+ae.vatPct+'" inputmode="numeric" style="width:34px;text-align:right;background:transparent;border:1px solid var(--stroke-1,#333);border-radius:3px;color:inherit;font-size:11px;padding:1px 3px">%</span><span>'+fmtWon(ae.vat)+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px dashed var(--stroke-1,#333);font-size:14px"><span><b>총 견적</b></span><b style="color:var(--gold,#C9A961)">'+fmtWon(ae.total)+' 원</b></div>'
    +(ae.missingPriceCount>0?'<div class="hint" style="margin-top:6px;color:#E2725B">⚠ 단가 미입력 '+ae.missingPriceCount+'건 (NEEDS_RESEARCH) — 해당 항목은 총액에 미포함</div>':'<div class="hint" style="margin-top:6px;color:#7BA05B">✓ 전 항목 단가 입력 완료</div>')
    +'</div>';
  el.innerHTML=html;
  // 단가 입력 (change 시점에만 반영 — 포커스 유지)
  el.querySelectorAll('.ae-price').forEach(inp=>inp.addEventListener('change',e=>{
    const v=parseFloat(String(e.target.value).replace(/[,\s원]/g,''));
    setUnitPrice(e.target.dataset.pk,(isFinite(v)&&v>=0)?v:null);
    renderAutoEstimate();
    if(typeof refreshJSON==='function') refreshJSON();
  }));
  const oh=document.getElementById('ae-overhead-pct'),vt=document.getElementById('ae-vat-pct');
  if(oh) oh.addEventListener('change',e=>{const v=parseFloat(e.target.value);PRICE_TABLE.config.overheadPct=(isFinite(v)&&v>=0)?v:0;savePriceTable();renderAutoEstimate();});
  if(vt) vt.addEventListener('change',e=>{const v=parseFloat(e.target.value);PRICE_TABLE.config.vatPct=(isFinite(v)&&v>=0)?v:0;savePriceTable();renderAutoEstimate();});
}

// ===== 단가표 가져오기/내보내기 + 견적서 CSV =====
function exportPriceTable(){
  downloadText(JSON.stringify({schema:'ECOREAN.PriceTable.v1',exportedAt:new Date().toISOString(),...PRICE_TABLE},null,2),
    'ECOREAN_단가표.json','application/json');
  if(typeof showStatus==='function') showStatus('단가표 저장됨 ('+Object.keys(PRICE_TABLE.items).length+'개 단가)');
}
function importPriceTable(file){
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const p=JSON.parse(rd.result);
      if(!p.items||typeof p.items!=='object') throw new Error('items 없음 — ECOREAN.PriceTable 형식이 아닙니다');
      let n=0;
      Object.entries(p.items).forEach(([k,v])=>{if(typeof v==='number'&&isFinite(v)&&v>=0){PRICE_TABLE.items[k]=Math.round(v);n++;}});
      if(p.config){
        if(typeof p.config.overheadPct==='number')PRICE_TABLE.config.overheadPct=p.config.overheadPct;
        if(typeof p.config.vatPct==='number')PRICE_TABLE.config.vatPct=p.config.vatPct;
      }
      savePriceTable();renderAutoEstimate();
      if(typeof refreshJSON==='function') refreshJSON();
      if(typeof showStatus==='function') showStatus('단가표 불러옴 — '+n+'개 단가 적용');
    }catch(e){
      if(typeof showStatus==='function') showStatus('단가표 형식 오류: '+e.message);
    }
  };
  rd.readAsText(file);
}
function exportEstimateCSV(){
  const ae=buildAutoEstimate();
  const rows=[['공정','항목','옵션','옵션확정','수량','단위','단가(원)','금액(원)','상태']];
  ae.items.forEach(it=>rows.push([it.category,it.name,it.optionName||'',it.optionConfirmed?'확정':'기본값',
    it.quantity,it.unit,
    typeof it.unitPrice==='number'?it.unitPrice:'NEEDS_RESEARCH',
    it.amount!=null?it.amount:'',
    it.amount!=null?'':'단가 미입력']));
  rows.push([]);
  rows.push(['','','','','','','직접공사비',ae.subtotal,'']);
  rows.push(['','','','','','','공과잡비 '+ae.overheadPct+'%',ae.overhead,'']);
  rows.push(['','','','','','','부가세 '+ae.vatPct+'%',ae.vat,'']);
  rows.push(['','','','','','','총 견적',ae.total,ae.missingPriceCount>0?'단가 미입력 '+ae.missingPriceCount+'건 제외':'']);
  const csv='﻿'+rows.map(r=>r.map(c=>'"'+String(c??'').replace(/"/g,'""')+'"').join(',')).join('\r\n'); // BOM: Excel 한글 인코딩
  const safe=(STATE.projectName||'견적').replace(/[\\/:*?"<>|]/g,'_');
  downloadText(csv,safe+'_자동견적.csv','text/csv;charset=utf-8');
}

// ===== v5.9: 견적서 발행 (고객 제출용 인쇄 문서) =====
function buildEstimateDocHTML(){
  const ae=buildAutoEstimate();
  const today=new Date();
  const dateStr=today.getFullYear()+'년 '+(today.getMonth()+1)+'월 '+today.getDate()+'일';
  const valid=new Date(today.getTime()+30*24*3600*1000);
  const validStr=valid.getFullYear()+'.'+(valid.getMonth()+1)+'.'+valid.getDate();
  // 도면 썸네일 (헌법: 2.5D 강제 OFF)
  let planImg='';
  try{
    const was=STATE.plus2D;
    if(was){STATE.plus2D=false;renderAll();}
    planImg=stage.toDataURL({pixelRatio:1.5,mimeType:'image/png'});
    if(was){STATE.plus2D=true;renderAll();}
  }catch(e){}
  // 요약
  let tf=0;STATE.spaces.forEach(s=>{tf+=spArea(s);});
  const fmt=n=>n==null?'—':n.toLocaleString('ko-KR');
  // 공정별 행
  let rows='';
  CAT_ORDER.forEach(cat=>{
    const group=ae.items.filter(i=>i.category===cat);
    if(!group.length) return;
    rows+='<tr class="cat"><td colspan="7">'+escapeHtml(cat)+'</td></tr>';
    group.forEach(it=>{
      rows+='<tr><td>'+escapeHtml(it.name)+'</td>'
        +'<td>'+escapeHtml(it.optionName||'-')+(it.optionConfirmed?'':' <span class="nc">(미확정)</span>')+'</td>'
        +'<td class="r">'+it.quantity+'</td><td>'+escapeHtml(it.unit)+'</td>'
        +'<td class="r">'+(typeof it.unitPrice==='number'?fmt(it.unitPrice):'<span class="nc">NEEDS_RESEARCH</span>')+'</td>'
        +'<td class="r">'+(it.amount!=null?fmt(it.amount):'-')+'</td>'
        +'<td>'+(it.amount==null?'<span class="nc">단가 미입력</span>':'')+'</td></tr>';
    });
  });
  return '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>견적서 — '+escapeHtml(STATE.projectName)+'</title>'
    +'<style>'
    +'body{font-family:"Malgun Gothic","Inter",sans-serif;color:#1a1a1a;margin:28px;font-size:12px}'
    +'h1{text-align:center;letter-spacing:18px;font-size:26px;margin:6px 0 18px;border-bottom:3px double #333;padding-bottom:12px}'
    +'.meta{display:flex;justify-content:space-between;margin-bottom:12px;font-size:12px}'
    +'.meta div{line-height:1.7}'
    +'table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}'
    +'th,td{border:1px solid #999;padding:4px 6px}'
    +'th{background:#f0ede6}'
    +'.r{text-align:right}'
    +'tr.cat td{background:#faf7ef;font-weight:700;color:#8B7239}'
    +'.nc{color:#C0392B;font-size:10px}'
    +'.totals{margin-top:10px;width:46%;margin-left:auto}'
    +'.totals td{border:none;padding:3px 6px;font-size:12px}'
    +'.totals tr.grand td{border-top:2px solid #333;font-size:15px;font-weight:700;padding-top:6px}'
    +'.plan{text-align:center;margin:10px 0}'
    +'.plan img{max-width:100%;max-height:330px;border:1px solid #ccc}'
    +'.foot{margin-top:22px;font-size:11px;color:#555;line-height:1.8}'
    +'.sign{margin-top:26px;display:flex;justify-content:space-between;font-size:12px}'
    +'@media print{body{margin:10mm}}'
    +'</style></head><body>'
    +'<h1>견 적 서</h1>'
    +'<div class="meta"><div>'
    +'<b>프로젝트:</b> '+escapeHtml(STATE.projectName)+'<br>'
    +'<b>바닥면적:</b> '+tf.toFixed(2)+'㎡ ('+(tf*0.3025).toFixed(1)+'평) · 공간 '+STATE.spaces.length+'개<br>'
    +'<b>견적일:</b> '+dateStr+' · <b>유효기간:</b> '+validStr+'까지'
    +'</div><div style="text-align:right">'
    +'<b>공급자:</b> ECOREAN<br>연락처: udunext7@gmail.com<br>ECOREAN MiniCAD v5.9 자동 산출'
    +'</div></div>'
    +(planImg?'<div class="plan"><img src="'+planImg+'" alt="평면도"></div>':'')
    +'<table><thead><tr><th>항목</th><th>규격/옵션</th><th>수량</th><th>단위</th><th>단가(원)</th><th>금액(원)</th><th>비고</th></tr></thead>'
    +'<tbody>'+rows+'</tbody></table>'
    +'<table class="totals">'
    +'<tr><td>직접공사비</td><td class="r">'+fmt(ae.subtotal)+' 원</td></tr>'
    +'<tr><td>공과잡비 ('+ae.overheadPct+'%)</td><td class="r">'+fmt(ae.overhead)+' 원</td></tr>'
    +'<tr><td>부가세 ('+ae.vatPct+'%)</td><td class="r">'+fmt(ae.vat)+' 원</td></tr>'
    +'<tr class="grand"><td>총 견적 금액</td><td class="r">'+fmt(ae.total)+' 원</td></tr>'
    +'</table>'
    +'<div class="foot">'
    +(ae.missingPriceCount>0?'※ <b style="color:#C0392B">단가 미입력 '+ae.missingPriceCount+'건(NEEDS_RESEARCH)은 총액에 포함되지 않았습니다.</b><br>':'')
    +'※ 물량은 도면 기준 자동 산출값이며, 현장 실측 후 변동될 수 있습니다.<br>'
    +'※ 단가 출처: 사용자/BOC 단가표 (프로그램 자동 추정 아님).<br>'
    +'※ (미확정) 표기 옵션은 기본값으로, 협의 후 확정이 필요합니다.'
    +'</div>'
    +'<div class="sign"><span>공급자: ECOREAN (인)</span><span>수신: ____________ (인)</span></div>'
    +'</body></html>';
}
function printEstimate(){
  const html=buildEstimateDocHTML();
  const w=window.open('','_blank','width=900,height=1200');
  if(!w){if(typeof showStatus==='function')showStatus('팝업 차단을 해제해 주세요');return;}
  w.document.write(html);
  w.document.close();
  setTimeout(()=>{try{w.focus();w.print();}catch(e){}},450);
}
// 단가표 템플릿: CATALOG 전 항목×옵션 조합 (값 null → 사용자가 채운 뒤 불러오기)
function exportPriceTemplate(){
  const items={};
  Object.entries(CATALOG).forEach(([k,c])=>{
    if(c.options) Object.keys(c.options).forEach(o=>{items[k+'.'+o]=null;});
    else items[k]=null;
  });
  Object.assign(items,PRICE_TABLE.items); // 기존 입력값은 유지
  downloadText(JSON.stringify({
    schema:'ECOREAN.PriceTable.v1',
    note:'null 값을 원 단위 정수 단가로 채운 뒤 [단가표 불러오기]로 적용하세요. 키 형식: CATALOG키.옵션키',
    items,config:PRICE_TABLE.config,
  },null,2),'ECOREAN_단가표_템플릿.json','application/json');
  if(typeof showStatus==='function')showStatus('단가표 템플릿 저장 — '+Object.keys(items).length+'개 항목');
}

// ===== 훅: 도면 변경 → 견적 자동 갱신 / JSON에 autoEstimate 포함 =====
(function hookAutoEstimate(){
  if(typeof refreshEstimate==='function'){
    const _orig=refreshEstimate;
    refreshEstimate=function(){_orig();renderAutoEstimate();};
  }
  if(typeof buildJSON==='function'){
    const _orig=buildJSON;
    buildJSON=function(){
      const j=_orig();
      // 헌법: 단가 = 사용자 단가표 입력값만 (unitPriceSource로 출처 명시)
      if(j.estimateInput) j.estimateInput.autoEstimate=buildAutoEstimate();
      return j;
    };
  }
})();

// ===== 버튼 바인딩 =====
(function bindAutoEstimateUI(){
  const imp=document.getElementById('btn-price-import');
  const exp=document.getElementById('btn-price-export');
  const csv=document.getElementById('btn-estimate-csv');
  const fi=document.getElementById('price-file-input');
  const prt=document.getElementById('btn-estimate-print');   // v5.9: 견적서 인쇄
  const tpl=document.getElementById('btn-price-template');   // v5.9: 단가표 템플릿
  if(imp&&fi){imp.addEventListener('click',()=>fi.click());
    fi.addEventListener('change',e=>{if(e.target.files&&e.target.files[0]){importPriceTable(e.target.files[0]);e.target.value='';}});}
  if(exp) exp.addEventListener('click',exportPriceTable);
  if(csv) csv.addEventListener('click',exportEstimateCSV);
  if(prt) prt.addEventListener('click',printEstimate);
  if(tpl) tpl.addEventListener('click',exportPriceTemplate);
  renderAutoEstimate(); // 초기 1회
})();
