// Pixel da Meta e API de Conversões da página de vendas.
// Aqui saem PageView, ViewContent e AddToCart (clique no botão de compra).
// InitiateCheckout e Purchase saem da Cakto, no mesmo pixel, para não contar em dobro.
(function () {
  var PIXEL = "2203883916899528";
  var ENDPOINT = "/api/capi";
  var PRODUTO = {
    content_name: "Meu Mundo de Colorir",
    content_ids: ["meu-mundo-de-colorir"],
    content_type: "product",
    value: 19.9,
    currency: "BRL"
  };

  function uid() {
    return "ev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  }

  function cookie(nome) {
    var m = document.cookie.match("(^|;)\\s*" + nome + "=([^;]*)");
    return m ? decodeURIComponent(m[2]) : "";
  }

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

  fbq("init", PIXEL);

  function servidor(nome, id, dados) {
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
    var id = uid();
    fbq("track", nome, dados || {}, { eventID: id });
    if (atraso) setTimeout(function () { servidor(nome, id, dados); }, atraso);
    else servidor(nome, id, dados);
  }

  // Espera o cookie do pixel existir antes de mandar o PageView pelo servidor
  enviar("PageView", null, 1500);

  function quandoPronto(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  // ViewContent só quando a pessoa chega na oferta
  quandoPronto(function () {
    var oferta = document.getElementById("oferta");
    if (!oferta || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (itens, obs) {
      if (itens[0].isIntersecting) {
        obs.disconnect();
        enviar("ViewContent", PRODUTO);
      }
    }, { threshold: 0.3 }).observe(oferta);
  });

  // Clique em qualquer botão de compra
  var saindo = false;
  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest('a[href*="pay.cakto.com.br"]');
    if (!link || saindo) return;
    enviar("AddToCart", PRODUTO);
    if (e.ctrlKey || e.metaKey || e.shiftKey || link.target === "_blank") return;
    saindo = true;
    e.preventDefault();
    setTimeout(function () { location.href = link.href; }, 220);
  });

  // Se a pessoa voltar do checkout pelo botão do navegador, os botões seguem funcionando
  window.addEventListener("pageshow", function () { saindo = false; });
})();
