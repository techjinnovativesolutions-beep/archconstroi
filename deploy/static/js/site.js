/* Arch Constroi – script público | Tech J Innovative Solutions */
(function () {
  "use strict";

  /* Tema conforme a hora do dia / estação */
  function tema() {
    var h = new Date().getHours();
    var t = h < 7 ? "noite" : h < 12 ? "manha" : h < 18 ? "dia" : h < 21 ? "tarde" : "noite";
    document.documentElement.setAttribute("data-tema", t);
    var faixa = document.getElementById("clima");
    if (faixa) {
      var mapa = { manha: "linear-gradient(90deg,#ff8c42,#d32027,transparent)",
                   dia: "linear-gradient(90deg,#d32027,#ff3b41,transparent)",
                   tarde: "linear-gradient(90deg,#ff5533,#d32027,transparent)",
                   noite: "linear-gradient(90deg,#3d4a8c,#d32027,transparent)" };
      faixa.style.background = mapa[t];
      faixa.title = "Ambiente: " + t;
    }
  }
  tema();
  setInterval(tema, 600000);

  /* Menu mobile */
  var b = document.getElementById("burger"), n = document.getElementById("nav");
  if (b && n) b.addEventListener("click", function () { n.classList.toggle("aberto"); });

  /* Carrossel de fundo (hero) */
  var slides = document.querySelectorAll(".hero-slides figure");
  if (slides.length) {
    var i = 0;
    slides[0].classList.add("on");
    setInterval(function () {
      slides[i].classList.remove("on");
      i = (i + 1) % slides.length;
      slides[i].classList.add("on");
    }, 5200);
  }

  /* Lightbox da galeria */
  var lb = document.getElementById("lb");
  if (lb) {
    var img = lb.querySelector("img");
    document.querySelectorAll(".galeria figure").forEach(function (f) {
      f.addEventListener("click", function () {
        img.src = f.querySelector("img").src;
        lb.classList.add("on");
      });
    });
    lb.addEventListener("click", function () { lb.classList.remove("on"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") lb.classList.remove("on");
    });
  }

  /* Revelar ao rolar */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.style.opacity = 1; en.target.style.transform = "none"; }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".card,.dep article,.sec-cab,.galeria figure").forEach(function (el) {
    el.style.opacity = 0;
    el.style.transform = "translateY(22px)";
    el.style.transition = "opacity .7s ease, transform .7s ease";
    io.observe(el);
  });

  /* Contadores */
  document.querySelectorAll("[data-conta]").forEach(function (el) {
    var alvo = parseInt(el.dataset.conta, 10), v = 0;
    var ob = new IntersectionObserver(function (e) {
      if (!e[0].isIntersecting) return;
      ob.disconnect();
      var t = setInterval(function () {
        v += Math.ceil(alvo / 40);
        if (v >= alvo) { v = alvo; clearInterval(t); }
        el.textContent = v + (el.dataset.sufixo || "");
      }, 35);
    });
    ob.observe(el);
  });
})();
