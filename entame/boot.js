/* ===================== 起動：最初の描画・保存先への接続・オフライン用の控え（全部のファイルを読み込んだあと、最後に動かす） ===================== */
render();
initStore();
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
