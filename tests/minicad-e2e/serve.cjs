// 정적 서버 — ecorean-os 레포 루트를 :8090 으로 (프리폼 E2E 용)
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=require('path').join(__dirname,'..','..');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.wasm':'application/wasm'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p.endsWith('/')) p+='index.html';
  const f=path.join(ROOT,p);
  fs.readFile(f,(err,data)=>{
    if(err){ res.writeHead(404); res.end('404 '+p); return; }
    res.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});
    res.end(data);
  });
}).listen(8090,()=>console.log('serve :8090 root='+ROOT));
