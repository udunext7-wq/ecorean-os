// 헤드리스 크롬 CDP 하네스 (ws 만 사용) — 프리폼 단독 E2E
const {spawn}=require('child_process');
const http=require('http');
const WebSocket=require('ws');
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
function getJSON(url){ return new Promise((res,rej)=>{ http.get(url,r=>{ let s=''; r.on('data',d=>s+=d); r.on('end',()=>{ try{res(JSON.parse(s));}catch(e){rej(e);} }); }).on('error',rej); }); }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function launch(opts={}){
  const port=opts.port||9333;
  const prof='C:/Users/udune/AppData/Local/Temp/claude/ff-e2e-prof-'+port;
  const ch=spawn(CHROME,['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+prof,'--no-first-run','--no-default-browser-check',
    '--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--window-size=1400,900','--hide-scrollbars','--disable-gpu-vsync','about:blank'],{stdio:'ignore'});
  let list=null;
  for(let i=0;i<60;i++){ try{ list=await getJSON('http://127.0.0.1:'+port+'/json'); break; }catch(_){ await sleep(200); } }
  if(!list) throw new Error('chrome 안 뜸');
  const tab=list.find(t=>t.type==='page')||list[0];
  const ws=new WebSocket(tab.webSocketDebuggerUrl,{perMessageDeflate:false});
  await new Promise((r,j)=>{ ws.on('open',r); ws.on('error',j); });
  let id=0; const pend=new Map(); const evs=[];
  ws.on('message',d=>{ const m=JSON.parse(d); if(m.id&&pend.has(m.id)){ const p=pend.get(m.id); pend.delete(m.id); m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result); } else if(m.method) evs.push(m); });
  const send=(method,params={})=>new Promise((res,rej)=>{ const i=++id; pend.set(i,{res,rej}); ws.send(JSON.stringify({id:i,method,params})); });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  const errors=[];
  ws.on('message',d=>{ const m=JSON.parse(d);
    if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
    if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error') errors.push(m.params.args.map(a=>a.value||a.description).join(' '));
  });
  const evalJS=async(expr,awaitP=true)=>{ const r=await send('Runtime.evaluate',{expression:expr,awaitPromise:awaitP,returnByValue:true}); if(r.exceptionDetails) throw new Error('eval: '+(r.exceptionDetails.exception?.description||r.exceptionDetails.text)+'\n'+expr.slice(0,300)); return r.result.value; };
  const goto=async(url)=>{ await send('Page.navigate',{url}); await sleep(600); };
  const waitFor=async(expr,ms=15000)=>{ const t0=Date.now(); while(Date.now()-t0<ms){ try{ if(await evalJS(expr)) return true; }catch(_){ } await sleep(150); } throw new Error('timeout: '+expr); };
  const close=()=>{ try{ws.close();}catch(_){ } try{ch.kill();}catch(_){ } };
  return {send,evalJS,goto,waitFor,close,errors,sleep};
}
module.exports={launch,sleep};
