/* Crystal Auto: частицы hero, форма записи (класс авто, дата, время,
   ориентировочная цена), слайдеры до/после, модал отправки в VK/MAX.
   Без зависимостей. */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Цены. Держать в синхроне с таблицей в index.html (#price). */
  var PRICES = {
    classes: {
      econom:  { name: "Эконом (малогабаритные авто)",     std: 4000,  prem: 6000 },
      compact: { name: "Компакт (хэтчбек, седан)",         std: 5000,  prem: 7000 },
      business:{ name: "Бизнес (седан, универсал)",        std: 6000,  prem: 8000 },
      suv:     { name: "Кроссовер (паркетник, внедорожник)", std: 7000, prem: 9000 },
      minivan: { name: "Минивэн (7 мест и более)",         std: 8000,  prem: 10000 }
    },
    extras: { seat: 500, sofa: 1500, ceiling: 1000, mats: 500, belts: 300, ac: 1000, ozone: 500, protect: 1000 }
  };
  var CHANNELS = {
    vk: "https://vk.me/crystal.auto74",
    max: "https://max.ru/crystal.auto74" // TODO: заменить на реальную ссылку MAX
  };
  var TIME_SLOTS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00"];
  var DAYS_RU = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  var MONTHS_RU = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

  function fmtRub(n) { return n.toLocaleString("ru-RU") + " ₽"; }

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

  /* ---------- слайдеры до/после ---------- */
  document.querySelectorAll("[data-ba]").forEach(function (stage) {
    var before = stage.querySelector(".ba__before");
    var divider = stage.querySelector(".ba__divider");
    var pos = 55;

    function apply(p) {
      pos = Math.min(96, Math.max(4, p));
      before.style.clipPath = "inset(0 " + (100 - pos) + "% 0 0)";
      divider.style.left = pos + "%";
      stage.setAttribute("aria-valuenow", String(Math.round(pos)));
    }

    function fromClientX(clientX) {
      var r = stage.getBoundingClientRect();
      apply(((clientX - r.left) / r.width) * 100);
    }

    stage.addEventListener("pointerdown", function (e) {
      stage.setPointerCapture(e.pointerId);
      fromClientX(e.clientX);
    });
    stage.addEventListener("pointermove", function (e) {
      if (e.buttons) fromClientX(e.clientX);
    });
    stage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { apply(pos - 5); e.preventDefault(); }
      if (e.key === "ArrowRight") { apply(pos + 5); e.preventDefault(); }
    });
  });

  /* ---------- форма записи ---------- */
  var form = document.getElementById("bookingForm");
  var dateStrip = document.getElementById("dateStrip");
  var slotGrid = document.getElementById("slotGrid");
  var estimateValue = document.getElementById("estimateValue");
  var state = { carClass: "compact", dateIdx: 1, slot: null, dates: [] };

  /* 14 дней вперёд */
  (function buildDates() {
    if (!dateStrip) return;
    var now = new Date();
    for (var i = 0; i < 14; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      state.dates.push(d);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "date-cell" + (i === state.dateIdx ? " is-on" : "") + (d.getDay() % 6 === 0 ? " is-wknd" : "");
      btn.dataset.idx = String(i);
      btn.setAttribute("aria-pressed", String(i === state.dateIdx));
      btn.innerHTML = "<small>" + DAYS_RU[d.getDay()] + "</small><b>" + d.getDate() + "</b>";
      btn.addEventListener("click", function () {
        state.dateIdx = Number(this.dataset.idx);
        dateStrip.querySelectorAll(".date-cell").forEach(function (c) {
          var on = Number(c.dataset.idx) === state.dateIdx;
          c.classList.toggle("is-on", on);
          c.setAttribute("aria-pressed", String(on));
        });
      });
      dateStrip.appendChild(btn);
    }
  })();

  /* слоты времени */
  if (slotGrid) {
    TIME_SLOTS.forEach(function (t, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot";
      btn.dataset.idx = String(i);
      btn.textContent = t;
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", function () {
        state.slot = i;
        slotGrid.querySelectorAll(".slot").forEach(function (s) {
          var on = Number(s.dataset.idx) === i;
          s.classList.toggle("is-on", on);
          s.setAttribute("aria-pressed", String(on));
        });
        slotGrid.closest(".form__field").classList.remove("has-error");
      });
      slotGrid.appendChild(btn);
    });
  }

  /* чипы класса авто */
  var carChips = document.getElementById("carChips");
  function setCarClass(cls) {
    state.carClass = cls;
    if (carChips) {
      carChips.querySelectorAll(".chip").forEach(function (c) {
        var on = c.dataset.class === cls;
        c.classList.toggle("is-on", on);
        c.setAttribute("aria-pressed", String(on));
      });
    }
    updateEstimate();
  }
  if (carChips) {
    carChips.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () { setCarClass(chip.dataset.class); });
    });
  }

  /* клик по классу в таблице цен: подстановка в форму */
  document.querySelectorAll(".ptable__pick").forEach(function (pick) {
    pick.addEventListener("click", function () {
      setCarClass(pick.dataset.class);
      var booking = document.getElementById("booking");
      if (booking) booking.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
      showToast("Класс авто подставлен в форму записи");
    });
  });

  /* ориентировочная стоимость */
  var serviceSelect = document.getElementById("fService");
  function updateEstimate() {
    if (!estimateValue || !serviceSelect) return;
    var svc = serviceSelect.value;
    var cls = PRICES.classes[state.carClass];
    if (svc === "complex-std") estimateValue.textContent = fmtRub(cls.std);
    else if (svc === "complex-prem") estimateValue.textContent = fmtRub(cls.prem);
    else if (PRICES.extras[svc]) estimateValue.textContent = "от " + fmtRub(PRICES.extras[svc]);
    else estimateValue.textContent = "после осмотра";
  }
  if (serviceSelect) serviceSelect.addEventListener("change", updateEstimate);
  updateEstimate();

  /* ---------- модал ---------- */
  var modal = document.getElementById("modal");
  var modalSummary = document.getElementById("modalSummary");
  var lastFocused = null;

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    var first = modal.querySelector(".btn");
    if (first) first.focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }
  if (modal) {
    modal.querySelectorAll("[data-modal-close]").forEach(function (el) {
      el.addEventListener("click", closeModal);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });
  }

  /* ---------- сабмит ---------- */
  var pendingText = "";

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

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = document.getElementById("fName").value.trim();
      var phone = document.getElementById("fPhone").value.trim();
      var comment = document.getElementById("fComment").value.trim();
      var serviceLabel = serviceSelect.options[serviceSelect.selectedIndex].text;
      var cls = PRICES.classes[state.carClass];

      var ok = true;
      ok = setFieldError("fName", name.length < 2 ? "Укажите имя" : "") && ok;
      var phoneDigits = phone.replace(/\D/g, "");
      ok = setFieldError("fPhone", phoneDigits.length < 10 ? "Укажите телефон полностью" : "") && ok;
      if (state.slot === null) {
        slotGrid.closest(".form__field").classList.add("has-error");
        ok = false;
      }
      if (!ok) return;

      var d = state.dates[state.dateIdx];
      var when = d.getDate() + " " + MONTHS_RU[d.getMonth()] + ", " + TIME_SLOTS[state.slot];
      var estimate = estimateValue.textContent;

      pendingText = [
        "Здравствуйте! Хочу записаться на химчистку.",
        "Услуга: " + serviceLabel,
        "Автомобиль: " + cls.name,
        "Дата и время: " + when,
        "Имя: " + name,
        "Телефон: " + phone,
        comment ? "Комментарий: " + comment : ""
      ].filter(Boolean).join("\n");

      modalSummary.innerHTML = "";
      [["Услуга", serviceLabel], ["Автомобиль", cls.name], ["Дата и время", when],
       ["Ориентировочно", estimate], ["Имя", name], ["Телефон", phone]]
        .forEach(function (row) {
          var div = document.createElement("div");
          var dt = document.createElement("dt");
          var dd = document.createElement("dd");
          dt.textContent = row[0];
          dd.textContent = row[1];
          div.appendChild(dt); div.appendChild(dd);
          modalSummary.appendChild(div);
        });

      openModal();
    });
  }

  function sendVia(channel) {
    copyText(pendingText).then(function (copied) {
      showToast(copied
        ? "Текст заявки скопирован. Вставьте его в открывшийся чат и отправьте."
        : "Открываем чат. Продублируйте, пожалуйста, данные из формы.");
      window.open(CHANNELS[channel], "_blank", "noopener");
      closeModal();
    });
  }
  var sendVk = document.getElementById("sendVk");
  var sendMax = document.getElementById("sendMax");
  if (sendVk) sendVk.addEventListener("click", function () { sendVia("vk"); });
  if (sendMax) sendMax.addEventListener("click", function () { sendVia("max"); });

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

    var resize = function () {
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
    };

    var tick = function () {
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
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
      if (running) requestAnimationFrame(tick);
    });
    requestAnimationFrame(tick);
  }
})();
