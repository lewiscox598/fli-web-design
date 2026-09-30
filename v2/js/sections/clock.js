// Footer telemetry: the live local time in Newcastle upon Tyne (Europe/London), updated each
// minute. Not shown without JavaScript. No coordinates (no cited source).

export function mountClock() {
  const wrap = document.querySelector("[data-clock-wrap]");
  const time = document.querySelector("[data-clock]");
  if (!wrap || !time) return;
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
  const tick = () => {
    const now = new Date();
    time.textContent = fmt.format(now);
    time.dateTime = now.toISOString();
  };
  tick();
  wrap.hidden = false;
  window.setInterval(tick, 15000);
}
