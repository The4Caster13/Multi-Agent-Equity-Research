/* Equity Labs — progressive enhancement only.
   Every page reads and works with this file absent. */
(function () {
  "use strict";

  /* ------------------------------------------------------------- nav -- */

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  var MOBILE = "(max-width: 860px)";

  function syncNav() {
    if (!toggle || !nav) return;
    if (window.matchMedia(MOBILE).matches) {
      if (toggle.getAttribute("aria-expanded") !== "true") nav.hidden = true;
    } else {
      nav.hidden = false;
      toggle.setAttribute("aria-expanded", "false");
    }
  }

  if (toggle && nav) {
    syncNav();
    window.addEventListener("resize", syncNav);

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.hidden = open;
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      toggle.setAttribute("aria-expanded", "false");
      nav.hidden = true;
      toggle.focus();
    });
  }

  /* ------------------------------------------------------------ year -- */

  var year = String(new Date().getFullYear());
  Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (el) {
    el.textContent = year;
  });

  /* ---------------------------------------------------------- reveal -- */

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll(".reveal");

  if (reduced || !("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(targets, function (el) {
      el.classList.add("is-in");
    });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    Array.prototype.forEach.call(targets, function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + "ms";
      io.observe(el);
    });
  }

  /* ------------------------------------------------- chart hover layer -- */

  Array.prototype.forEach.call(document.querySelectorAll(".chart"), function (svg) {
    var stage = svg.closest(".figure__body");
    var hits = svg.querySelectorAll("[data-tip-key]");
    if (!stage || !hits.length) return;

    var tip = document.createElement("div");
    tip.className = "chart-tip";
    tip.setAttribute("role", "status");
    tip.setAttribute("aria-live", "polite");
    stage.appendChild(tip);

    var bars = svg.querySelectorAll(".bar");
    var crosshair = svg.querySelector(".crosshair");
    var hoverDot = svg.querySelector(".hover-dot");

    // SVG user units -> pixels relative to the stage box
    function toStage(x, y) {
      var ctm = svg.getScreenCTM();
      if (!ctm) return null;
      var pt = svg.createSVGPoint();
      pt.x = x;
      pt.y = y;
      var screen = pt.matrixTransform(ctm);
      var box = stage.getBoundingClientRect();
      return { x: screen.x - box.left, y: screen.y - box.top };
    }

    function show(hit) {
      var px = parseFloat(hit.getAttribute("data-px"));
      var py = parseFloat(hit.getAttribute("data-py"));
      var at = toStage(px, py);
      if (!at) return;

      tip.innerHTML = "";
      var key = document.createElement("span");
      key.className = "chart-tip__key";
      key.textContent = hit.getAttribute("data-tip-key");
      var val = document.createElement("span");
      val.className = "chart-tip__val";
      val.textContent = hit.getAttribute("data-tip-val");
      tip.appendChild(key);
      tip.appendChild(val);

      // keep the card inside the stage
      var half = tip.offsetWidth / 2;
      var max = stage.clientWidth - half - 8;
      tip.style.left = Math.max(half + 8, Math.min(at.x, max)) + "px";
      tip.style.top = at.y + "px";
      tip.classList.add("is-visible");

      var mark = hit.getAttribute("data-mark");
      if (mark !== null && bars.length) {
        svg.classList.add("is-hovered");
        Array.prototype.forEach.call(bars, function (bar, i) {
          bar.classList.toggle("is-active", String(i) === mark);
        });
      }

      if (crosshair) {
        crosshair.setAttribute("x1", px);
        crosshair.setAttribute("x2", px);
        crosshair.style.opacity = "1";
      }

      if (hoverDot) {
        hoverDot.setAttribute("cx", px);
        hoverDot.setAttribute("cy", py);
        hoverDot.style.opacity = "1";
      }
    }

    function hide() {
      tip.classList.remove("is-visible");
      svg.classList.remove("is-hovered");
      Array.prototype.forEach.call(bars, function (bar) {
        bar.classList.remove("is-active");
      });
      if (crosshair) crosshair.style.opacity = "0";
      if (hoverDot) hoverDot.style.opacity = "0";
    }

    Array.prototype.forEach.call(hits, function (hit) {
      hit.addEventListener("pointerenter", function () {
        show(hit);
      });
      hit.addEventListener("pointermove", function () {
        if (!tip.classList.contains("is-visible")) show(hit);
      });
    });

    svg.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);
  });
})();
