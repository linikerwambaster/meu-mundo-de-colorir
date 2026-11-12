// Pixel da Meta e API de Conversões da página de vendas, com aviso de cookies (LGPD).
// Nada é enviado para a Meta e nenhum cookie de anúncio é criado antes da pessoa clicar em "Aceitar".
// Aqui saem PageView, ViewContent e AddToCart (clique no botão de compra).
// InitiateCheckout e Purchase saem da Cakto, no mesmo pixel, para não contar em dobro.
(function () {
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); // prévia: mostra o aviso, não manda nada
  var PIXEL = "2203883916899528";
  var ENDPOINT = "/api/capi";
  var CHAVE = "mmc-cookies"; // "aceito" ou "recusado"
  var PRODUTO = {
    content_name: "Meu Mundo de Colorir",
    content_ids: ["meu-mundo-de-colorir"],
    content_type: "product",
    value: 9.9,
    currency: "BRL"
  };

  // ---------- escolha guardada ----------
  function lerEscolha() {
    try { var v = localStorage.getItem(CHAVE); if (v) return v; } catch (e) {}
    var m = document.cookie.match("(^|;)\\s*" + CHAVE + "=([^;]*)");
    return m ? m[2] : "";
  }
  function gravarEscolha(v) {
    try { localStorage.setItem(CHAVE, v); } catch (e) {}
    document.cookie = CHAVE + "=" + v + ";path=/;max-age=15552000;SameSite=Lax"; // 6 meses
  }

  function cookie(nome) {
    var m = document.cookie.match("(^|;)\\s*" + nome + "=([^;]*)");
    return m ? decodeURIComponent(m[2]) : "";
  }
  function apagarCookie(nome) {
    var partes = location.hostname.split("."), dominios = ["", location.hostname];
    if (partes.length > 1) dominios.push("." + partes.slice(-2).join("."), "." + partes.slice(-3).join("."));
    dominios.forEach(function (d) {
      document.cookie = nome + "=;path=/;max-age=0" + (d ? ";domain=" + d : "");
    });
  }

  // ---------- rastreio (só depois do aceite) ----------
  var ligado = false;
  function uid() {
    return "ev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  }
  function servidor(nome, id, dados) {
    if (LOCAL) return;
    var corpo = JSON.stringify({
      event_name: nome,
      event_id: id,
      event_source_url: location.href,
      fbp: cookie("_fbp"),
      fbc: cookie("_fbc"),
      custom_data: dados || {}
    });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([corpo], { type: "text/plain;charset=UTF-8" }));
      } else {
        fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: corpo, keepalive: true });
      }
    } catch (e) {}
  }
  // O mesmo event_id no navegador e no servidor faz a Meta contar uma vez só
  function enviar(nome, dados, atraso) {
    if (!ligado) return;
    if (LOCAL) { console.log("[prévia] evento", nome); return; }
    var id = uid();
    fbq("track", nome, dados || {}, { eventID: id });
    if (atraso) setTimeout(function () { servidor(nome, id, dados); }, atraso);
    else servidor(nome, id, dados);
  }

  function ligarRastreio() {
    if (ligado) return;
    ligado = true;
    if (!LOCAL) {
      // Guarda o clique do anúncio caso o pixel ainda não tenha criado o cookie
      var fbclid = new URLSearchParams(location.search).get("fbclid");
      if (fbclid && !cookie("_fbc")) {
        document.cookie = "_fbc=fb.1." + Date.now() + "." + fbclid + ";path=/;max-age=7776000;SameSite=Lax";
      }
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      fbq("consent", "grant");
      fbq("init", PIXEL);
    }
    // Espera o cookie do pixel existir antes de mandar o PageView pelo servidor
    enviar("PageView", null, 1500);
    quandoPronto(function () {
      // ViewContent só quando a pessoa chega na oferta
      var oferta = document.getElementById("oferta");
      if (!oferta || !("IntersectionObserver" in window)) return;
      new IntersectionObserver(function (itens, obs) {
        if (itens[0].isIntersecting) {
          obs.disconnect();
          enviar("ViewContent", PRODUTO);
        }
      }, { threshold: 0.3 }).observe(oferta);
    });
  }

  function desligarRastreio() {
    ligado = false;
    if (window.fbq) { try { fbq("consent", "revoke"); } catch (e) {} }
    ["_fbp", "_fbc"].forEach(apagarCookie);
  }

  function quandoPronto(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  // Clique em qualquer botão de compra
  var saindo = false;
  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest('a[href*="pay.cakto.com.br"]');
    if (!link || saindo || !ligado) return;
    enviar("AddToCart", PRODUTO);
    if (LOCAL || e.ctrlKey || e.metaKey || e.shiftKey || link.target === "_blank") return;
    saindo = true;
    e.preventDefault();
    setTimeout(function () { location.href = link.href; }, 220);
  });
  // Se a pessoa voltar do checkout pelo botão do navegador, os botões seguem funcionando
  window.addEventListener("pageshow", function () { saindo = false; });

  // ---------- aviso de cookies ----------
  var aviso = null;
  function estilo() {
    if (document.getElementById("mmc-cookies-css")) return;
    var css = document.createElement("style");
    css.id = "mmc-cookies-css";
    css.textContent =
      ".mmc-aviso{position:fixed;left:10px;right:10px;bottom:10px;z-index:9999;max-width:560px;margin:0 auto;" +
      "background:#121a3a;color:#eef1ff;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:14px 16px;" +
      "box-shadow:0 18px 40px rgba(0,0,0,.45);font-family:'Nunito',system-ui,sans-serif;font-weight:700;font-size:.9rem;line-height:1.4;" +
      "transform:translateY(130%);transition:transform .4s cubic-bezier(.2,.8,.2,1)}" +
      ".mmc-aviso.mostra{transform:none}" +
      ".mmc-aviso-aberto .cta-fixo{display:none!important}" +
      ".mmc-aviso p{margin:0 0 12px}" +
      ".mmc-aviso a{color:#ffc83d;font-weight:800}" +
      ".mmc-aviso .mmc-botoes{display:flex;gap:10px}" +
      ".mmc-aviso button{flex:1;min-height:44px;border-radius:40px;font-family:inherit;font-weight:900;font-size:.98rem;cursor:pointer;border:2px solid #fff}" +
      ".mmc-aviso .mmc-recusar{background:transparent;color:#fff}" +
      ".mmc-aviso .mmc-aceitar{background:#fff;color:#121a3a}" +
      ".mmc-aviso button:focus-visible{outline:3px solid #ffc83d;outline-offset:2px}";
    document.head.appendChild(css);
  }
  // Enquanto o aviso está aberto, o botão fixo de compra some (os dois ficariam no mesmo lugar)
  function marcarAberto(aberto) {
    document.documentElement.classList.toggle("mmc-aviso-aberto", aberto);
  }
  function fecharAviso() {
    if (!aviso) return;
    aviso.classList.remove("mostra");
    marcarAberto(false);
    var a = aviso; aviso = null;
    setTimeout(function () { a.remove(); }, 450);
  }
  function abrirAviso() {
    if (aviso) return;
    estilo();
    aviso = document.createElement("div");
    aviso.className = "mmc-aviso";
    aviso.setAttribute("role", "dialog");
    aviso.setAttribute("aria-label", "Aviso de cookies");
    aviso.innerHTML =
      '<p>🍪 Usamos cookies da Meta para saber se os nossos anúncios funcionam. Você escolhe se aceita. ' +
      '<a href="/privacidade/">Saiba mais</a></p>' +
      '<div class="mmc-botoes"><button type="button" class="mmc-recusar">Recusar</button>' +
      '<button type="button" class="mmc-aceitar">Aceitar</button></div>';
    aviso.querySelector(".mmc-aceitar").addEventListener("click", function () {
      gravarEscolha("aceito"); fecharAviso(); ligarRastreio();
    });
    aviso.querySelector(".mmc-recusar").addEventListener("click", function () {
      gravarEscolha("recusado"); fecharAviso(); desligarRastreio();
    });
    document.body.appendChild(aviso);
    marcarAberto(true);
    setTimeout(function () { if (aviso) aviso.classList.add("mostra"); }, 40);
  }

  // Link "Cookies" no rodapé para mudar a escolha
  document.addEventListener("click", function (e) {
    var l = e.target.closest && e.target.closest("[data-cookies]");
    if (!l) return;
    e.preventDefault();
    abrirAviso();
  });

  var escolha = lerEscolha();
  if (escolha === "aceito") ligarRastreio();
  else if (escolha !== "recusado") quandoPronto(abrirAviso);
})();
