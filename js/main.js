/* Crystal Auto: частицы hero, табы прайса, мобильное меню,
   появление секций, отправка заявки в VK/MAX. Без зависимостей. */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- появление секций при скролле ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (!reducedMotion && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- мобильное меню ---------- */
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.classList.contains("nav__link")) {
        nav.classList.remove("is-open");
        burger.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- подсветка границы карточек за курсором ---------- */
  if (window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll("[data-spotlight]").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- табы прайса по классу кузова ---------- */
  var tabs = document.querySelectorAll(".price__tab");
  var prices = document.querySelectorAll("[data-price]");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
      var cls = tab.dataset.class;
      prices.forEach(function (el) {
        try {
          var map = JSON.parse(el.dataset.price);
          if (map[cls]) el.textContent = map[cls];
        } catch (err) { /* некорректный data-атрибут не должен ломать страницу */ }
      });
    });
  });

  /* ---------- toast ---------- */
  var toast = document.getElementById("toast");
  var toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 4500);
  }

  /* ---------- форма заявки: текст в буфер + переход в мессенджер ---------- */
  var CHANNELS = {
    vk: "https://vk.me/crystal.auto74",
    max: "https://max.ru/crystal.auto74" // TODO: заменить на реальную ссылку MAX
  };

  var form = document.getElementById("bookingForm");
  if (form) {
    var clickedChannel = "vk";
    form.querySelectorAll("button[type=submit]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        clickedChannel = btn.dataset.channel || "vk";
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = document.getElementById("fName").value.trim();
      var phone = document.getElementById("fPhone").value.trim();
      var car = document.getElementById("fCar").value.trim();
      var service = document.getElementById("fService").value;
      var comment = document.getElementById("fComment").value.trim();

      var ok = true;
      ok = setFieldError("fName", name.length < 2 ? "Укажите имя" : "") && ok;
      var phoneDigits = phone.replace(/\D/g, "");
      ok = setFieldError("fPhone", phoneDigits.length < 10 ? "Укажите телефон в формате +7 900 000-00-00" : "") && ok;
      if (!ok) return;

      var lines = [
        "Здравствуйте! Хочу записаться на химчистку.",
        "Услуга: " + service,
        car ? "Автомобиль: " + car : "",
        "Имя: " + name,
        "Телефон: " + phone,
        comment ? "Комментарий: " + comment : ""
      ].filter(Boolean);
      var text = lines.join("\n");
      var url = CHANNELS[clickedChannel] || CHANNELS.vk;

      copyText(text).then(function (copied) {
        showToast(copied
          ? "Текст заявки скопирован. Вставьте его в открывшийся чат и отправьте."
          : "Открываем чат. Продублируйте, пожалуйста, данные из формы.");
        window.open(url, "_blank", "noopener");
      });
    });
  }

  function setFieldError(id, message) {
    var input = document.getElementById(id);
    if (!input) return true;
    var field = input.closest(".form__field");
    var errorEl = field && field.querySelector(".form__error");
    if (message) {
      if (field) field.classList.add("has-error");
      if (errorEl) errorEl.textContent = message;
      return false;
    }
    if (field) field.classList.remove("has-error");
    return true;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var done = false;
    try { done = document.execCommand("copy"); } catch (err) { done = false; }
    document.body.removeChild(ta);
    return done;
  }

  /* ---------- частицы в hero, как у референса ---------- */
  var canvas = document.getElementById("particles");
  if (canvas && !reducedMotion) {
    var ctx = canvas.getContext("2d");
    var particles = [];
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var running = true;
    var w = 0, h = 0;

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(90, Math.round(w * h / 16000));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.6 + 0.4,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.14,
          a: Math.random() * 0.5 + 0.15
        });
      }
    }

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -4) p.x = w + 4; else if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4; else if (p.y > h + 4) p.y = -4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(122, 175, 255," + p.a + ")";
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
      if (running) requestAnimationFrame(tick);
    });
    requestAnimationFrame(tick);
  }
})();
