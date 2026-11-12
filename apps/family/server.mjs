import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
const root = fileURLToPath(new URL('./out/', import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
try { await stat(resolve(root, 'index.html')); } catch { console.error('请先在项目根目录运行 npm run family:build'); process.exit(1); }
createServer(async (req, res) => {
  try {
    let path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (path !== root.slice(0,-1) && !path.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403).end(); return; }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(await readFile(path));
  } catch { res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'}).end('未找到页面'); }
}).listen(port, '0.0.0.0', () => console.log(`聪聪家庭练习：http://localhost:${port}\n同一 Wi-Fi 的 iPad：将 localhost 换成电脑的局域网 IPv4 地址。数据按浏览器与地址分别保存。`));
