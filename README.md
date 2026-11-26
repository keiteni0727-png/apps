# apps

自分用のアプリ置き場です（データは入っていません。ログインした本人だけが自分のデータを読み書きできます）。

- エンタメ管理 … 2026-11-24 に独立したリポジトリ `entame` へ移動（https://keiteni0727-png.github.io/entame/）
  機能ごとにファイルを分けている：core.js（決まった値・データ・保存・要確認のチェック）→ view.js（一覧・番組表）→ filters.js（絞り込み・並び替え）→ paste.js（各話リストの読み取り）→ detail.js（作品の詳細）→ episodes.js（話数タブ）→ epaste.js（貼り付けの画面）→ dropdown.js（編集画面のプルダウン）→ form.js（作品の編集）→ settings.js → yt.js（YouTubeの一覧）→ yt-detail.js（YouTubeの詳細・編集）→ lists.js（シリーズ・主題歌）→ anilist.js（AniListから作品の情報を取る）→ al-ui.js（AniListから探す・AniListで確認・新作／続編のお知らせ）→ events.js（ボタン・入力の受け付け）→ helpers.js（矢印キー・日付の入力などの補助）→ boot.js（起動）。見た目は app.css
  ボタン・文字の大きさ・角の丸みなどは `shared/u-base.css` の「見た目の決まり」を使う（見本は `dev/preview/style-guide.html`）
- `okane/` … おかね手帳
- `fitlife/` … FitLife（ふたり用の健康管理。別のFirebaseプロジェクトを使用）
- `futari/` … ウリログ（恋人と共有するおでかけ候補。別のFirebaseプロジェクトを使用。ルールは firestore.rules）
  機能ごとにファイルを分けている：core.js（共通の道具・状態）→ auth / main / memories / uri / uri-fun / couple / quiz / sheets → events.js（ボタン）→ boot.js（Firebaseにつないで起動）。見た目は app.css
- `shared/` … アプリ共通の土台
  - `u-sync.js` … 保存と同期の見張り役（4アプリ共通）。読み込みが止まったら自動でつなぎ直し、保存に失敗したら自動で保存し直す
  - `u-auth.js` … ログインの処理（4アプリ共通）。Googleログイン・メールのリンク・パスワード・エラー文。画面の見た目は各アプリのまま
  - `u-core.js` / `u-ui.js` / `u-base.css` / `u-swipe.js` … エンタメ管理・おかね手帳の土台（保存先・通知・プルダウンなどの部品・見た目）

## 公開と版の番号

main に反映すると、GitHub Actions（`.github/workflows/pages.yml`）が GitHub Pages に公開します。
公開の直前に `.github/scripts/stamp.py` が版の番号（日本時間の日時）を自動で付けます。
- 各アプリの html で読み込む自分の .js / .css に `?v=版` を付ける
- `sw.js` の `const CACHE = "アプリ名-…"` を新しい版にする

そのため、ファイルの中の版の番号を手で書きかえる必要はありません。
（リポジトリの Settings → Pages → Source は「GitHub Actions」にしておく）

## 確認用の道具（dev/）

- `dev/preview/` … ログインせずに、架空のサンプルデータでエンタメ管理の全画面を撮る・操作を試す（本番のデータにはつながらない）。使い方は `dev/preview/README.md`
- `dev/tools/` … 見た目のファイルの掃除や、撮った画面の見比べに使う小さな道具
