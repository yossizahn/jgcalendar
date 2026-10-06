// Theme and language for the standalone legal pages, matching the app's own logic:
// theme = saved choice or the OS setting; language = #he/#en in the URL, else saved choice, else browser order.
;(function () {
  var root = document.documentElement
  function get(key) {
    try { return localStorage.getItem(key) } catch (e) { return null }
  }

  var theme = get("theme")
  var dark = theme === "dark" || (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches)
  root.classList.toggle("dark", dark)

  function browserLang() {
    var first = (navigator.languages || [navigator.language]).find(function (l) { return /^(en|he|iw)\b/i.test(l) })
    return first && /^(he|iw)\b/i.test(first) ? "he" : "en"
  }
  function pick() {
    if (location.hash === "#he" || location.hash === "#en") return location.hash.slice(1)
    var saved = get("lang")
    return saved === "he" || saved === "en" ? saved : browserLang()
  }
  function apply(lang) {
    root.dataset.lang = lang
    root.lang = lang
    root.dir = lang === "he" ? "rtl" : "ltr"
    var back = document.querySelector(".back")
    if (back) back.textContent = back.getAttribute("data-" + lang)
  }

  apply(pick())
  document.addEventListener("DOMContentLoaded", function () { apply(pick()) })
  window.addEventListener("hashchange", function () { apply(pick()) })
})()
