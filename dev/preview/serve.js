/* 確認用のサーバー：リポジトリをそのまま配り、entame/index.html だけ「サンプルデータで動く形」に差しかえて返す。
   アプリのファイルは書きかえない。使い方：node dev/preview/serve.js [ポート]  → http://localhost:8123/entame/ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

/* u-core.js の直後に、サンプルデータと保存先のかわりを差しこむ（Firebaseの設定は外す） */
function previewHtml(src) {
  return src
    .replace(/fb:\{[^}]*\}/, "fb:null")
    .replace(/(<script src="\.\.\/shared\/u-core\.js[^"]*"><\/script>)/, '$1\n<script src="../dev/preview/sample-data.js"></script>\n<script src="../dev/preview/mock-store.js"></script>');
}

function start(port = 8123) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) return res.writeHead(403).end();
    fs.readFile(file, (err, buf) => {
      if (err) return res.writeHead(404).end("not found");
      let body = buf;
      if (p === "/entame/index.html") body = previewHtml(buf.toString("utf8"));
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(body);
    });
  });
  return new Promise(r => srv.listen(port, () => r(srv)));
}
module.exports = { start };
if (require.main === module) start(+process.argv[2] || 8123).then(() => console.log("http://localhost:" + (+process.argv[2] || 8123) + "/entame/"));
