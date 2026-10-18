import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.argv[2]; const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.wav':'audio/wav','.ttf':'font/ttf','.ico':'image/x-icon','.json':'application/json'};
http.createServer((req,res)=>{ let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root,'index.html');
  res.writeHead(200, {'content-type': types[path.extname(p)] ?? 'application/octet-stream'}); fs.createReadStream(p).pipe(res);
}).listen(8765, '127.0.0.1', ()=>console.log('serving on 8765'));
