/* ===================== ログインの共通処理：4アプリ（エンタメ管理・おかね手帳・FitLife・ウリログ）で同じファイルを使う =====================
  ふつうの <script> で読み込む（window.UAuth）。ログイン画面の見た目は各アプリのまま、処理だけをここにまとめる。
  A は Firebase の auth の関数一式（import した firebase-auth.js）

  UAuth.STANDALONE          … ホーム画面のアイコンから開いているか
  UAuth.IN_LINE             … LINE の中のブラウザで開いているか（Googleログインが使えない）
  UAuth.appUrl()            … このアプリのURL（? や # を除いたもの）
  UAuth.normEmail(s)        … メールアドレスを小文字・前後の空白なしにそろえる
  UAuth.emailOk(s)          … メールアドレスの形になっているか
  UAuth.msg(err, 上書き)     … ログインのエラーを、やさしい日本語にする（アプリごとに文を上書きできる）
  UAuth.google(auth, A)     … Googleでログイン。ポップアップが使えないとき（ホーム画面から開いたときなど）は画面を切り替えてログイン
                               自分で閉じたときは false。それ以外の失敗はエラーを投げる
  UAuth.sendLink(auth, A, email, url, key)   … ログイン用のリンクをメールで送る（送ったアドレスを端末に覚えておく）
  UAuth.finishLink(auth, A, email, link, key) … メールのリンクでログインを終える（覚えたアドレスを消して、URLをもとに戻す）
  UAuth.setPassword(A, user, pw)              … パスワードを作る・変える */
window.UAuth = (() => {
  const STANDALONE = navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
  const IN_LINE = / Line\//i.test(navigator.userAgent);
  const appUrl = () => location.origin + location.pathname;
  const normEmail = s => String(s || "").trim().toLowerCase();
  const emailOk = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const ERR = {
    "auth/invalid-email": "メールアドレスの形がちがうみたい",
    "auth/missing-password": "パスワードを入れてね",
    "auth/weak-password": "パスワードは6文字以上にしてね",
    "auth/email-already-in-use": "このメールアドレスはもう登録されているよ。「ログイン」から入ってね",
    "auth/invalid-credential": "メールアドレスかパスワードがちがうみたい",
    "auth/wrong-password": "メールアドレスかパスワードがちがうみたい",
    "auth/user-not-found": "メールアドレスかパスワードがちがうみたい",
    "auth/too-many-requests": "何度も失敗したので、少し時間をおいてね",
    "auth/network-request-failed": "ネットにつながっていないみたい",
    "auth/operation-not-allowed": "Firebaseで、このログイン方法がまだオンになっていないみたい",
    "auth/unauthorized-domain": "このURLがFirebaseの「承認済みドメイン」に入っていないみたい",
    "auth/unauthorized-continue-uri": "このURLがFirebaseの「承認済みドメイン」に入っていないみたい",
    "auth/invalid-action-code": "このリンクは使えません（期限切れか使用ずみ）。もう一度メールを送ってね",
    "auth/expired-action-code": "リンクの期限が切れています。もう一度メールを送ってね",
    "auth/quota-exceeded": "今日はメールを送れる回数の上限です。明日また試すか、Googleでログインしてね",
    "auth/account-exists-with-different-credential": "このメールアドレスは別の方法で登録ずみです。メールのリンクでログインしてね",
    "auth/requires-recent-login": "安全のため、一度ログアウトして、もう一度ログインしてから設定してね",
  };
  const msg = (e, over) => (over && over[e?.code]) || ERR[e?.code] || `うまくいかなかったよ（${e?.code || e?.message || "不明"}）`;
  async function google(auth, A) {
    const pv = new A.GoogleAuthProvider();
    pv.setCustomParameters({ prompt: "select_account" });
    try {
      await A.signInWithPopup(auth, pv);
      return true;
    } catch (e) {
      if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(e?.code)) {
        await A.signInWithRedirect(auth, pv);
        return true;
      }
      if (["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(e?.code)) return false;
      throw e;
    }
  }
  async function sendLink(auth, A, email, url, key) {
    email = normEmail(email);
    await A.sendSignInLinkToEmail(auth, email, { url: url || appUrl(), handleCodeInApp: true });
    try {
      localStorage.setItem(key, email);
    } catch (_) {}
    return email;
  }
  async function finishLink(auth, A, email, link, key) {
    await A.signInWithEmailLink(auth, normEmail(email), link);
    try {
      localStorage.removeItem(key);
    } catch (_) {}
    if (location.search || location.hash) history.replaceState(null, "", appUrl());
  }
  async function setPassword(A, user, pw) {
    if ((user.providerData || []).some(p => p.providerId === "password")) await A.updatePassword(user, pw);
    else await A.linkWithCredential(user, A.EmailAuthProvider.credential(user.email, pw));
  }
  return { STANDALONE, IN_LINE, appUrl, normEmail, emailOk, msg, google, sendLink, finishLink, setPassword };
})();
