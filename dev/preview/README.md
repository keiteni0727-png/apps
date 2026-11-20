# 確認用の画面（エンタメ管理）

ログインもFirebaseも使わずに、**架空のサンプルデータ**でエンタメ管理を動かして、全画面のスクリーンショットを撮るための道具です。
本番のデータには一切つながりません。アプリのファイル（`entame/`）も書きかえません。

- `serve.js` … リポジトリをそのまま配るサーバー。`entame/index.html` だけ、サンプルデータで動く形に差しかえて返す
- `sample-data.js` … 架空の作品・話数・YouTube（今日＝2026年11月20日として作ってある）
- `mock-store.js` … 保存先のかわり（メモリの中だけ。開き直すと元に戻る）
- `shoot.js` … 全画面を撮る（スマホ幅・PC幅、明るい表示・暗い表示）

## 使い方

```bash
node dev/preview/shoot.js 出力先のフォルダ          # 全画面を撮る
node dev/preview/shoot.js 出力先のフォルダ detail   # 名前に「detail」を含む画面だけ
node dev/preview/serve.js                           # ブラウザで http://localhost:8123/entame/ を開いて触る
```

自分のバックアップ（設定 → データのバックアップで書き出したファイル）をこのフォルダに置き、
`http://localhost:8123/entame/?backup=ファイル名.json` と開くと、そのデータで表示できます。
バックアップのファイルはコミットしないこと（`.gitignore` で除外済み）。

公開されるサイトには関係しません（GitHub Pages に載っても、ここのファイルはアプリから読み込まれません）。
