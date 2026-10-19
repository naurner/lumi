(() => {
  const L = window.LUMI;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const plural = (n, one, few, many) =>
    n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many;
  const money = (n) => Math.round(n).toLocaleString("ru-RU") + " " + L.currency;

  // ---------- Заглушки вместо фото ----------
  const person = (x, y, s) =>
    `<circle cx="${x}" cy="${y}" r="${7 * s}"/><path d="M${x - 13 * s} ${y + 26 * s}c0-10 6-16 ${13 * s}-16s${13 * s} 6 ${13 * s} 16"/>`;
  const art = {
    portrait: `<svg viewBox="0 0 100 100">${person(50, 40, 2.2)}</svg>`,
    group: `<svg viewBox="0 0 160 100">${[24, 52, 80, 108, 136].map((x) => person(x, 34, 1)).join("")}${[38, 66, 94, 122].map((x) => person(x, 62, 1)).join("")}</svg>`,
    spread: `<svg viewBox="0 0 160 100"><rect x="8" y="12" width="70" height="76" rx="2"/><rect x="82" y="12" width="70" height="76" rx="2"/>${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${14 + c * 21}" y="${18 + r * 23}" width="17" height="19" rx="1"/>`).join("")).join("")}<rect x="88" y="18" width="58" height="44" rx="1"/><path d="M88 70h40M88 78h26"/></svg>`,
    cover: `<svg viewBox="0 0 100 100"><rect x="18" y="10" width="64" height="80" rx="3"/><path d="M24 10v80"/><rect x="34" y="26" width="38" height="30" rx="1"/><path d="M38 66h30M44 74h18"/></svg>`,
    scene: `<svg viewBox="0 0 160 100"><path d="M8 82l38-44 22 24 28-36 56 56z"/><circle cx="122" cy="26" r="9"/></svg>`,
    texture: `<svg viewBox="0 0 160 100">${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${12 + i * 10}q40 -6 80 0t80 0"/>`).join("")}</svg>`,
  };
  function photo(item, kind, extraClass = "") {
    const label = item.label || item.name || "";
    if (item.img) {
      return `<div class="ph ph--img ${extraClass}"><img src="${esc(item.img)}" alt="${esc(label)}" loading="lazy"></div>`;
    }
    return `<div class="ph ph--${kind} ${extraClass}" role="img" aria-label="${esc(label)}">${art[kind] || art.portrait}<span>${esc(label)}</span></div>`;
  }

  // ---------- Главный экран ----------
  $("heroAlbum").innerHTML = L.hero && L.hero.img
    ? `<img class="hero__img" src="${esc(L.hero.img)}" alt="${esc(L.hero.label)}" width="1800" height="1200" fetchpriority="high">`
    : `
    <div class="album">
      <div class="album__page album__page--l">${photo({ label: "Портрет выпускника" }, "portrait")}<p>Алина<br><small>11 «А», 2026</small></p></div>
      <div class="album__page album__page--r">${photo({ label: "Класс с учителем" }, "group")}${photo({ label: "Разворот" }, "spread")}</div>
    </div>`;
  $("advantages").innerHTML = L.advantages.map((a) => `<li><strong>${esc(a.title)}</strong><span>${esc(a.text)}</span></li>`).join("");

  // ---------- Каталог: галерея альбомов ----------
  $("albumGrid").innerHTML = L.albums
    .map((a, i) => `<button class="zoom" data-i="${i}">${photo(a, a.kind)}</button>`)
    .join("");
  $("albumGrid").addEventListener("click", (e) => {
    const b = e.target.closest(".zoom");
    if (!b) return;
    const a = L.albums[b.dataset.i];
    openLightbox(a, a.kind, a.label);
  });

  // ---------- Пакеты съёмок ----------
  $("packageList").innerHTML = L.packages
    .map(
      (p) => `<article class="pkg${p.featured ? " pkg--featured" : ""}">
        <h3>${esc(p.name)}</h3>
        <p class="pkg__price">${money(p.perStudent)} <small>с человека</small></p>
        <ul>${p.services.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
        <a class="btn${p.featured ? "" : " btn--ghost"}" href="#request" data-pick="${p.id}">Выбрать «${esc(p.name)}»</a>
      </article>`
    )
    .join("");

  // ---------- Калькулятор «Свой пакет» ----------
  // Цены и правила — в calc.js (CONFIG и calcPrice), здесь только форма.
  const FLAGS = ["transfer", "school", "studio", "issyk", "ribbons", "heli"];
  const locInputs = [...document.querySelectorAll("#calc input.loc")];
  const outdoorPlaces = () =>
    [...document.querySelectorAll("#calc input[name=outdoorPlace]:checked")].map((el) => el.value);
  $("issyk-from").textContent = CONFIG.issykFrom;
  document.querySelectorAll(".loc-max").forEach((el) => (el.textContent = CONFIG.maxLocations));

  let touchedN = false;
  let hadLocation = false;
  let lastEstimate = "";
  let lastN = null;

  function readN() {
    const raw = $("N").value.trim();
    return /^\d+$/.test(raw) && Number(raw) >= 1 ? Number(raw) : null;
  }

  function calc() {
    const slider = $("R");
    const R = Number(slider.value);
    $("R-value").textContent = R;
    slider.style.setProperty("--fill", ((R - slider.min) / (slider.max - slider.min)) * 100 + "%");

    // Иссык-Куль — только от CONFIG.issykFrom разворотов.
    const issykAvailable = R >= CONFIG.issykFrom;
    $("issyk").disabled = !issykAvailable;
    if (!issykAvailable) $("issyk").checked = false;

    // Не больше CONFIG.maxLocations локаций: остальные блокируются.
    const limitReached = locInputs.filter((el) => el.checked).length >= CONFIG.maxLocations;
    locInputs.forEach((el) => (el.disabled = limitReached && !el.checked));

    // Трансфер — только к студии или выездной локации; при первой локации включается сам.
    const transferAvailable = $("studio").checked || outdoorPlaces().length > 0 || $("heli").checked;
    $("transfer").disabled = !transferAvailable;
    if (!transferAvailable) $("transfer").checked = false;
    else if (!hadLocation) $("transfer").checked = true;
    hadLocation = transferAvailable;

    const N = readN();
    const showError = N === null && touchedN;
    $("N-stepper").classList.toggle("invalid", showError);
    $("N-minus").disabled = N !== null && N <= 1;
    $("N-error").hidden = !showError;
    $("calcPlaceholder").hidden = N !== null;
    $("calcResult").hidden = N === null;
    lastN = N;
    if (N === null) {
      lastEstimate = "";
      return;
    }

    const answers = { N, R, outdoor: outdoorPlaces().length };
    FLAGS.forEach((k) => (answers[k] = $(k).checked));
    const price = calcPrice(answers);
    $("perPerson").textContent = money(price.perPerson);

    const picked = [
      $("school").checked && "съёмка в школе",
      $("ribbons").checked && "ленты",
      $("transfer").checked && "трансфер",
      $("studio").checked && "студия",
      ...outdoorPlaces(),
      $("heli").checked && "вертолёт",
      $("issyk").checked && "Иссык-Куль",
    ].filter(Boolean);
    lastEstimate = `${N} чел., ${R} ${plural(R, "разворот", "разворота", "разворотов")}${picked.length ? ", " + picked.join(", ") : ""} — ${money(price.perPerson)} с человека`;
  }

  // −/+: с пустого поля начинаем с типичного размера класса.
  const N_START = 20;
  function stepN(delta) {
    const N = readN();
    $("N").value = N === null ? N_START : Math.max(1, N + delta);
    touchedN = true;
    calc();
  }
  $("N-minus").addEventListener("click", () => stepN(-1));
  $("N-plus").addEventListener("click", () => stepN(1));
  $("N").addEventListener("input", () => (touchedN = true));
  $("calc").addEventListener("input", calc);
  $("calc").addEventListener("change", calc);
  $("calc").addEventListener("submit", (e) => e.preventDefault());
  calc();

  $("calcToRequest").addEventListener("click", (e) => {
    if (lastN === null) {
      // Без количества человек цены нет — просим заполнить, а не уводим к форме.
      e.preventDefault();
      touchedN = true;
      calc();
      $("N").focus();
      return;
    }
    const f = $("requestForm");
    f.type.value = "custom";
    f.count.value = lastN;
    $("formEstimate").value = lastEstimate;
    $("formEstimateLine").textContent = "Ваш расчёт: " + lastEstimate;
    $("formEstimateLine").hidden = false;
    focusForm();
  });

  // «Выбрать пакет» — подставляет пакет в заявку.
  document.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-pick]");
    if (!pick) return;
    $("requestForm").type.value = pick.dataset.pick;
    $("formEstimate").value = "";
    $("formEstimateLine").hidden = true;
    focusForm();
  });

  // ---------- Работы ----------
  $("projects").innerHTML = L.projects
    .map(
      (p, pi) => `<article class="project">
        <header><h3>${esc(p.title)}</h3><p class="muted">${esc(p.meta)}</p></header>
        <div class="project__grid">${p.photos
          .map((ph, i) => `<button class="zoom" data-p="${pi}" data-i="${i}">${photo(ph, ph.kind)}</button>`)
          .join("")}</div>
      </article>`
    )
    .join("");
  $("projects").addEventListener("click", (e) => {
    const b = e.target.closest(".zoom");
    if (!b) return;
    const p = L.projects[b.dataset.p];
    const ph = p.photos[b.dataset.i];
    openLightbox(ph, ph.kind, `${p.title} — ${ph.label}`);
  });

  // До / после
  const pairs = (Array.isArray(L.beforeAfter) ? L.beforeAfter : [L.beforeAfter]).filter((p) => p.before && p.after);
  const setBa = (v) => $("beforeAfter").style.setProperty("--pos", v + "%");
  function showPair(i) {
    const p = pairs[i];
    $("baBefore").innerHTML = `<img src="${esc(p.before)}" alt="${esc(p.label)} — до обработки">`;
    $("baAfter").innerHTML = `<img src="${esc(p.after)}" alt="${esc(p.label)} — после обработки">`;
    $("beforeAfter").style.setProperty("--ar", `${p.w || 4} / ${p.h || 3}`);
    $("beforeAfter").style.setProperty("--arn", (p.w || 4) / (p.h || 3));
    $("baRange").value = 50;
    setBa(50);
    document.querySelectorAll("#baPairs button").forEach((b, j) => b.setAttribute("aria-pressed", j === i));
  }
  $("baRange").addEventListener("input", (e) => setBa(e.target.value));
  if (pairs.length > 1) {
    $("baPairs").innerHTML = pairs.map((p, i) => `<button type="button" data-i="${i}">${esc(p.label)}</button>`).join("");
    $("baPairs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) showPair(+b.dataset.i); });
  }
  if (pairs.length) showPair(0);
  // Пустые блоки не показываем: заглушка на живом сайте хуже, чем её отсутствие.
  const hasBa = pairs.length > 0;
  const hasVideo = L.videos.some((v) => v.video);
  $("baBlock").hidden = !hasBa;
  $("videoBlock").hidden = !hasVideo;
  $("worksExtra").hidden = !hasBa && !hasVideo;
  $("worksExtra").classList.toggle("split--single", hasBa !== hasVideo);

  // Видео
  const ytId = (url) => (url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/) || [])[1];
  const videoCard = (v) => {
    const id = v.video && ytId(v.video);
    return `<figure class="video">${
      id
        ? `<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${esc(v.title)}" loading="lazy" allowfullscreen></iframe>`
        : `<div class="video__ph" role="img" aria-label="${esc(v.label || v.title)}"><span class="play" aria-hidden="true"></span></div>`
    }<figcaption>${esc(v.title)}</figcaption></figure>`;
  };
  $("videos").innerHTML = L.videos.filter((v) => v.video).map(videoCard).join("");

  // ---------- Процесс, качество, локации, команда ----------
  $("steps").innerHTML = L.steps.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join("");

  $("qualityList").innerHTML = L.quality
    .map((q) => `<article class="q">${photo(q, q.kind || "texture")}<div><h3>${esc(q.title)}</h3><p>${esc(q.text)}</p></div></article>`)
    .join("");

  $("locationList").innerHTML = L.locations
    .map((l) => `<article class="loc">${photo(l, "scene")}<h3>${esc(l.name)}</h3><p>${esc(l.text)}</p></article>`)
    .join("");

  $("teamList").innerHTML = L.team
    .map((m) => `<article class="member">${photo({ img: m.img, label: m.name }, "portrait")}<h3>${esc(m.name)}</h3><p>${esc(m.role)}</p></article>`)
    .join("");

  // ---------- Доверие ----------
  $("reviewList").innerHTML = L.reviews
    .map((r) => `<blockquote class="review"><p>${esc(r.text)}</p><footer><strong>${esc(r.who)}</strong>, ${esc(r.role)}</footer></blockquote>`)
    .join("");
  if (!L.reviews.length) {
    $("reviewList").hidden = true;
    $("reviewsTitle").textContent = "Нам доверяют";
  }
  const videoReviews = (L.videoReviews || []).filter((v) => v.video);
  if (videoReviews.length) {
    $("videoReviews").innerHTML = videoReviews.map(videoCard).join("");
    $("videoReviews").hidden = false;
  }
  $("schoolList").innerHTML = L.schools.map((s) => `<li>${esc(s)}</li>`).join("");
  $("guaranteeList").innerHTML = L.guarantees.map((g) => `<li>${esc(g)}</li>`).join("");
  $("faqList").innerHTML = L.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");

  // ---------- Заявка ----------
  const K = L.contacts;
  const wa = (text) => `https://wa.me/${K.whatsapp}${text ? "?text=" + encodeURIComponent(text) : ""}`;
  $("waLink").href = wa("Здравствуйте! Хочу узнать про школьный альбом.");
  $("igLink").href = `https://instagram.com/${K.instagram}`;
  $("footerCity").textContent = `Школьные альбомы и виньетки под ключ. ${K.city}`;
  $("footerPhone").href = `tel:+${K.whatsapp}`;
  $("footerPhone").textContent = K.phoneDisplay;
  $("footerWa").href = wa();
  $("footerIg").href = `https://instagram.com/${K.instagram}`;
  $("footerIg").textContent = `@${K.instagram}`;
  $("footerEmail").href = `mailto:${K.email}`;
  $("footerEmail").textContent = K.email;
  $("footerCopy").textContent = `© ${new Date().getFullYear()} Lumi Vinetka`;

  const packageName = (id) => {
    if (id === "custom") return "Свой пакет";
    const p = L.packages.find((x) => x.id === id);
    return p ? `«${p.name}»` : "пока не знаю";
  };
  $("formType").innerHTML =
    L.packages.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("") +
    `<option value="custom">Свой пакет из калькулятора</option><option value="">Пока не знаю</option>`;

  // Проверка полей: ошибка — под своим полем. До первой отправки не ругаемся,
  // после — обновляем подсказку, как только человек исправляет поле.
  const rules = {
    name: (v) => (v ? "" : "Как к вам обращаться?"),
    phone: (v) => (v.replace(/\D/g, "").length >= 9 ? "" : "Нужен номер, по которому можно перезвонить"),
    school: (v) => (v ? "" : "Укажите школу"),
    grade: (v) => (v ? "" : "Укажите класс"),
  };
  let submitted = false;
  function checkField(input) {
    const msg = rules[input.name](input.value.trim());
    $(`f-${input.name}-err`).textContent = msg;
    if (msg) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
    return !msg;
  }
  Object.keys(rules).forEach((name) => {
    const input = $("requestForm")[name];
    input.addEventListener("input", () => submitted && checkField(input));
    input.addEventListener("blur", () => input.value.trim() && checkField(input));
  });

  $("requestForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    submitted = true;
    const invalid = Object.keys(rules).map((name) => f[name]).filter((input) => !checkField(input));
    if (invalid.length) {
      invalid[0].focus();
      return;
    }
    $("formError").textContent = "";
    const payload = {
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      school: f.school.value.trim(),
      grade: f.grade.value.trim(),
      count: f.count.value,
      type: packageName(f.type.value),
      estimate: f.estimate.value,
      website: f.website.value,
    };
    const btn = $("formSubmit");
    btn.disabled = true;
    btn.textContent = "Отправляем…";
    try {
      if (!L.crmEndpoint) throw new Error("crmEndpoint не задан в content.js");
      // text/plain — чтобы браузер не делал CORS-preflight, который Apps Script не поддерживает.
      const res = await fetch(L.crmEndpoint, { method: "POST", body: JSON.stringify(payload) });
      const out = await res.json();
      if (!out.ok) throw new Error(out.error || "CRM отклонила заявку");
      f.hidden = true;
      $("formDone").hidden = false;
      $("formDone").focus();
    } catch (err) {
      console.error(err);
      $("formError").innerHTML =
        `Не получилось отправить заявку. Попробуйте ещё раз или <a href="${wa("Здравствуйте! Хочу заказать школьный альбом: " + payload.school + ", " + payload.grade)}" target="_blank" rel="noopener">напишите нам в WhatsApp</a>.`;
    } finally {
      btn.disabled = false;
      btn.textContent = "Отправить заявку";
    }
  });

  // Альбомы вживую — те же фото крупно
  document.querySelectorAll("[data-live]").forEach((b) =>
    b.addEventListener("click", () => {
      const label = b.getAttribute("aria-label");
      openLightbox({ img: b.dataset.live, label }, "group", label);
    })
  );

  // ---------- Лайтбокс ----------
  const lb = $("lightbox");
  function openLightbox(item, kind, caption) {
    $("lightboxImg").innerHTML = photo(item, kind);
    $("lightboxCaption").textContent = caption;
    lb.showModal();
  }
  $("lightboxClose").addEventListener("click", () => lb.close());
  lb.addEventListener("click", (e) => e.target === lb && lb.close());

  // ---------- Мобильное меню ----------
  const burger = $("burger");
  burger.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", open);
    document.body.classList.toggle("menu-open", open);
  });
  const closeMenu = () => {
    burger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  };
  $("navLinks").addEventListener("click", (e) => e.target.closest("a") && closeMenu());
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

  // ---------- Текущий раздел в меню ----------
  const navLinks = [...document.querySelectorAll("#navLinks a")];
  const spied = navLinks.map((a) => document.querySelector(a.hash)).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          navLinks.forEach((a) => a.toggleAttribute("aria-current", a.hash === "#" + en.target.id));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    spied.forEach((s) => spy.observe(s));
  }

  // После перехода к заявке курсор сразу в первом пустом поле — можно печатать.
  function focusForm() {
    const f = $("requestForm");
    const first = ["name", "phone", "school", "grade"].map((n) => f[n]).find((i) => !i.value.trim()) || f.name;
    setTimeout(() => first.focus({ preventScroll: true }), 400);
  }
})();
