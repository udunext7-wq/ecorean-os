/**
 * ECOREAN BOC Engine v2.0.0
 * UMD: browser(window.BOCEngine) / Node.js(module.exports)
 * DOM 접근 금지 — 순수 함수 전용
 */
;(function (global) {
  'use strict'

  /* ── CONFIG ───────────────────────────────────────────── */
  const CONFIG = Object.freeze({
    VERSION:       '2.0.0',
    CONTRACT_RATE: 1.15,
    VAT_RATE:      1.10,
    TABS: ['estimate','projects','presets','reports',
           'approval','dbmgr','ontology','aiengine','dashboard'],
  })

  /* ── CalcEngine ───────────────────────────────────────── */
  const CalcEngine = (function () {
    const DB = {
      'WTP_BT':  { name:'방수(욕실)',     cat:'방수',   unit:'㎡', lb:25000, mt:8000,  wr:0.10, dur:1   },
      'TILE_BT': { name:'바닥타일(욕실)', cat:'타일',   unit:'㎡', lb:22000, mt:35000, wr:0.15, dur:1   },
      'TILE_WL': { name:'벽타일(욕실)',   cat:'타일',   unit:'㎡', lb:25000, mt:30000, wr:0.15, dur:1   },
      'TILE_KT': { name:'주방타일',       cat:'타일',   unit:'㎡', lb:22000, mt:28000, wr:0.15, dur:0.5 },
      'GROUT':   { name:'줄눈',           cat:'타일',   unit:'㎡', lb:8000,  mt:3000,  wr:0.05, dur:0.5 },
      'WP_BASIC':{ name:'도배(합지)',     cat:'도배',   unit:'㎡', lb:4500,  mt:2500,  wr:0.10, dur:0.5 },
      'WP_PRMR': { name:'초배지',         cat:'도배',   unit:'㎡', lb:3000,  mt:1500,  wr:0.10, dur:0.3 },
      'FL_HB':   { name:'강마루',         cat:'바닥재', unit:'㎡', lb:15000, mt:35000, wr:0.10, dur:0.5 },
      'FL_VNL':  { name:'장판',           cat:'바닥재', unit:'㎡', lb:8000,  mt:12000, wr:0.05, dur:0.3 },
      'MLD_BASE':{ name:'걸레받이',       cat:'몰딩',   unit:'m',  lb:5000,  mt:3000,  wr:0.05, dur:0.2 },
      'WIN_RPL': { name:'창호교체',       cat:'창호',   unit:'식', lb:150000,mt:450000,wr:0.05, dur:0.5 },
      'WIN_FOAM':{ name:'우레탄폼',       cat:'창호',   unit:'식', lb:15000, mt:5000,  wr:0.05, dur:0.2 },
      'DR_RPL':  { name:'도어교체',       cat:'도어',   unit:'짝', lb:80000, mt:250000,wr:0.05, dur:0.3 },
      'PLB_PIPE':{ name:'배관교체',       cat:'배관',   unit:'식', lb:350000,mt:150000,wr:0.05, dur:2   },
      'PLB_BOIR':{ name:'보일러교체',     cat:'배관',   unit:'식', lb:100000,mt:800000,wr:0.02, dur:1   },
      'ELE_WIRE':{ name:'전선교체',       cat:'전기',   unit:'식', lb:500000,mt:200000,wr:0.05, dur:2   },
      'ELE_OUT': { name:'콘센트/스위치',  cat:'전기',   unit:'개', lb:15000, mt:8000,  wr:0.05, dur:0.1 },
      'KIT_CAB': { name:'주방가구',       cat:'주방',   unit:'m',  lb:150000,mt:500000,wr:0.02, dur:1   },
      'SNT_WC':  { name:'위생도기',       cat:'위생',   unit:'식', lb:80000, mt:350000,wr:0.02, dur:0.5 },
      'VNT_FAN': { name:'환풍기',         cat:'위생',   unit:'개', lb:30000, mt:80000, wr:0.02, dur:0.3 },
      'CEL_BTH': { name:'욕실천장',       cat:'천장',   unit:'㎡', lb:18000, mt:15000, wr:0.10, dur:0.3 },
      'ASB_RMV': { name:'석면제거',       cat:'특수',   unit:'㎡', lb:80000, mt:20000, wr:0.10, dur:1   },
      'EXP_BAL': { name:'발코니확장',     cat:'발코니', unit:'㎡', lb:120000,mt:80000, wr:0.05, dur:1   },
      'INS_BAL': { name:'발코니단열',     cat:'발코니', unit:'㎡', lb:25000, mt:35000, wr:0.10, dur:0.5 },
      'SCREED':  { name:'바닥미장',       cat:'토목',   unit:'㎡', lb:12000, mt:8000,  wr:0.05, dur:0.5 },
      'MRB_FLR': { name:'대리석',         cat:'특수',   unit:'㎡', lb:60000, mt:150000,wr:0.10, dur:1   },
      'EPX_FLR': { name:'에폭시',         cat:'특수',   unit:'㎡', lb:18000, mt:22000, wr:0.05, dur:0.5 },
      'SIGN':    { name:'간판',           cat:'상업',   unit:'식', lb:200000,mt:500000,wr:0.05, dur:1   },
      'CNTR':    { name:'카운터',         cat:'상업',   unit:'식', lb:300000,mt:700000,wr:0.05, dur:2   },
      'CCTV':    { name:'CCTV',           cat:'상업',   unit:'식', lb:150000,mt:250000,wr:0.02, dur:0.5 },
    }

    function calcSupply(qty, lb, mt, wr, pm, matMul) {
      return qty * (1 + wr) * (lb * pm + mt * matMul)
    }

    function calcSpace(sp) {
      const w  = (sp.width  || 0) / 1000
      const l  = (sp.length || 0) / 1000
      const h  = (sp.height || 2400) / 1000
      const wins  = sp.windows || []
      const doors = sp.doors   || []
      const winArea  = wins.reduce((s, w2) => s + (w2.w/1000)*(w2.h/1000), 0)
      const doorArea = doors.reduce((s, d2) => s + (d2.w/1000)*(d2.h/1000), 0)
      const fa = w * l
      const wa = Math.max(0, 2*(w+l)*h - winArea - doorArea)
      return { fa, wa, ca:fa, pr:2*(w+l), winArea, doorArea, wn:wins.length, dn:doors.length }
    }

    function getTotals(spaces) {
      let fa=0,wa=0,ca=0,pr=0,wn=0,dn=0
      let wet=0,wetFA=0,wetWA=0,balFA=0,dryFA=0,kitFA=0,bedroomFA=0,bathroomCount=0
      for (const sp of spaces) {
        const c = calcSpace(sp)
        fa+=c.fa; wa+=c.wa; ca+=c.ca; pr+=c.pr; wn+=c.wn; dn+=c.dn
        if      (sp.type==='bathroom') { wet++; bathroomCount++; wetFA+=c.fa; wetWA+=c.wa }
        else if (sp.type==='balcony')  { balFA+=c.fa }
        else if (sp.type==='kitchen')  { kitFA+=c.fa; dryFA+=c.fa }
        else if (sp.type==='bedroom')  { bedroomFA+=c.fa; dryFA+=c.fa }
        else                           { dryFA+=c.fa }
      }
      return { fa,wa,ca,pr,wn,dn,wet,wetFA,wetWA,balFA,dryFA,kitFA,bedroomFA,bathroomCount,cor:0 }
    }

    function getHoistMul(floor, hasElev) {
      if (floor<=4)  return hasElev ? 1.00 : 1.10
      if (floor<=9)  return hasElev ? 1.08 : 1.18
      if (floor<=14) return hasElev ? 1.15 : 1.25
      return hasElev ? 1.20 : 1.30
    }

    function calculateEstimate(state, db) {
      const d = db || DB
      const spaces = state.spaces || []
      if (!spaces.length) return null
      const totals  = getTotals(spaces)
      const pm      = state.gradeMul || 1.0
      const adjMul  = getHoistMul(state.floorLevel||1, state.hasElev!==false)
                     * (state.resid ? 1.10 : 1.0)
                     * (state.region || 1.0)
      const ctx     = { fa:totals.fa, wa:totals.wa, wetFA:totals.wetFA, wetWA:totals.wetWA,
                        dryFA:totals.dryFA, balFA:totals.balFA, kitFA:totals.kitFA,
                        bathroomCount:totals.bathroomCount, wn:totals.wn, dn:totals.dn }
      const lines = []
      for (const id of (state.selectedProcessIds||[])) {
        const item = d[id]; if (!item) continue
        let qty = 0
        if      (item.cat==='방수'||item.cat==='위생'||item.cat==='천장'||item.cat==='타일') qty = ctx.wetFA
        else if (item.cat==='도배')   qty = totals.wa
        else if (item.cat==='바닥재') qty = ctx.dryFA
        else if (item.cat==='몰딩')   qty = totals.pr
        else if (item.cat==='창호')   qty = ctx.wn
        else if (item.cat==='도어')   qty = ctx.dn
        else if (item.cat==='전기'||item.cat==='배관') qty = totals.fa
        else if (item.cat==='주방')   qty = Math.max(1, Math.sqrt(ctx.kitFA))
        else if (item.cat==='발코니') qty = ctx.balFA
        else if (item.cat==='특수')   qty = ctx.dryFA || totals.fa
        else qty = 1
        if (qty<=0) continue
        const sp = calcSupply(qty, item.lb, item.mt, item.wr, pm*adjMul, 1.0)
        lines.push({ id, name:item.name, cat:item.cat, unit:item.unit,
          qty:Math.round(qty*100)/100, lb:item.lb, mt:item.mt,
          supplyPrice:Math.round(sp), auto:false, note:'' })
      }
      const totalSupply    = lines.reduce((s,l) => s+l.supplyPrice, 0)
      const contractAmount = Math.round(totalSupply * CONFIG.CONTRACT_RATE)
      const finalAmount    = Math.round(contractAmount * CONFIG.VAT_RATE)
      const duration       = Math.ceil(lines.reduce((s,l) => { const i=d[l.id]; return s+(i?i.dur:0) }, 0))
      return { lines, totalSupply, contractAmount, finalAmount, duration, totals }
    }

    function runTests() {
      const assert = (c, m) => { if (!c) throw new Error('[CalcEngine] FAIL: '+m) }
      assert(calcSupply(10,20000,10000,0.1,1.0,1.0) === 10*1.1*30000, 'T01')
      assert(calcSupply(1,20000,0,0,1.3,1.0) === 26000, 'T02')
      assert(calcSupply(1,0,10000,0.15,1.0,1.0) === 11500, 'T03')
      const s4 = calcSpace({type:'living',width:4000,length:5000})
      assert(Math.abs(s4.fa-20)<0.01, 'T04 fa')
      const s5 = calcSpace({type:'living',width:3000,length:4000,height:2400})
      assert(Math.abs(s5.wa-2*(3+4)*2.4)<0.01, 'T05 wa')
      const s6 = calcSpace({type:'living',width:3000,length:4000,height:2400,windows:[{w:1200,h:1200}]})
      assert(Math.abs(s6.wa-(2*7*2.4-1.44))<0.01, 'T06 win')
      const s7 = calcSpace({type:'bedroom',width:3000,length:3000,height:2400,doors:[{w:900,h:2100}]})
      assert(Math.abs(s7.wa-(2*6*2.4-1.89))<0.01, 'T07 door')
      const s8 = calcSpace({type:'bathroom',width:0,length:0})
      assert(s8.fa===0&&s8.wa===0, 'T08 zero')
      const t9 = getTotals([])
      assert(t9.fa===0&&t9.bathroomCount===0, 'T09 empty')
      const t10 = getTotals([{type:'bathroom',width:1500,length:2000},{type:'living',width:4000,length:5000}])
      assert(t10.bathroomCount===1, 'T10 btCount')
      assert(Math.abs(t10.wetFA-3)<0.01, 'T10 wetFA')
      const t11 = getTotals([{type:'bedroom',width:3000,length:3000},{type:'bedroom',width:3000,length:3000}])
      assert(Math.abs(t11.fa-18)<0.01, 'T11 multi')
      assert(getHoistMul(3,true)===1.00, 'T12a')
      assert(getHoistMul(3,false)===1.10, 'T12b')
      assert(getHoistMul(15,true)===1.20, 'T13a')
      assert(getHoistMul(15,false)===1.30, 'T13b')
      assert(calculateEstimate({spaces:[],selectedProcessIds:[],region:1.0})=== null, 'T14')
      const r15 = calculateEstimate({spaces:[{type:'bathroom',width:1500,length:2000}],selectedProcessIds:['WTP_BT'],floorLevel:1,hasElev:true,gradeMul:1.0,resid:false})
      assert(r15!==null&&r15.totalSupply>0, 'T15a')
      assert(Math.abs(r15.contractAmount-r15.totalSupply*1.15)<1, 'T15b')
      assert(Math.abs(r15.finalAmount-r15.contractAmount*1.10)<1, 'T15c')
      // T16: resid=true increases supply
      const base16 = {spaces:[{type:'bathroom',width:1500,length:2000}],selectedProcessIds:['WTP_BT'],floorLevel:1,hasElev:true,gradeMul:1.0,region:1.0}
      const r16a = calculateEstimate({...base16,resid:false})
      const r16b = calculateEstimate({...base16,resid:true})
      assert(r16b.totalSupply > r16a.totalSupply, 'T16 resid')
      // T17: gradeMul=1.3 increases supply
      const r17a = calculateEstimate({...base16,resid:false,gradeMul:1.0})
      const r17b = calculateEstimate({...base16,resid:false,gradeMul:1.3})
      assert(r17b.totalSupply > r17a.totalSupply, 'T17 gradeMul1.3')
      // T18: gradeMul=1.7 > gradeMul=1.3
      const r18 = calculateEstimate({...base16,resid:false,gradeMul:1.7})
      assert(r18.totalSupply > r17b.totalSupply, 'T18 gradeMul1.7')
      // T19: region=1.2 increases supply
      const r19a = calculateEstimate({...base16,resid:false,gradeMul:1.0,region:1.0})
      const r19b = calculateEstimate({...base16,resid:false,gradeMul:1.0,region:1.2})
      assert(r19b.totalSupply > r19a.totalSupply, 'T19 region1.2')
      // T20: getHoistMul floor 5
      assert(getHoistMul(5,true)===1.08,'T20a fl5elev')
      assert(getHoistMul(9,false)===1.18,'T20b fl9noelev')
      // T21: getHoistMul floor 10-14
      assert(getHoistMul(10,true)===1.15,'T21a fl10elev')
      assert(getHoistMul(14,false)===1.25,'T21b fl14noelev')
      // T22: 3-space estimate
      const r22 = calculateEstimate({
        spaces:[{type:'bathroom',width:1500,length:2000},{type:'living',width:5000,length:4000},{type:'bedroom',width:3000,length:3000}],
        selectedProcessIds:['WTP_BT','WP_BASIC','FL_HB'],
        floorLevel:1,hasElev:true,gradeMul:1.0,resid:false,region:1.0
      })
      assert(r22!==null,'T22 3space')
      assert(r22.lines.length===3,'T22 3lines')
      // T23: 0-area space → qty=0 → line skipped
      const r23 = calculateEstimate({spaces:[{type:'bathroom',width:0,length:0}],selectedProcessIds:['WTP_BT'],floorLevel:1,hasElev:true,gradeMul:1.0,resid:false,region:1.0})
      assert(r23!==null&&r23.lines.length===0,'T23 zeroArea')
      // T24: contractAmount = totalSupply * 1.15
      const r24 = calculateEstimate({...base16,resid:false})
      assert(Math.abs(r24.contractAmount-r24.totalSupply*1.15)<1,'T24 contract1.15')
      // T25: finalAmount = contractAmount * 1.10
      assert(Math.abs(r24.finalAmount-r24.contractAmount*1.10)<1,'T25 vat1.10')
      return true
    }

    return { calcSupply, calcSpace, getTotals, getHoistMul, calculateEstimate, runTests, DB }
  })()

  /* ── OntologyEngine ───────────────────────────────────── */
  const OntologyEngine = (function () {
    const RULES = [
      { id:'R01', trigger:'TILE_BT', action:'GROUT',    type:'AUTO',        note:'욕실 바닥타일 → 줄눈 자동' },
      { id:'R02', trigger:'TILE_WL', action:'GROUT',    type:'AUTO',        note:'욕실 벽타일 → 줄눈 자동' },
      { id:'R03', trigger:'TILE_KT', action:'GROUT',    type:'AUTO',        note:'주방타일 → 줄눈 자동' },
      { id:'R04', trigger:'WP_BASIC',action:'WP_PRMR',  type:'AUTO',        note:'도배 → 초배 자동' },
      { id:'R05', trigger:'FL_HB',   action:'MLD_BASE', type:'AUTO',        note:'강마루 → 걸레받이 자동' },
      { id:'R06', trigger:'FL_VNL',  action:'MLD_BASE', type:'AUTO',        note:'장판 → 걸레받이 자동' },
      { id:'R07', trigger:'WIN_RPL', action:'WIN_FOAM', type:'AUTO',        note:'창호교체 → 우레탄폼 자동' },
      { id:'R08', trigger:'TILE_BT', action:'CEL_BTH',  type:'AUTO',        note:'욕실 공사 → 천장 자동' },
      { id:'R09', trigger:'TILE_BT', action:'SNT_WC',   type:'AUTO',        note:'욕실 공사 → 위생도기 자동' },
      { id:'R10', trigger:'TILE_BT', action:'VNT_FAN',  type:'AUTO',        note:'욕실 공사 → 환풍기 자동' },
      { id:'R11', trigger:'KIT_CAB', action:'TILE_KT',  type:'AUTO',        note:'주방가구 → 주방타일 자동' },
      { id:'R12', trigger:'KIT_CAB', action:'GROUT',    type:'AUTO',        note:'주방가구 → 줄눈 자동' },
      { id:'R13', trigger:'EXP_BAL', action:'INS_BAL',  type:'AUTO',        note:'발코니확장 → 단열 자동' },
      { id:'R14', trigger:'EXP_BAL', action:'SCREED',   type:'AUTO',        note:'발코니확장 → 미장 자동' },
      { id:'R15', trigger:'DR_RPL',  action:'MLD_BASE', type:'AUTO',        note:'도어교체 → 문선 자동' },
      { id:'R16', trigger:'ELE_WIRE',action:'ELE_OUT',  type:'AUTO',        note:'전선교체 → 콘센트 자동' },
      { id:'R17', trigger:'PLB_BOIR',action:'PLB_PIPE', type:'AUTO',        note:'보일러 → 배관점검 자동' },
      { id:'R18', trigger:'MRB_FLR', action:'SCREED',   type:'AUTO',        note:'대리석 → 미장 자동' },
      { id:'R19', trigger:'SIGN',    action:'CCTV',     type:'AUTO',        note:'간판 → CCTV 자동' },
      { id:'R20', trigger:'TILE_BT', action:'WTP_BT',   type:'CONDITIONAL', note:'욕실타일 → 방수 권고' },
      { id:'R21', trigger:'EXP_BAL', action:'WIN_RPL',  type:'CONDITIONAL', note:'발코니확장 → 창호교체 권고' },
      { id:'R22', trigger:'FL_HB',   action:'SCREED',   type:'CONDITIONAL', note:'강마루 → 수평미장 권고' },
      { id:'R23', trigger:'WTP_BT',  action:'TILE_BT',  type:'CONDITIONAL', note:'방수 → 바닥타일 권고' },
      { id:'R24', trigger:'__galvanized__', action:'PLB_PIPE', type:'FORCED', note:'갈바나이즈 → 배관교체 강제' },
      { id:'R25', trigger:'__asbestos__',   action:'ASB_RMV',  type:'FORCED', note:'석면 의심 → 석면제거 강제' },
      { id:'R26', trigger:'CNTR',    action:'ELE_OUT',  type:'AUTO',        note:'카운터 → 콘센트 자동' },
    ]

    function applyOntology(selectedIds, ctx) {
      const sel = new Set(selectedIds)
      const autoAdded = [], warnings = []
      const c = ctx || {}
      if (c.pipeMat==='galvanized' && !sel.has('PLB_PIPE')) {
        sel.add('PLB_PIPE'); autoAdded.push({id:'PLB_PIPE',note:'갈바나이즈 강제',ruleId:'R24'})
      }
      if (c.hasAsbestos && !sel.has('ASB_RMV')) {
        sel.add('ASB_RMV'); autoAdded.push({id:'ASB_RMV',note:'석면 강제',ruleId:'R25'})
      }
      let changed=true, iter=0
      while (changed && iter<10) {
        changed=false; iter++
        for (const rule of RULES) {
          if (rule.type!=='AUTO') continue
          if (sel.has(rule.trigger) && !sel.has(rule.action)) {
            sel.add(rule.action); autoAdded.push({id:rule.action,note:rule.note,ruleId:rule.id}); changed=true
          }
        }
      }
      for (const rule of RULES) {
        if (rule.type!=='CONDITIONAL') continue
        if (sel.has(rule.trigger) && !sel.has(rule.action))
          warnings.push({ruleId:rule.id,message:rule.note,trigger:rule.trigger,action:rule.action})
      }
      return { selectedIds:[...sel], autoAdded, warnings }
    }

    function runTests() {
      const assert = (c,m) => { if (!c) throw new Error('[OntologyEngine] FAIL: '+m) }
      const r1 = applyOntology([],{})
      assert(r1.selectedIds.length===0,'T01 empty')
      const r2 = applyOntology(['TILE_BT'],{})
      assert(r2.selectedIds.includes('GROUT'),'T02 grout')
      assert(r2.autoAdded.some(a=>a.id==='GROUT'),'T02 autoAdded')
      assert(applyOntology(['WP_BASIC'],{}).selectedIds.includes('WP_PRMR'),'T03 primer')
      assert(applyOntology(['FL_HB'],{}).selectedIds.includes('MLD_BASE'),'T04 base')
      assert(applyOntology(['WIN_RPL'],{}).selectedIds.includes('WIN_FOAM'),'T05 foam')
      const r6 = applyOntology(['TILE_BT'],{})
      assert(r6.selectedIds.includes('CEL_BTH'),'T06a ceil')
      assert(r6.selectedIds.includes('SNT_WC'),'T06b sanit')
      assert(r6.selectedIds.includes('VNT_FAN'),'T06c fan')
      const r7 = applyOntology([],{pipeMat:'galvanized'})
      assert(r7.selectedIds.includes('PLB_PIPE'),'T07 galv')
      assert(r7.autoAdded.some(a=>a.ruleId==='R24'),'T07 R24')
      assert(applyOntology([],{hasAsbestos:true}).selectedIds.includes('ASB_RMV'),'T08 asb')
      assert(applyOntology(['TILE_BT','GROUT'],{}).autoAdded.filter(a=>a.id==='GROUT').length===0,'T09 no dup')
      assert(applyOntology(['TILE_BT'],{}).warnings.some(w=>w.action==='WTP_BT'),'T10 warn')
      assert(RULES.length===26,'T11 26rules')
      // T12: FL_VNL → MLD_BASE (장판 → 걸레받이)
      assert(applyOntology(['FL_VNL'],{}).selectedIds.includes('MLD_BASE'),'T12 vnl→base')
      // T13: DR_RPL → MLD_BASE (도어교체 → 문선)
      assert(applyOntology(['DR_RPL'],{}).selectedIds.includes('MLD_BASE'),'T13 dr→base')
      // T14: ELE_WIRE → ELE_OUT (전선교체 → 콘센트)
      assert(applyOntology(['ELE_WIRE'],{}).selectedIds.includes('ELE_OUT'),'T14 wire→out')
      // T15: PLB_BOIR → PLB_PIPE (보일러 → 배관점검)
      assert(applyOntology(['PLB_BOIR'],{}).selectedIds.includes('PLB_PIPE'),'T15 boir→pipe')
      // T16: KIT_CAB → TILE_KT + GROUT chain
      const r16o = applyOntology(['KIT_CAB'],{})
      assert(r16o.selectedIds.includes('TILE_KT'),'T16 kit→tile')
      assert(r16o.selectedIds.includes('GROUT'),'T16 kit→grout')
      // T17: EXP_BAL → INS_BAL + SCREED chain
      const r17o = applyOntology(['EXP_BAL'],{})
      assert(r17o.selectedIds.includes('INS_BAL'),'T17 exp→ins')
      assert(r17o.selectedIds.includes('SCREED'),'T17 exp→screed')
      // T18: EXP_BAL conditional warning WIN_RPL (R21)
      assert(r17o.warnings.some(w=>w.action==='WIN_RPL'),'T18 exp→winrpl warn')
      // T19: idempotency — pre-selected items not duplicated in autoAdded
      const r19o = applyOntology(['TILE_BT','GROUT','CEL_BTH','SNT_WC','VNT_FAN'],{})
      assert(r19o.autoAdded.filter(a=>a.id==='GROUT').length===0,'T19 idem grout')
      assert(r19o.autoAdded.filter(a=>a.id==='CEL_BTH').length===0,'T19 idem ceil')
      // T20: both galvanized AND hasAsbestos
      const r20o = applyOntology([],{pipeMat:'galvanized',hasAsbestos:true})
      assert(r20o.selectedIds.includes('PLB_PIPE'),'T20 galv')
      assert(r20o.selectedIds.includes('ASB_RMV'),'T20 asb')
      return true
    }

    return { applyOntology, runTests, RULES }
  })()

  /* ── DiagEngine ───────────────────────────────────────── */
  const DiagEngine = (function () {
    function runDiag(lines, ctx) {
      const ws=[], c=ctx||{}
      const ids  = new Set((lines||[]).map(l=>l.id))
      const cats = new Set((lines||[]).map(l=>l.cat))
      if ((c.bathroomCount||0)>0 && !ids.has('WTP_BT'))
        ws.push({code:'W001',type:'warn',msg:'욕실이 있지만 방수 공정이 없습니다.'})
      if (cats.has('타일') && !ids.has('GROUT'))
        ws.push({code:'W002',type:'warn',msg:'타일 공정이 있지만 줄눈이 없습니다.'})
      if (c.hasAsbestos && !ids.has('ASB_RMV'))
        ws.push({code:'E001',type:'error',msg:'석면 의심 건물에 석면 제거 공정이 없습니다.'})
      if (c.pipeMat==='galvanized' && !ids.has('PLB_PIPE'))
        ws.push({code:'W003',type:'warn',msg:'갈바나이즈 배관 교체가 강력히 권장됩니다.'})
      if (ids.has('EXP_BAL') && !ids.has('INS_BAL'))
        ws.push({code:'W004',type:'warn',msg:'발코니 확장 시 단열 공정이 필요합니다.'})
      if ((c.duration||0)>30)
        ws.push({code:'I001',type:'info',msg:'예상 공기 '+c.duration+'일 — 장기 공사 계획 필요'})
      if (!ws.length) ws.push({code:'OK',type:'ok',msg:'진단 이상 없음'})
      return ws
    }

    function runTests() {
      const assert = (c,m) => { if (!c) throw new Error('[DiagEngine] FAIL: '+m) }
      const base = {bathroomCount:0,pipeMat:'pb',hasAsbestos:false}
      assert(runDiag([],base)[0]?.code==='OK','T01 OK')
      assert(runDiag([],{...base,bathroomCount:1}).some(w=>w.code==='W001'),'T02 W001')
      assert(!runDiag([{id:'WTP_BT',cat:'방수'}],{...base,bathroomCount:1}).some(w=>w.code==='W001'),'T03 no W001')
      assert(runDiag([],{...base,hasAsbestos:true}).some(w=>w.code==='E001'&&w.type==='error'),'T04 E001')
      assert(runDiag([],{...base,pipeMat:'galvanized'}).some(w=>w.code==='W003'),'T05 W003')
      assert(runDiag([{id:'EXP_BAL',cat:'발코니'}],base).some(w=>w.code==='W004'),'T06 W004')
      // T07: W002 — tile without grout
      assert(runDiag([{id:'TILE_BT',cat:'타일'}],base).some(w=>w.code==='W002'),'T07 W002 tile')
      // T08: W003 fixed — galvanized + PLB_PIPE present
      assert(!runDiag([{id:'PLB_PIPE',cat:'배관'}],{...base,pipeMat:'galvanized'}).some(w=>w.code==='W003'),'T08 W003 fixed')
      // T09: W004 fixed — EXP_BAL + INS_BAL present
      assert(!runDiag([{id:'EXP_BAL',cat:'발코니'},{id:'INS_BAL',cat:'발코니'}],base).some(w=>w.code==='W004'),'T09 W004 fixed')
      // T10: I001 — duration > 30
      assert(runDiag([],{...base,duration:45}).some(w=>w.code==='I001'),'T10 I001')
      // T11: E001 fixed — asbestos with ASB_RMV present
      assert(!runDiag([{id:'ASB_RMV',cat:'특수'}],{...base,hasAsbestos:true}).some(w=>w.code==='E001'),'T11 E001 fixed')
      // T12: complex OK — bathroom + WTP_BT, no issues
      const r12d = runDiag([{id:'WTP_BT',cat:'방수'}],{bathroomCount:1,pipeMat:'pb',hasAsbestos:false,duration:20})
      assert(r12d[0]?.code==='OK','T12 ok complex')
      return true
    }

    return { runDiag, runTests }
  })()

  /* ── ScheduleEngine ───────────────────────────────────── */
  const ScheduleEngine = (function () {
    function addDays(dateStr, days) {
      const d = new Date(dateStr)
      d.setDate(d.getDate() + days)
      return d.toISOString().slice(0,10)
    }

    function calcOrderDeadline(startDate, leadDays) {
      const days = (leadDays!==undefined&&leadDays!==null) ? leadDays : 14
      return addDays(startDate, -days)
    }

    function generateSchedule(startDate, processIds, db) {
      if (!startDate||!processIds||!processIds.length) return []
      const d = db || CalcEngine.DB
      let cursor = startDate
      return processIds.map(id => {
        const item = d[id]
        const dur  = item ? Math.max(1,Math.ceil(item.dur)) : 1
        const task = {id, name:item?item.name:id, start:cursor, dur}
        cursor = addDays(cursor, dur)
        return task
      })
    }

    function calcCriticalPath(tasks) {
      if (!tasks.length) return {duration:0,path:[]}
      return {duration:tasks.reduce((s,t)=>s+t.dur,0), path:tasks.map(t=>t.id)}
    }

    function runTests() {
      const assert = (c,m) => { if (!c) throw new Error('[ScheduleEngine] FAIL: '+m) }
      assert(addDays('2026-01-01',10)==='2026-01-11','T01')
      assert(addDays('2026-01-25',10)==='2026-02-04','T02')
      assert(calcOrderDeadline('2026-05-01',14)==='2026-04-17','T03')
      assert(generateSchedule('2026-05-01',[],{}).length===0,'T04')
      const mock={'WTP_BT':{name:'방수',dur:1},'TILE_BT':{name:'타일',dur:2}}
      const s5 = generateSchedule('2026-05-01',['WTP_BT','TILE_BT'],mock)
      assert(s5.length===2,'T05 len')
      assert(s5[0]?.start==='2026-05-01','T05 s0')
      assert(s5[1]?.start==='2026-05-02','T05 s1')
      assert(calcCriticalPath(s5).duration===3,'T06 CPM')
      assert(calcOrderDeadline('2026-05-01',0)==='2026-05-01','T07 lead0')
      // T08: 3-task chain dates
      const mock3 = {'WTP_BT':{name:'방수',dur:1},'TILE_BT':{name:'타일',dur:2},'GROUT':{name:'줄눈',dur:0.5}}
      const s8 = generateSchedule('2026-05-01',['WTP_BT','TILE_BT','GROUT'],mock3)
      assert(s8.length===3,'T08 len3')
      assert(s8[0].start==='2026-05-01','T08 s0')
      assert(s8[1].start==='2026-05-02','T08 s1')
      assert(s8[2].start==='2026-05-04','T08 s2')
      // T09: leadDays=30
      assert(calcOrderDeadline('2026-05-31',30)==='2026-05-01','T09 lead30')
      // T10: leadDays=7
      assert(calcOrderDeadline('2026-05-08',7)==='2026-05-01','T10 lead7')
      // T11: calcCriticalPath empty
      const cp11 = calcCriticalPath([])
      assert(cp11.duration===0,'T11 cpm empty dur')
      assert(cp11.path.length===0,'T11 cpm empty path')
      // T12: calcCriticalPath single task
      const cp12 = calcCriticalPath([{id:'A',dur:5}])
      assert(cp12.duration===5,'T12 cpm single dur')
      assert(cp12.path[0]==='A','T12 cpm single path')
      // T13: total duration of 3-task schedule (1+2+ceil(0.5)=4)
      assert(calcCriticalPath(s8).duration===4,'T13 cpm 3task')
      // T14: fractional dur → ceil in generateSchedule
      const mock14 = {'GROUT':{name:'줄눈',dur:0.5}}
      const s14 = generateSchedule('2026-05-01',['GROUT'],mock14)
      assert(s14[0].dur===1,'T14 ceil dur')
      // T15: addDays across year boundary
      assert(addDays('2025-12-25',10)==='2026-01-04','T15 year boundary')
      return true
    }

    return { generateSchedule, calcOrderDeadline, calcCriticalPath, runTests }
  })()

  /* ── FinanceEngine ────────────────────────────────────── */
  const FinanceEngine = (function () {
    function calcProfitRate(revenue, cost) {
      if (!revenue) return 0
      return Math.round((revenue-cost)/revenue*10000)/100
    }

    function isEstimateExpired(validUntil) {
      if (!validUntil) return false
      return new Date(validUntil) < new Date()
    }

    function calcProjectFinance(incomes, expenses) {
      const inc=incomes||[], exp=expenses||[]
      const totalRevenue = inc.reduce((s,i)=>s+(i.amount||0),0)
      const totalCost    = exp.reduce((s,e)=>s+(e.amount||0),0)
      const profit       = totalRevenue - totalCost
      const profitRate   = calcProfitRate(totalRevenue, totalCost)
      const received     = inc.filter(i=>i.paid).reduce((s,i)=>s+i.amount,0)
      const pending      = totalRevenue - received
      const paid         = exp.filter(e=>e.paid).reduce((s,e)=>s+e.amount,0)
      const unpaid       = totalCost - paid
      return {totalRevenue,totalCost,profit,profitRate,received,pending,paid,unpaid,cashBalance:received-paid}
    }

    function runTests() {
      const assert = (c,m) => { if (!c) throw new Error('[FinanceEngine] FAIL: '+m) }
      assert(calcProfitRate(10000000,7000000)===30,'T01')
      assert(calcProfitRate(0,0)===0,'T02')
      const f3 = calcProjectFinance([{amount:10000000,paid:true},{amount:5000000,paid:false}],[{amount:8000000,paid:true}])
      assert(f3.totalRevenue===15000000,'T03a')
      assert(f3.profit===7000000,'T03b')
      assert(f3.received===10000000,'T03c')
      assert(f3.pending===5000000,'T03d')
      const f4 = calcProjectFinance([{amount:3000000,paid:true}],[{amount:2000000,paid:true}])
      assert(Math.abs(f4.profitRate-33.33)<0.01,'T04')
      assert(calcProjectFinance([{amount:5000000,paid:true}],[]).profitRate===100,'T05')
      // T06: cashBalance = received - paid
      const f6 = calcProjectFinance(
        [{amount:10000000,paid:true},{amount:5000000,paid:false}],
        [{amount:8000000,paid:true},{amount:2000000,paid:false}]
      )
      assert(f6.cashBalance===2000000,'T06 cashBalance')
      // T07: isEstimateExpired past date
      assert(isEstimateExpired('2020-01-01')===true,'T07 expired')
      // T08: isEstimateExpired future date
      assert(isEstimateExpired('2099-12-31')===false,'T08 not expired')
      // T09: isEstimateExpired empty string
      assert(isEstimateExpired('')===false,'T09 empty')
      // T10: unpaid = totalCost - paid
      assert(f6.unpaid===2000000,'T10 unpaid')
      // T11: profitRate precision
      assert(calcProfitRate(3000000,2000000)===33.33,'T11 profitRate33.33')
      // T12: loss scenario
      const f12 = calcProjectFinance([{amount:5000000,paid:true}],[{amount:8000000,paid:true}])
      assert(f12.profit===-3000000,'T12 loss profit')
      assert(f12.profitRate<0,'T12 loss rate')
      // T13: all expenses paid → unpaid=0
      const f13 = calcProjectFinance([{amount:10000000,paid:false}],[{amount:5000000,paid:true}])
      assert(f13.unpaid===0,'T13 all paid')
      // T14: multiple incomes
      const f14 = calcProjectFinance([{amount:1000000,paid:true},{amount:2000000,paid:true},{amount:3000000,paid:false}],[])
      assert(f14.totalRevenue===6000000,'T14 multi revenue')
      assert(f14.received===3000000,'T14 received')
      assert(f14.pending===3000000,'T14 pending')
      // T15: zero everything
      const f15 = calcProjectFinance([],[])
      assert(f15.totalRevenue===0&&f15.profit===0&&f15.cashBalance===0,'T15 zeros')
      return true
    }

    return { calcProjectFinance, calcProfitRate, isEstimateExpired, runTests }
  })()

  /* ── Export ───────────────────────────────────────────── */
  const BOCEngine = { CONFIG, CalcEngine, OntologyEngine, DiagEngine, ScheduleEngine, FinanceEngine }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BOCEngine
  } else {
    global.BOCEngine   = BOCEngine
    global.CONFIG      = CONFIG
    global.CalcEngine  = CalcEngine
    global.OntologyEngine = OntologyEngine
    global.DiagEngine  = DiagEngine
    global.ScheduleEngine = ScheduleEngine
    global.FinanceEngine  = FinanceEngine
  }
})(typeof window !== 'undefined' ? window : global)
