(function () {
  if (window.__wheelPickerInstalled) return;
  window.__wheelPickerInstalled = true;

  const ITEM_H = 36;
  const VISIBLE = 5;
  const PAD = ((VISIBLE - 1) / 2) * ITEM_H;

  const css = `
    .wp-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.55); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
    .wp-modal { background: #fff; border-radius: 18px; box-shadow: 0 25px 80px rgba(0,0,0,0.25); width: 360px; max-width: calc(100vw - 32px); overflow: hidden; font-family: -apple-system, system-ui, sans-serif; }
    .wp-header { padding: 14px 18px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .wp-title { font-size: 15px; font-weight: 600; color: #0f172a; }
    .wp-btn { border: 0; background: transparent; color: #2563eb; font-size: 15px; font-weight: 500; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
    .wp-btn:hover { background: #eff6ff; }
    .wp-btn-clear { color: #ef4444; }
    .wp-cal { padding: 12px 16px 4px; }
    .wp-cal-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .wp-cal-label { font-weight: 600; font-size: 14px; color: #0f172a; }
    .wp-cal-arrow { width: 28px; height: 28px; border: 0; background: transparent; border-radius: 6px; cursor: pointer; color: #475569; font-size: 18px; }
    .wp-cal-arrow:hover { background: #f1f5f9; }
    .wp-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
    .wp-cal-dow { font-size: 11px; color: #94a3b8; text-align: center; padding: 4px 0; text-transform: uppercase; font-weight: 600; }
    .wp-cal-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border: 0; background: transparent; border-radius: 8px; cursor: pointer; font-size: 13px; color: #1e293b; }
    .wp-cal-day:hover { background: #f1f5f9; }
    .wp-cal-day.other { color: #cbd5e1; }
    .wp-cal-day.today { font-weight: 700; color: #2563eb; }
    .wp-cal-day.sel { background: #2563eb; color: #fff; font-weight: 600; }
    .wp-cal-day.sel:hover { background: #1d4ed8; }
    .wp-time { display: flex; justify-content: center; align-items: center; gap: 4px; padding: 8px 0 16px; border-top: 1px solid #f1f5f9; margin-top: 8px; }
    .wp-wheel { position: relative; height: ${ITEM_H * VISIBLE}px; width: 60px; overflow-y: scroll; scroll-snap-type: y mandatory; scrollbar-width: none; -ms-overflow-style: none; mask-image: linear-gradient(to bottom, transparent 0%, #000 25%, #000 75%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 25%, #000 75%, transparent 100%); }
    .wp-wheel::-webkit-scrollbar { display: none; }
    .wp-wheel-inner { padding: ${PAD}px 0; }
    .wp-wheel-item { height: ${ITEM_H}px; display: flex; align-items: center; justify-content: center; scroll-snap-align: center; font-size: 22px; font-weight: 500; color: #475569; font-variant-numeric: tabular-nums; user-select: none; cursor: pointer; transition: color 0.15s, transform 0.15s; }
    .wp-wheel-item.active { color: #0f172a; font-weight: 600; transform: scale(1.05); }
    .wp-wheel-sep { font-size: 22px; font-weight: 600; color: #0f172a; padding-bottom: 4px; }
    .wp-wheel-mark { position: absolute; left: 6px; right: 6px; top: 50%; transform: translateY(-50%); height: ${ITEM_H}px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; pointer-events: none; border-radius: 8px; background: rgba(37,99,235,0.04); }
    .wp-time-wrap { position: relative; display: flex; align-items: center; gap: 4px; }
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const DOW = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

  function pad(n) { return String(n).padStart(2, "0"); }
  function fmtISO(d, h, m) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}`; }

  function parseValue(v) {
    if (!v) {
      const now = new Date();
      now.setMinutes(Math.floor(now.getMinutes() / 5) * 5);
      return { date: new Date(now.getFullYear(), now.getMonth(), now.getDate()), h: now.getHours(), m: now.getMinutes() };
    }
    const [datePart, timePart] = v.split("T");
    const [y, mo, d] = datePart.split("-").map(Number);
    const [h, m] = (timePart || "10:00").split(":").map(Number);
    return { date: new Date(y, mo - 1, d), h: h || 0, m: m || 0 };
  }

  function setNativeValue(input, value) {
    const proto = Object.getPrototypeOf(input);
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function buildCalendar(viewDate, selected, onPick) {
    const cal = document.createElement("div");
    cal.className = "wp-cal";

    const nav = document.createElement("div");
    nav.className = "wp-cal-nav";
    const prev = document.createElement("button");
    prev.className = "wp-cal-arrow";
    prev.textContent = "‹";
    prev.type = "button";
    const next = document.createElement("button");
    next.className = "wp-cal-arrow";
    next.textContent = "›";
    next.type = "button";
    const label = document.createElement("div");
    label.className = "wp-cal-label";
    label.textContent = `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
    nav.appendChild(prev);
    nav.appendChild(label);
    nav.appendChild(next);
    cal.appendChild(nav);

    const grid = document.createElement("div");
    grid.className = "wp-cal-grid";
    DOW.forEach((d) => {
      const c = document.createElement("div");
      c.className = "wp-cal-dow";
      c.textContent = d;
      grid.appendChild(c);
    });

    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    let startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const prevMonthDays = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = startOffset; i > 0; i--) {
      const day = prevMonthDays - i + 1;
      const btn = document.createElement("button");
      btn.className = "wp-cal-day other";
      btn.textContent = day;
      btn.type = "button";
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, day);
      btn.onclick = () => onPick(date);
      grid.appendChild(btn);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
      const btn = document.createElement("button");
      btn.className = "wp-cal-day";
      btn.textContent = d;
      btn.type = "button";
      if (date.getTime() === today.getTime()) btn.classList.add("today");
      if (selected && date.getFullYear() === selected.getFullYear() && date.getMonth() === selected.getMonth() && date.getDate() === selected.getDate()) btn.classList.add("sel");
      btn.onclick = () => onPick(date);
      grid.appendChild(btn);
    }
    const totalCells = startOffset + daysInMonth;
    const trailing = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= trailing; i++) {
      const btn = document.createElement("button");
      btn.className = "wp-cal-day other";
      btn.textContent = i;
      btn.type = "button";
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, i);
      btn.onclick = () => onPick(date);
      grid.appendChild(btn);
    }
    cal.appendChild(grid);

    prev.onclick = () => onPick(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1), true);
    next.onclick = () => onPick(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1), true);

    return cal;
  }

  function buildWheel(values, initialIdx, onSelect) {
    const wheel = document.createElement("div");
    wheel.className = "wp-wheel";
    const inner = document.createElement("div");
    inner.className = "wp-wheel-inner";
    values.forEach((v, i) => {
      const item = document.createElement("div");
      item.className = "wp-wheel-item";
      item.textContent = v;
      item.dataset.idx = i;
      inner.appendChild(item);
    });
    wheel.appendChild(inner);

    function markActive() {
      const idx = Math.round(wheel.scrollTop / ITEM_H);
      [...inner.children].forEach((c, i) => c.classList.toggle("active", i === idx));
      return idx;
    }

    let scrollTimer;
    wheel.addEventListener("scroll", () => {
      markActive();
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const idx = markActive();
        const target = idx * ITEM_H;
        if (Math.abs(wheel.scrollTop - target) > 0.5) wheel.scrollTo({ top: target, behavior: "smooth" });
        onSelect(idx);
      }, 120);
    });

    [...inner.children].forEach((item) => {
      item.addEventListener("click", () => {
        const i = Number(item.dataset.idx);
        wheel.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
      });
    });

    requestAnimationFrame(() => {
      wheel.scrollTop = initialIdx * ITEM_H;
      markActive();
    });

    return wheel;
  }

  function openPicker(input) {
    const { date: initDate, h: initH, m: initM } = parseValue(input.value);
    const state = { date: initDate, h: initH, m: initM, view: new Date(initDate.getFullYear(), initDate.getMonth(), 1) };

    const overlay = document.createElement("div");
    overlay.className = "wp-overlay";
    const modal = document.createElement("div");
    modal.className = "wp-modal";

    const header = document.createElement("div");
    header.className = "wp-header";
    const clearBtn = document.createElement("button");
    clearBtn.className = "wp-btn wp-btn-clear";
    clearBtn.textContent = "Очистить";
    clearBtn.type = "button";
    const title = document.createElement("div");
    title.className = "wp-title";
    title.textContent = "Дата и время";
    const okBtn = document.createElement("button");
    okBtn.className = "wp-btn";
    okBtn.textContent = "Готово";
    okBtn.type = "button";
    header.appendChild(clearBtn);
    header.appendChild(title);
    header.appendChild(okBtn);
    modal.appendChild(header);

    const calContainer = document.createElement("div");
    function renderCal() {
      calContainer.innerHTML = "";
      calContainer.appendChild(buildCalendar(state.view, state.date, (d, navigate) => {
        if (navigate) {
          state.view = d;
        } else {
          state.date = d;
          state.view = new Date(d.getFullYear(), d.getMonth(), 1);
        }
        renderCal();
      }));
    }
    renderCal();
    modal.appendChild(calContainer);

    const timeRow = document.createElement("div");
    timeRow.className = "wp-time";
    const timeWrap = document.createElement("div");
    timeWrap.className = "wp-time-wrap";

    const hours = Array.from({ length: 24 }, (_, i) => pad(i));
    const minutes = Array.from({ length: 12 }, (_, i) => pad(i * 5));
    const hWheel = buildWheel(hours, state.h, (i) => { state.h = i; });
    const sep = document.createElement("div");
    sep.className = "wp-wheel-sep";
    sep.textContent = ":";
    const mWheel = buildWheel(minutes, Math.round(state.m / 5) % 12, (i) => { state.m = i * 5; });
    const mark = document.createElement("div");
    mark.className = "wp-wheel-mark";

    timeWrap.appendChild(hWheel);
    timeWrap.appendChild(sep);
    timeWrap.appendChild(mWheel);
    timeWrap.appendChild(mark);
    timeRow.appendChild(timeWrap);
    modal.appendChild(timeRow);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => { overlay.remove(); };
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    clearBtn.onclick = () => { setNativeValue(input, ""); close(); };
    okBtn.onclick = () => { setNativeValue(input, fmtISO(state.date, state.h, state.m)); close(); };
  }

  function isTarget(el) {
    return el && el.tagName === "INPUT" && el.type === "datetime-local";
  }

  document.addEventListener("mousedown", (e) => {
    if (isTarget(e.target)) {
      e.preventDefault();
      e.target.blur();
      openPicker(e.target);
    }
  }, true);

  document.addEventListener("focus", (e) => {
    if (isTarget(e.target)) {
      e.target.blur();
      openPicker(e.target);
    }
  }, true);
})();
