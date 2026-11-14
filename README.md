# apps

自分用のアプリ置き場です（データは入っていません。ログインした本人だけが自分のデータを読み書きできます）。

- `entame/` … エンタメ管理
- `okane/` … おかね手帳
- `fitlife/` … FitLife（ふたり用の健康管理。別のFirebaseプロジェクトを使用）
- `futari/` … ウリログ（恋人と共有するおでかけ候補。別のFirebaseプロジェクトを使用。ルールは firestore.rules）
- `shared/` … アプリ共通の土台（見た目と保存の仕組み）

## 公開と版の番号

main に反映すると、GitHub Actions（`.github/workflows/pages.yml`）が GitHub Pages に公開します。
公開の直前に `.github/scripts/stamp.py` が版の番号（日本時間の日時）を自動で付けます。
- 各アプリの html で読み込む自分の .js / .css に `?v=版` を付ける
- `sw.js` の `const CACHE = "アプリ名-…"` を新しい版にする

そのため、ファイルの中の版の番号を手で書きかえる必要はありません。
（リポジトリの Settings → Pages → Source は「GitHub Actions」にしておく）
