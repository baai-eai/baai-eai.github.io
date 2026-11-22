/* Innata-0 project page: loop, towers, and charts. No dependencies. */
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  // The page is English only (the Chinese version was taken offline on 2026-11-22). The second argument of T()
  // keeps the Chinese labels in place so the version can be restored; isZH() is false unless the document says otherwise.
  const isZH = () => document.documentElement.lang.toLowerCase().startsWith("zh");
  const T = (en, zh) => (isZH() ? zh : en);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const txt = (parent, x, y, s, cls, extra = {}) => {
    const t = el("text", { x, y, class: cls, ...extra }, parent);
    t.textContent = s;
    return t;
  };
  const fmt = (v) => v.toFixed(2);

  /* ───────── tooltip ───────── */
  const tip = document.getElementById("tip");
  const showTip = (html, x, y) => {
    tip.innerHTML = html;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let left = x + 16, top = y + 16;
    if (left + r.width > innerWidth - 8) left = x - r.width - 16;
    if (top + r.height > innerHeight - 8) top = y - r.height - 16;
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = Math.max(8, top) + "px";
  };
  let keepTip = false;                                // focus can scroll the page; don't let that scroll hide the tip
  const hideTip = () => { tip.hidden = true; };
  const bindTip = (node, html, onEnter, onLeave) => {
    node.setAttribute("tabindex", "0");
    node.addEventListener("pointermove", (e) => { showTip(html(), e.clientX, e.clientY); onEnter && onEnter(); });
    node.addEventListener("pointerleave", () => { hideTip(); onLeave && onLeave(); });
    node.addEventListener("focus", () => {
      keepTip = true; setTimeout(() => { keepTip = false; }, 500);
      const b = node.getBoundingClientRect();
      showTip(html(), b.left + b.width * 0.6, b.top + b.height / 2);
      onEnter && onEnter();
    });
    node.addEventListener("blur", () => { hideTip(); onLeave && onLeave(); });
  };
  addEventListener("scroll", () => { if (!keepTip) hideTip(); }, { passive: true });

  /* ───────── the interaction loop ───────── */
  const STAGES_EN = [
    ["Structure", "Agent", "The agent organizes a long-horizon instruction into causally ordered subtasks, sized to what the model can execute, and keeps the task state current instead of re-reading the instruction at every step."],
    ["Execute", "Innata-0-WAM", "The WAM reads recent observations and robot state together with the complete instruction, the active subtask, and the completed history, then generates a continuous action chunk along with a prediction of the video that should follow."],
    ["Verify", "Agent", "At scheduled checkpoints the agent compares what it observes with the expected effect, judging from evidence over time rather than a single frame. Slow progress or a briefly ambiguous view is not treated as failure."],
    ["Recover", "Agent", "Once an anomaly is verified, the model is suspended and the agent takes over the live scene. It composes bounded tools in an observe, reason, act, verify loop and carries the task through to its end."],
    ["Accumulate", "Agent", "Outcomes are recorded with their evidence. Anomalies and recovery results enter task memory, and the run's trajectory is kept for a later experience-accumulation cycle."],
    ["Evolve", "Agent", "Validated experience is consolidated into versioned verify and recover skills. A revision is adopted only after validation, and the version in use is held fixed during a run."],
  ];
  const STAGES_ZH = [
    ["拆解", "智能体", "智能体借助记忆图将长程指令拆解为子任务，并维护持续更新的任务状态，无需在每一步重读原始指令。"],
    ["执行", "Innata-0-WAM", "WAM 读取近期观测、机器人状态与当前子任务，生成连续的动作块，并同时预测随后应出现的视频。"],
    ["校验", "智能体", "时序监控器依据最近若干个动作块而非单帧画面，核实预期的物理变化是否确实发生。"],
    ["恢复", "智能体", "确认异常后，智能体先进行诊断，再组合受限的感知、几何与运动工具，将现场恢复到 WAM 可继续执行的状态。"],
    ["沉淀", "智能体", "每个结果无论成败，都连同证据写入任务记忆，使后续决策了解哪些方案已经尝试过。"],
    ["进化", "智能体", "经过验证的修复被提升为可复用的监控与恢复技能；在更长周期内，还会转化为 WAM 的后训练数据。"],
  ];
  let STAGES = isZH() ? STAGES_ZH : STAGES_EN;
  const orb = document.getElementById("origin");
  if (orb) {
    /* Innata: what is there from the beginning. The loop is drawn as a ring of light in space:
       a few bright strands braided into a circle, veils of fine silk lines billowing off it above
       and below, a sphere of faint points turning inside it (the WAM), and motes drifting around.
       The six stages ride the ring. The ring burns brightest at the front; picking a stage, or the
       loop advancing by itself, turns the whole ring to bring that stage into the fire, and the ring
       shivers and lets go of a ripple. A mouse leans the view.
       Plain 2D canvas with a hand-rolled perspective projection, no libraries. */
    const cv = orb.querySelector("canvas"), ctx = cv.getContext("2d");
    const core = orb.querySelector(".orb-core"), cap = document.getElementById("loop-cap");
    const who = document.getElementById("loop-who"), title = document.getElementById("loop-title"), body = document.getElementById("loop-body");
    const N = STAGES.length, STEP = Math.PI * 2 / N, TAU = Math.PI * 2, FRONT = Math.PI / 2;
    const BLUE = "85,173,247", SKY = "140,208,255", PALE = "226,243,255", VIOLET = "164,147,255", GREEN = "95,208,142";
    const PAD = 0.15, FOCAL = 4.2, TILT = 0.66, ROLL = -0.13, RS = 0.56;   // RS: the sphere's radius, in ring radii

    // everything is seeded, so every visitor sees the same figure
    let seed = 20261118;
    const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    // veils: each is a sheet of fine lines hung on an arc of the ring, leaning out and up (or down) from it
    const veils = [];
    for (let i = 0; i < 15; i++) {
      const out = i < 12, u = rnd(), el = out ? (rnd() - 0.5) * 2.3 : (rnd() - 0.5) * 0.8;
      veils.push({
        dir: out ? 1 : -1, t0: (i / 15) * TAU + rnd() * 0.5, span: 0.6 + rnd() * 0.9, drift: (0.012 + rnd() * 0.022) * (rnd() < 0.5 ? -1 : 1),
        ext: out ? 0.34 + rnd() * 0.42 : 0.16 + rnd() * 0.14, ce: Math.cos(el), se: Math.sin(el), swirl: (0.3 + rnd() * 0.5) * (rnd() < 0.5 ? -1 : 1),
        k1: 0.7 + rnd() * 1.3, k2: 2 + rnd() * 2.6, k3: 2 + rnd() * 3, w1: 0.2 + rnd() * 0.3, w2: 0.32 + rnd() * 0.4, w3: 0.18 + rnd() * 0.3,
        p1: rnd() * TAU, p2: rnd() * TAU, p3: rnd() * TAU,
        n: out ? 22 : 12, a: (out ? 0.3 : 0.16) + rnd() * 0.2, col: u < 0.52 ? SKY : u < 0.8 ? BLUE : u < 0.92 ? PALE : VIOLET,
      });
    }
    // the sphere inside: points spread evenly over it
    const DOTS = 460, dots = new Float32Array(DOTS * 3);
    for (let i = 0; i < DOTS; i++) {
      const y = 1 - 2 * (i + 0.5) / DOTS, r = Math.sqrt(1 - y * y), th = i * 2.399963;
      dots[i * 3] = r * Math.cos(th); dots[i * 3 + 1] = y; dots[i * 3 + 2] = r * Math.sin(th);
    }
    // motes
    const motes = [];
    for (let i = 0; i < 60; i++) motes.push({ r: 0.3 + rnd() * 1.35, th: rnd() * TAU, y: (rnd() - 0.5) * 1.1, v: (rnd() - 0.5) * 0.06, w: 0.5 + rnd() * 1.4, p: rnd() * TAU, s: rnd() < 0.16 ? 2.4 : 1 + rnd() * 0.8, a: 0.3 + rnd() * 0.6 });

    // stations
    const nodes = STAGES_EN.map(([, owner], i) => {
      const n = document.createElement("button");
      n.type = "button"; n.className = "orb-st" + (owner !== "Agent" ? " is-wam" : "");
      n.innerHTML = `<i>${i + 1}</i><span></span>`;
      n.addEventListener("click", () => { stopAuto(); go(i); });
      orb.appendChild(n);
      return n;
    });
    const labelNodes = nodes.map((n) => n.lastChild);
    const relabel = () => {
      labelNodes.forEach((n, k) => { n.textContent = STAGES[k][0]; });
      nodes.forEach((n, k) => n.setAttribute("aria-label", `${k + 1}. ${STAGES[k][0]}, ${STAGES[k][1]}`));
    };

    // projection: the ring's plane is x–z (z toward the viewer), y is up
    let W = 0, H = 0, S = 0, cx = 0, cy = 0, dpr = 1;
    let tilt = TILT, roll = ROLL, tiltT = TILT, rollT = ROLL, cosE = 0, cr = 1, sr = 0;
    const P = { x: 0, y: 0, p: 1, d: 0 };
    const proj = (x, y, z) => {
      const d = z * cosE + y * tilt, p = FOCAL / (FOCAL - d);
      const sx = x * S * p, sy = (z * tilt - y * cosE) * S * p;
      P.x = cx + sx * cr - sy * sr; P.y = cy + sx * sr + sy * cr; P.p = p; P.d = d;
    };
    const glow = (x, y, r, stops) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      for (let k = 0; k < stops.length; k += 2) g.addColorStop(stops[k], stops[k + 1]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    };
    // a stroke that is dimmer on the far side of the ring (top of the figure) than on the near side
    const depthStroke = (col, a) => {
      const g = ctx.createLinearGradient(cx, cy - S * 0.62, cx, cy + S * 0.86);
      g.addColorStop(0, `rgba(${col},${(a * 0.34).toFixed(3)})`); g.addColorStop(0.5, `rgba(${col},${(a * 0.62).toFixed(3)})`); g.addColorStop(1, `rgba(${col},${a.toFixed(3)})`);
      return g;
    };

    let phi = 0, phiT = 0, time = 3, jig = 0, cur = -1;
    const kicks = [], ripples = [];
    // the ring never quite holds a circle; strand j of the braid wanders a little differently
    const wob = (th, j) => 0.02 * Math.sin(3 * th + time * 0.7 + j * 1.3) + 0.013 * Math.sin(7 * th - time * 1.0 + j * 2.1)
      + 0.0075 * Math.sin(13 * th + time * 1.6 + j * 0.7) + jig * Math.cos(2 * th - 0.5);
    const ringPt = (th, j, amp) => {                 // th is an angle on the ring itself; the ring is turned by phi
      const r = 1 + wob(th, j) * amp, a = th + phi;
      proj(r * Math.cos(a), amp * (0.018 * Math.sin(5 * th + time * 0.9 + j * 1.9) + jig * 0.6 * Math.sin(3 * th)), r * Math.sin(a));
    };
    const strand = (j, amp) => {
      ctx.beginPath();
      for (let i = 0; i <= 144; i++) { ringPt(i / 144 * TAU, j, amp); if (i) ctx.lineTo(P.x, P.y); else ctx.moveTo(P.x, P.y); }
      ctx.closePath(); ctx.stroke();
    };
    // a stretch of the ring burning white; `at` is an angle in space, not on the ring
    const flare = (at, half, strength, col) => {
      let px = 0, py = 0;
      for (let i = 0; i <= 18; i++) {
        const f0 = (i / 18 - 0.5) * 2; ringPt(at + f0 * half - phi, 0, 0.6);
        if (i) {
          const w = Math.pow(Math.cos((f0 - 1 / 18) * Math.PI / 2), 2) * strength * (0.4 + 0.6 * (P.d + 1) / 2);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(P.x, P.y);
          ctx.lineWidth = 9 * P.p; ctx.strokeStyle = `rgba(${col},${(0.16 * w).toFixed(3)})`; ctx.stroke();
          ctx.lineWidth = 2.6 * P.p; ctx.strokeStyle = `rgba(255,255,255,${(0.62 * w).toFixed(3)})`; ctx.stroke();
        }
        px = P.x; py = P.y;
      }
    };

    const draw = () => {
      cosE = Math.sqrt(1 - tilt * tilt); cr = Math.cos(roll); sr = Math.sin(roll);
      ctx.setTransform(dpr, 0, 0, dpr, W * PAD * dpr, H * PAD * dpr);
      ctx.clearRect(-W * PAD, -H * PAD, W * (1 + 2 * PAD), H * (1 + 2 * PAD));
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
      jig = 0;
      for (let k = kicks.length - 1; k >= 0; k--) {
        const t = time - kicks[k];
        if (t > 2.6) kicks.splice(k, 1); else jig += 0.03 * Math.exp(-2.6 * t) * Math.sin(10 * t);
      }
      const hotCol = cur >= 0 && nodes[cur].classList.contains("is-wam") ? GREEN : PALE;

      // the light the ring gives off
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(roll); ctx.scale(1, 0.5 + tilt * 0.5);
      glow(0, 0, S * 1.85, [0, `rgba(${BLUE},.08)`, 0.5, `rgba(${BLUE},.06)`, 0.74, `rgba(${BLUE},.022)`, 1, `rgba(${BLUE},0)`]);
      ctx.restore();

      // the sphere of points inside, turning with the ring; nearer points are brighter
      const yaw = time * 0.11 - phi, cyw = Math.cos(yaw), syw = Math.sin(yaw);
      ctx.fillStyle = `rgb(${SKY})`;
      for (let i = 0; i < DOTS; i++) {
        const x0 = dots[i * 3], y0 = dots[i * 3 + 1], z0 = dots[i * 3 + 2];
        const sw = RS * (1 + 0.035 * Math.sin(4 * y0 + time * 0.8));
        proj((x0 * cyw + z0 * syw) * sw, y0 * sw, (-x0 * syw + z0 * cyw) * sw);
        ctx.globalAlpha = 0.06 + 0.5 * Math.pow((P.d / RS + 1) / 2, 1.7);
        const s = 1.3 * P.p;
        ctx.fillRect(P.x - s / 2, P.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;

      // veils: lines of equal depth across each sheet, so the sheet reads as layered silk
      for (let b = 0; b < veils.length; b++) {
        const v = veils[b], base = v.t0 + time * v.drift;
        ringPt(base + v.span / 2, 0, 0);
        const near = 0.4 + 0.6 * (P.d + 1) / 2;         // sheets on the far side are fainter
        ctx.lineWidth = 0.8 * P.p;
        for (let q = 1; q < v.n; q++) {
          const d = q / (v.n - 1);
          ctx.strokeStyle = `rgba(${v.col},${((v.a * Math.pow(1 - d, 0.85) + 0.02) * near).toFixed(3)})`;
          ctx.beginPath();
          for (let i = 0; i <= 44; i++) {
            const u = i / 44, env = Math.pow(Math.sin(Math.PI * u), 0.75);
            const th = base + u * v.span + d * env * v.swirl * Math.sin(u * v.k3 + time * v.w3 + v.p3);
            const wave = 0.5 + 0.5 * Math.sin(u * v.k1 * TAU + time * v.w1 + v.p1);
            const amt = d * env * v.ext * (0.22 + 0.78 * wave * wave);
            const f1 = d * env * 0.1 * Math.sin(u * v.k2 * TAU - time * v.w2 + v.p2 + d * 3.4), f2 = d * env * 0.08 * Math.sin(u * v.k3 * TAU + time * v.w3 + v.p3 + d * 2.2);
            const r = 1 + wob(th, 0) + v.dir * amt * v.ce + f1, a = th + phi;
            proj(r * Math.cos(a), amt * v.se + f2, r * Math.sin(a));
            if (i) ctx.lineTo(P.x, P.y); else ctx.moveTo(P.x, P.y);
          }
          ctx.stroke();
        }
      }

      // the ring: a soft body of light, then the braid of fine strands on top of it
      [[26, 0.04], [13, 0.075], [6, 0.16]].forEach(([lw, al]) => { ctx.lineWidth = lw; ctx.strokeStyle = depthStroke(BLUE, al); strand(0, 0.6); });
      ctx.lineWidth = 1.1;
      const s1 = depthStroke(SKY, 0.5), s2 = depthStroke(PALE, 0.72);
      for (let s = 0; s < 7; s++) { ctx.strokeStyle = s % 3 ? s1 : s2; strand(s, 1 + s * 0.16); }
      // where it burns: brightest at the front, with two fainter flares wandering round
      flare(time * 0.19 + 1.1, 0.5, 0.42, SKY); flare(-time * 0.13 + 3.6, 0.42, 0.34, SKY);
      flare(FRONT, 0.74, 1, hotCol);
      ringPt(FRONT - phi, 0, 0.6);
      glow(P.x, P.y, S * 0.36, [0, `rgba(${hotCol},.3)`, 0.4, `rgba(${hotCol},.09)`, 1, `rgba(${hotCol},0)`]);

      // ripples: one leaves the ring every time the loop moves on
      for (let k = ripples.length - 1; k >= 0; k--) {
        const age = (time - ripples[k]) / 1.5;
        if (age >= 1) { ripples.splice(k, 1); continue; }
        const rr = 1.03 + (1 - Math.pow(1 - age, 3)) * 0.5;
        ctx.lineWidth = 1.2; ctx.strokeStyle = depthStroke(SKY, 0.45 * (1 - age));
        ctx.beginPath();
        for (let i = 0; i <= 72; i++) { const al = i / 72 * TAU; proj(rr * Math.cos(al), 0, rr * Math.sin(al)); if (i) ctx.lineTo(P.x, P.y); else ctx.moveTo(P.x, P.y); }
        ctx.stroke();
      }
      // motes
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i], th = m.th + time * m.v + phi;
        proj(m.r * Math.cos(th), m.y, m.r * Math.sin(th));
        const a = m.a * (0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(time * m.w + m.p), 2)) * (0.45 + 0.55 * Math.min(1, (P.d + 1.4) / 2.4));
        if (m.s > 2) glow(P.x, P.y, 5 * P.p, [0, `rgba(${PALE},${a.toFixed(3)})`, 0.35, `rgba(${SKY},${(a * 0.35).toFixed(3)})`, 1, `rgba(${SKY},0)`]);
        else { const z = m.s * P.p; ctx.globalAlpha = a; ctx.fillStyle = `rgb(${SKY})`; ctx.fillRect(P.x - z / 2, P.y - z / 2, z, z); ctx.globalAlpha = 1; }
      }
      ctx.globalCompositeOperation = "source-over";

      // the stages ride the ring; their names sit outside it
      for (let k = 0; k < N; k++) {
        const n = nodes[k];
        ringPt(FRONT + k * STEP, 0, 0.6);
        let ux = P.x - cx, uy = P.y - cy; const len = Math.hypot(ux, uy) || 1; ux /= len; uy /= len;
        n.style.transform = `translate(${P.x.toFixed(1)}px,${P.y.toFixed(1)}px)`;
        n.style.setProperty("--p", P.p.toFixed(3));
        n.style.setProperty("--ux", ux.toFixed(3)); n.style.setProperty("--uy", uy.toFixed(3));
        n.style.opacity = (0.5 + 0.5 * (P.d + 1) / 2).toFixed(2);
        n.style.zIndex = String(20 + Math.round(P.d * 10));
      }
    };

    const size = () => {
      const r = orb.getBoundingClientRect(); if (!r.width) return;
      W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * (1 + 2 * PAD) * dpr); cv.height = Math.round(H * (1 + 2 * PAD) * dpr);
      S = Math.min(W * 0.27, H * 0.37); cx = W / 2; cy = H * 0.46;
      core.style.transform = `translate(-50%, -50%) translate(${cx}px, ${cy}px)`;
      draw();
    };

    // animation runs only while the figure is on screen in a visible tab
    let raf = 0, lastT = 0, onScreen = false;
    const frame = (now) => {
      raf = 0;
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; time += dt;
      const e = 1 - Math.exp(-dt * 3.4);
      phi += (phiT - phi) * e; tilt += (tiltT - tilt) * e; roll += (rollT - roll) * e;
      draw();
      if (onScreen && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!reduce && !raf && onScreen && !document.hidden) { lastT = performance.now(); raf = requestAnimationFrame(frame); } };

    let timer = null, manual = false;
    const go = (i) => {
      if (i === cur) return;
      let dlt = (((i - Math.max(cur, 0)) % N) + N) % N; if (dlt > N / 2) dlt -= N;   // the ring turns the shortest way round
      phiT -= dlt * STEP;
      if (cur >= 0 && !reduce) { kicks.push(time); ripples.push(time); }
      cur = i;
      nodes.forEach((n, k) => { n.classList.toggle("on", k === i); n.setAttribute("aria-pressed", String(k === i)); });
      who.textContent = STAGES[i][1]; title.textContent = STAGES[i][0]; body.textContent = STAGES[i][2];
      if (reduce) { phi = phiT; draw(); }
    };
    const pauseAuto = () => { if (timer) { clearInterval(timer); timer = null; } };
    const stopAuto = () => { manual = true; pauseAuto(); cap.setAttribute("aria-live", "polite"); };   // the visitor picked a stage: it stays theirs
    const startAuto = () => { if (!reduce && !timer && !manual) timer = setInterval(() => go((cur + 1) % N), 4200); };

    window.__applyLangLoop = () => {
      STAGES = isZH() ? STAGES_ZH : STAGES_EN; relabel();
      if (cur >= 0) { who.textContent = STAGES[cur][1]; title.textContent = STAGES[cur][0]; body.textContent = STAGES[cur][2]; }
    };
    relabel(); size(); go(0);
    if ("ResizeObserver" in window) new ResizeObserver(size).observe(orb); else addEventListener("resize", size);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) kick(); }, { threshold: 0 }).observe(orb);
      new IntersectionObserver(([e]) => { if (e.isIntersecting) startAuto(); else pauseAuto(); }, { threshold: 0.4 }).observe(orb);
    } else { onScreen = true; kick(); startAuto(); }
    document.addEventListener("visibilitychange", kick);
    // a mouse leans the view
    orb.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = orb.getBoundingClientRect();
      tiltT = TILT - ((e.clientY - r.top) / r.height - 0.5) * 0.3; rollT = ROLL + ((e.clientX - r.left) / r.width - 0.5) * 0.22;
    });
    orb.addEventListener("pointerleave", () => { tiltT = TILT; rollT = ROLL; });
  }

  /* ───────── responsive redraw helper ───────── */
  const charts = [];
  const mount = (id, draw) => {
    const host = document.getElementById(id);
    if (!host) return;
    const run = () => { host.innerHTML = ""; draw(host, host.clientWidth); };
    charts.push(run);
    run();
  };
  let rz;
  addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => charts.forEach((f) => f()), 120); });

  /* ───────── tri-tower architecture ───────── */
  mount("towers-plot", (host, W) => {
    const W0 = Math.max(W - 56, 760);                  // minus card padding; scrolls sideways below 760
    const gap = 30;
    const cols = [
      { k: "u", name: T("Understanding tower", "理解塔"), sub: T("8B, from Qwen3-VL-8B", "8B，基于 Qwen3-VL-8B"), share: 0.36,
        inp: T("Language, images, video", "语言、图像、视频"), out: T("Answers, points, boxes", "回答、点、边界框"), toks: ["U", "U"], tk: ["u", "u"] },
      { k: "v", name: T("World prediction tower", "世界预测塔"), sub: T("8B, from Cosmos 3 Nano", "8B，基于 Cosmos 3 Nano"), share: 0.36,
        inp: T("Observed frames, video latents", "观测帧、视频隐变量"), out: T("Future video", "未来视频"), toks: ["V", "V", "V"], tk: ["v", "v", "v"] },
      { k: "a", name: T("Action and tactile tower", "动作与触觉塔"), sub: T("about 1B, width 1280", "约 1B，宽度 1280"), share: 0.28,
        inp: T("Robot state, actions, touch", "机器人状态、动作、触觉"), out: T("Action chunk, future touch", "动作块、未来触觉"), toks: ["A", "A", "T", "T"], tk: ["a", "a", "t", "t"] },
    ];
    const inner = W0 - gap * (cols.length - 1);
    let x = 0;
    cols.forEach((c) => { c.x = x; c.w = inner * c.share; c.cx = c.x + c.w / 2; x += c.w + gap; });

    const yIn = 0, chipH = 36, yTop = 62, towerH = 318, yOut = yTop + towerH + 40, H = yOut + chipH + 4;
    const svg = el("svg", { viewBox: `0 0 ${W0} ${H}`, width: W0, height: H }, host);
    const defs = el("defs", {}, svg);
    const mk = el("marker", { id: "arr", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
    el("path", { d: "M0,0 L10,5 L0,10 z", fill: "var(--ink-2)" }, mk);
    const arrow = (x1, y1, x2, y2) => el("line", { x1, y1, x2, y2, class: "tw-arrow", "marker-end": "url(#arr)" }, svg);
    const chip = (cx, y, w, label, cls) => {
      el("rect", { x: cx - w / 2, y, width: w, height: chipH, rx: 18, class: cls }, svg);
      txt(svg, cx, y + chipH / 2 + 5, label, "tw-chip-t", { "text-anchor": "middle" });
    };

    // towers
    cols.forEach((c) => {
      el("rect", { x: c.x, y: yTop, width: c.w, height: towerH, rx: 10, class: `tw-tower tw-${c.k}` }, svg);
      txt(svg, c.cx, yTop + 30, c.name, "tw-label", { "text-anchor": "middle" });
      txt(svg, c.cx, yTop + 50, c.sub, "tw-size", { "text-anchor": "middle" });
      // token row
      const n = c.toks.length, tw = 22, tg = 6, x0 = c.cx - (n * tw + (n - 1) * tg) / 2;
      c.toks.forEach((t, i) => {
        el("rect", { x: x0 + i * (tw + tg), y: yTop + 68, width: tw, height: tw, rx: 4, fill: `var(--${c.tk[i]})` }, svg);
        txt(svg, x0 + i * (tw + tg) + tw / 2, yTop + 68 + tw / 2 + 5, t, "tw-tok", { "text-anchor": "middle" });
      });
      // per-tower blocks
      const bw = Math.min(c.w - 36, 230);
      el("rect", { x: c.cx - bw / 2, y: yTop + 108, width: bw, height: 34, rx: 6, class: "tw-block" }, svg);
      txt(svg, c.cx, yTop + 108 + 22, "Norm, QKV", "tw-block-t", { "text-anchor": "middle" });
      el("rect", { x: c.cx - bw / 2, y: yTop + 236, width: bw, height: 34, rx: 6, class: "tw-block" }, svg);
      txt(svg, c.cx, yTop + 236 + 22, "Projection, FFN", "tw-block-t", { "text-anchor": "middle" });
      // internal arrows
      arrow(c.cx, yTop + 92, c.cx, yTop + 106);
      arrow(c.cx, yTop + 142, c.cx, yTop + 160);
      arrow(c.cx, yTop + 218, c.cx, yTop + 234);
      arrow(c.cx, yTop + 270, c.cx, yTop + 296);
      // in / out
      chip(c.cx, yIn, Math.min(c.w, 250), c.inp, "tw-chip");
      arrow(c.cx, yIn + chipH, c.cx, yTop - 2);
      arrow(c.cx, yTop + towerH, c.cx, yOut - 2);
      chip(c.cx, yOut, Math.min(c.w, 250), c.out, "tw-chip tw-chip-out");
          });

    // shared attention band across all towers
    const bandY = yTop + 162, bandH = 54;
    const band = el("g", { class: "tw-band", tabindex: "0", role: "img", "aria-label": T("Joint attention across the three towers, repeated in each of the 36 layers", "三塔共享的联合注意力，在全部 36 层中逐层使用") }, svg);
    el("rect", { x: 0, y: bandY, width: W0, height: bandH, rx: 8, class: "tw-band-r" }, band);
    txt(band, 18, bandY + 24, T("Joint attention across towers", "跨塔联合注意力"), "tw-band-t");
    txt(band, 18, bandY + 42, T("U attends causally; V, A, T see every valid token of the same sample", "U 采用因果注意力；V、A、T 可关注同一样本的全部有效 token"), "tw-band-s");
    txt(band, W0 - 8, bandY + 33, T("× 36 layers", "× 36 层"), "tw-band-n", { "text-anchor": "end" });
    bindTip(band, () => T(`<strong>One shared attention, three towers</strong>Each layer projects its own tokens with tower-specific weights, then all tokens enter one attention. Understanding tokens attend causally within the understanding stream; video, action, and tactile tokens see every valid token of the same sample, so an action is generated together with how it should look and, when tactile data is present, feel.`,
      `<strong>三座塔，共享同一注意力</strong>每一层先以各塔独立的权重对 token 做投影，再将全部 token 送入同一注意力。理解 token 在理解流内采用因果注意力；视频、动作、触觉 token 可关注同一样本的全部有效 token，因此动作在生成时带有对其视觉结果的预测；有触觉数据时，还带有对触觉结果的预测。`));
  });

  /* ───────── understanding benchmarks ───────── */
  const MODELS = ["Gemma-4 E4B", "Qwen3-VL-8B", "Embodied-R1.5 8B", "MiMo-Embodied 7B", "RoboBrain-2.5 8B", "RynnBrain 8B", "Cosmos 3 Nano 8B", "Innata-0 (ours) 8B"];
  const UND = [
    [["General visual understanding", "通用视觉理解"], [
      ["BlinkDepth", 71.77, 83.87, 86.29, 78.23, 83.06, 91.13, 93.55, 89.52],
      ["BlinkSpatial", 77.62, 83.22, 75.52, 76.92, 86.01, 78.32, 81.12, 79.02],
      ["CausalVQA", 43.00, 65.00, 56.00, 54.00, 48.00, 46.00, 63.00, 69.00],
      ["CountBenchQA", 55.65, 90.35, 77.21, 79.47, 89.12, 90.55, 85.01, 92.81],
      ["RealWorldQA", 49.02, 71.11, 69.02, 63.27, 73.20, 70.33, 72.55, 73.86],
      ["RefCOCO", 72.09, 87.79, 75.01, 78.91, 78.23, 83.34, 84.02, 86.14],
      ["V-Star Bench", 23.56, 82.72, 81.68, 48.17, 57.59, 85.34, 86.91, 89.53],
      ["CV-Bench", 52.91, 82.34, 86.95, 77.12, 86.06, 88.15, 87.96, 89.18],
    ]],
    [["Embodied understanding and grounding", "具身理解与定位"], [
      ["3DSRBench", 49.01, 56.60, 56.25, 54.36, 49.48, 56.14, 55.05, 58.38],
      ["EmbSpatial-Bench", 62.75, 77.94, 75.16, 76.07, 77.72, 79.20, 81.59, 84.42],
      ["ERQA", 38.25, 43.00, 42.00, 38.25, 44.75, 27.75, 48.00, 48.50],
      ["MindCube", 38.36, 29.70, 34.48, 44.80, 27.74, 57.63, 40.45, 50.92],
      ["MMSI-Bench", 27.70, 31.40, 29.80, 25.90, 28.90, 39.30, 36.10, 34.70],
      ["MMSI-Video-Bench", 22.33, 29.93, 28.12, 29.66, 30.56, 30.02, 26.40, 30.47],
      ["RoboAfford", 30.78, 51.67, 72.57, 62.02, 77.17, 76.04, 70.67, 73.97],
      ["SPARBench", 26.44, 39.29, 40.33, 16.27, 42.34, 49.47, 55.02, 69.08],
      ["SWITCH", 24.87, 23.27, 21.93, 26.53, 26.33, 21.93, 20.80, 26.47],
      ["VSI-Bench", 31.65, 55.46, 56.15, 46.70, 43.77, 62.98, 55.00, 61.60],
    ]],
  ];
  const rankOf = (vals) => 1 + vals.slice(0, 7).filter((v) => v > vals[7]).length;
  const ord = (n) => (isZH() ? `第${n}` : n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"));

  mount("und-chart", (host, W) => {
    W = Math.max(W - 40, 300);
    const narrow = W < 620;
    const L = narrow ? 128 : 178, Rcol = narrow ? 92 : 150, rowH = 30, grpH = 34;
    const x0 = L, x1 = W - Rcol;
    const lo = 20, hi = 100;
    const X = (v) => x0 + (v - lo) / (hi - lo) * (x1 - x0);
    const rows = UND.reduce((a, g) => a + g[1].length, 0);
    const H = 28 + rows * rowH + UND.length * grpH + 8;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, host);
    for (let v = lo; v <= hi; v += 20) {
      el("line", { class: "ax-g", x1: X(v), x2: X(v), y1: 22, y2: H - 4 }, svg);
      txt(svg, X(v), 14, String(v), "ax-t", { "text-anchor": "middle" });
    }
    if (!narrow) {
      txt(svg, x1 + 18, 14, T("Change", "变化"), "ax-t");
      txt(svg, W - 4, 14, T("Rank of 8", "八模型排名"), "ax-t", { "text-anchor": "end" });
    }
    let y = 28, ri = 0;
    UND.forEach(([gname, list]) => {
      txt(svg, 0, y + 22, T(gname[0], gname[1]), "dm-grp");
      y += grpH;
      [...list].sort((a, b) => (b[8] - b[2]) - (a[8] - a[2])).forEach((r) => {
        const [name, ...vals] = r;
        const init = vals[1], ours = vals[7], d = ours - init, rank = rankOf(vals);
        const cy = y + rowH / 2;
        const g = el("g", { class: "dm-row", style: `--i:${ri++}`, role: "listitem", "aria-label": T(`${name}: ${fmt(init)} to ${fmt(ours)}, rank ${rank} of 8`, `${name}：${fmt(init)} 到 ${fmt(ours)}，八个模型中第 ${rank}`) }, svg);
        el("rect", { class: "dm-band", x: -6, y, width: W + 12, height: rowH, rx: 3 }, g);
        txt(g, 0, cy + 5, name, "lab");
        el("line", { class: "dm-seg" + (d < 0 ? " down" : ""), x1: X(init), x2: X(ours), y1: cy, y2: cy }, g);
        el("circle", { class: "dm-init", cx: X(init), cy, r: 5.5 }, g);
        el("circle", { class: "dm-ours", cx: X(ours), cy, r: 6.5 }, g);
        txt(g, x1 + 18, cy + 5, (d >= 0 ? "+" : "−") + fmt(Math.abs(d)), d >= 0 ? "lab-b" : "lab-2");
        if (!narrow) txt(g, W - 4, cy + 5, ord(rank), rank === 1 ? "lab-b" : "lab-2", { "text-anchor": "end" });
        el("rect", { class: "dm-hit", x: -6, y, width: W + 12, height: rowH }, g);
        bindTip(g, () => {
          const best = Math.max(...vals.slice(0, 7));
          const bestName = MODELS[vals.indexOf(best)];
          return `<strong>${name}</strong>` +
            `<div class="tr"><span>Innata-0</span><span>${fmt(ours)}</span></div>` +
            `<div class="tr"><span>Qwen3-VL-8B</span><span>${fmt(init)}</span></div>` +
            `<div class="tr"><span>${T("Best other: " + bestName, "其余最佳：" + bestName)}</span><span>${fmt(best)}</span></div>` +
            `<div class="tr"><span>${T("Rank", "排名")}</span><span>${T(rank + " of 8", "8 个模型中第 " + rank)}</span></div>`;
        }, () => g.classList.add("hot"), () => g.classList.remove("hot"));
        y += rowH;
      });
    });
    svg.setAttribute("role", "list");
  });

  // full table; redrawn on language change like the charts
  const undTable = () => {
    const host = document.getElementById("und-table");
    if (!host) return;
    const head = (m) => (m.startsWith("Innata-0") ? T("Innata-0 (ours) 8B", "Innata-0（本模型）8B") : m);
    let h = `<table class="rt"><thead><tr><th scope="col">${T("Benchmark", "基准")}</th>${MODELS.map((m) => `<th scope="col" class="n">${head(m)}</th>`).join("")}</tr></thead><tbody>`;
    UND.forEach(([_, list]) => {
      list.forEach(([name, ...v]) => {
        const best = Math.max(...v);
        h += `<tr><th scope="row" style="font-weight:400">${name}</th>${v.map((x, i) => `<td class="n${x === best ? " best" : ""}${i === 7 ? " ours-col" : ""}">${fmt(x)}</td>`).join("")}</tr>`;
      });
    });
    host.innerHTML = h + "</tbody></table>";
  };
  undTable();

  /* ───────── WorldArena EWM ───────── */
  const EWM = [
    { g: ["Run with the official code in this work", "本工作使用官方代码实测"], rows: [
      { n: "Innata-0 (ours)", v: 67.63, ours: true, m: { IQ: 67.49, AQ: 51.02, TA: 62.81, PV: 95.68, IF: 80.80 } },
      { n: "BWM", v: 66.15, m: { IQ: 52.08, AQ: 41.85, TA: 59.27, PV: 94.78, IF: 83.12 } },
      { n: "FlowWAM", v: 65.86, m: { IQ: 48.95, AQ: 40.84, TA: 64.06, PV: 94.74, IF: 83.06 } },
      { n: "ABot-PhysWorld", v: 61.19, m: { IQ: 54.31, AQ: 40.66, TA: 29.35, PV: 93.66, IF: 75.92 } },
    ]},
    { g: ["As reported in the original papers", "原论文报告值"], rows: [
      { n: "Ropedia W0", v: 66.92, rep: true, m: { IQ: 53.57, AQ: 41.04, TA: 63.78, PV: 97.72, IF: 85.50 } },
      { n: "CtrlWAM", v: 61.75, rep: true, m: { IQ: 39.40, AQ: 37.10, TA: 41.20, PV: 88.70, IF: 73.80 } },
      { n: "DreamX-Phi 1", v: 60.65, rep: true, m: { IQ: 63.25, AQ: 43.38, TA: 57.15, PV: 82.24, IF: 61.62 } },
    ]},
  ];
  const MN_EN = { IQ: "Image quality", AQ: "Aesthetic quality", TA: "Trajectory accuracy", PV: "Perspectivity", IF: "Instruction following" };
  const MN_ZH = { IQ: "画面质量", AQ: "美学质量", TA: "轨迹精度", PV: "透视正确性", IF: "指令遵循" };
  mount("ewm-chart", (host, W) => {
    W = Math.max(W - 40, 300);
    const narrow = W < 620;
    const L = narrow ? 118 : 200, Rr = 64, rowH = 34, grpH = 34;
    const lo = 60, hi = 68;
    const X = (v) => L + (v - lo) / (hi - lo) * (W - L - Rr);
    const H = 26 + EWM.reduce((a, g) => a + grpH + g.rows.length * rowH, 0) + 6;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "list" }, host);
    for (let v = lo; v <= hi; v += 2) {
      el("line", { class: "ax-g", x1: X(v), x2: X(v), y1: 22, y2: H - 4 }, svg);
      txt(svg, X(v), 14, String(v), "ax-t", { "text-anchor": "middle" });
    }
    let y = 26, ri = 0;
    EWM.forEach(({ g, rows }) => {
      txt(svg, 0, y + 22, T(narrow ? g[0].replace("Run with the official code in this work", "Run in this work").replace("As reported in the original papers", "Reported in papers") : g[0], g[1]), "dm-grp");
      y += grpH;
      rows.forEach((r) => {
        const cy = y + rowH / 2;
        const row = el("g", { class: "dm-row", style: `--i:${ri++}`, role: "listitem", "aria-label": `${r.n}: EWM ${fmt(r.v)}${r.rep ? T(", reported", "，报告值") : ""}` }, svg);
        el("rect", { class: "dm-band", x: -6, y, width: W + 12, height: rowH, rx: 3 }, row);
        txt(row, 0, cy + 5, r.ours ? T("Innata-0 (ours)", "Innata-0（本模型）") : r.n, r.ours ? "lab-b" : "lab");
        el("line", { class: "ax-g", x1: L, x2: W - Rr, y1: cy, y2: cy, style: "stroke:var(--rule)" }, row);
        if (r.rep) el("circle", { class: "ew-dot rep", cx: X(r.v), cy, r: 6.5 }, row);
        else el("circle", { class: "ew-dot" + (r.ours ? " ours" : ""), cx: X(r.v), cy, r: r.ours ? 8 : 6.5 }, row);
        txt(row, W - 4, cy + 5, fmt(r.v), r.ours ? "lab-b" : "lab-2", { "text-anchor": "end" });
        el("rect", { class: "dm-hit", x: -6, y, width: W + 12, height: rowH }, row);
        bindTip(row, () => `<strong>${r.ours ? T("Innata-0 (ours)", "Innata-0（本模型）") : r.n}</strong><div class="tr"><span>${T("EWM (mean of 15)", "EWM（15 项均值）")}</span><span>${fmt(r.v)}</span></div>` +
          Object.entries(r.m).map(([k, v]) => `<div class="tr"><span>${(isZH() ? MN_ZH : MN_EN)[k]}</span><span>${fmt(v)}</span></div>`).join("") +
          (r.rep ? `<div class="tr"><span>${T("Source", "来源")}</span><span>${T("original paper", "原论文")}</span></div>` : ""),
          () => row.classList.add("hot"), () => row.classList.remove("hot"));
        y += rowH;
      });
    });
  });

  /* ───────── embodiment composition ───────── */
  const EMB = [
    ["AgiBot G1", 21.0], ["ARX Lift2", 11.6], ["AgileX Split ALOHA", 11.5], ["Franka Panda", 10.4],
    ["Galbot G1", 6.1], ["UR (unspecified)", 5.3], ["Panda + Omron", 4.7], ["Galaxea R1 Lite", 4.1],
    ["Sharpa North", 3.8], ["UR5", 3.3], ["Flexiv Rizon 4s", 3.1], ["AgileX ALOHA", 2.8],
    ["PaXini DF2", 2.6], ["TienKung", 1.5], [["Others", "其他"], 8.3],
  ];
  mount("emb-chart", (host, W) => {
    W = Math.max(W - 40, 260);
    const L = W < 420 ? 128 : 156, rowH = 24, barH = 14, Rr = 44;
    const max = 22;
    const X = (v) => (v / max) * (W - L - Rr);
    const H = EMB.length * rowH + 4;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "list" }, host);
    EMB.forEach(([n0, v], i) => {
      const other = Array.isArray(n0);
      const n = other ? T(n0[0], n0[1]) : (n0 === "UR (unspecified)" ? T(n0, "UR（未注明型号）") : n0);
      const y = i * rowH + 2, cy = y + rowH / 2;
      const row = el("g", { class: "emb-row", style: `--i:${i}`, role: "listitem", "aria-label": `${n}: ${v}%` }, svg);
      txt(row, 0, cy + 5, n, "lab");
      const w = X(v), r = Math.min(3, w), bx = L, by = cy - barH / 2;
      el("path", { class: "emb-bar" + (other ? " other" : ""), d: `M${bx},${by} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${barH - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(w - r)} z` }, row);
      txt(row, L + w + 8, cy + 5, v.toFixed(1) + "%", "lab-2");
      el("rect", { class: "dm-hit", x: 0, y, width: W, height: rowH }, row);
      bindTip(row, () => `<strong>${n}</strong><div class="tr"><span>${T("Share of source duration", "源时长占比")}</span><span>${v.toFixed(1)}%</span></div>`);
    });
  });


  /* ───────── the shared task interface (System) ─────────
     Report Figure 1 and §3.1.4: the model is conditioned on the same three fields the agent maintains. */
  mount("iface-chart", (host, W) => {
    W = Math.max(W - 56, 260);                       // the card's padding
    const narrow = W < 1000;
    const fields = [
      [T("Complete instruction", "完整指令"), T("keeps the global goal", "保持全局目标"), T("“Sear the steak in the pan.”", "“用平底锅煎牛排。”")],
      [T("Active subtask", "当前子任务"), T("the immediate objective", "给定即时执行目标"), T("“Place the pan on the active burner.”", "“把锅放到点着的炉头上。”")],
      [T("Completed history", "已完成子任务历史"), T("stages verified so far", "记录已验证的阶段"), T("✓ burner turned on   ✓ pan grasped", "✓ 炉头已打开   ✓ 已抓起锅")],
    ];
    if (narrow) {
      const full = W; W = Math.min(W, 620);            // stacked layout: capped and centred, so it does not stretch on tablets
      const H = 546, svg = el("svg", { viewBox: `${-(full - W) / 2} 0 ${full} ${H}`, width: full, height: H }, host);
      const bw = W - 2, bx = 1;
      txt(svg, W / 2, 16, T("Training annotations fill these fields", "训练时：任务标注填充这些字段"), "if-side", { "text-anchor": "middle" });
      el("path", { class: "if-arrow", d: `M${W / 2} 24 V44`, "marker-end": "url(#if-a)" }, svg);
      fields.forEach(([a, b, ex], i) => {
        const y = 50 + i * 92;
        el("rect", { class: "if-field", x: bx, y, width: bw, height: 80, rx: 6 }, svg);
        txt(svg, 18, y + 25, a, "if-f1"); txt(svg, 18, y + 45, b, "if-f3"); txt(svg, 18, y + 67, ex, "if-ex-s");
      });
      txt(svg, W, 340, T("example values are illustrative", "字段内容为示意"), "if-note", { "text-anchor": "end" });
      el("path", { class: "if-arrow", d: `M${W / 2} 376 V352`, "marker-end": "url(#if-a)" }, svg);
      txt(svg, W / 2, 394, T("The agent maintains them from", "执行时：智能体依据经验证的"), "if-side", { "text-anchor": "middle" });
      txt(svg, W / 2, 412, T("verified physical outcomes", "物理结果维护同一组字段"), "if-side", { "text-anchor": "middle" });
      el("line", { class: "ax-g", x1: 0, x2: W, y1: 432, y2: 432 }, svg);
      txt(svg, 0, 460, T("Validated experience", "经验证的交互与经验"), "if-f1"); txt(svg, 0, 480, T("→ reusable skills for the agent", "→ 智能体的可复用技能"), "if-f2");
      txt(svg, 0, 512, T("Successful rollout segments", "成功的执行片段"), "if-f1"); txt(svg, 0, 532, T("→ data pipeline → later policy training", "→ 数据管线 → 后续策略训练"), "if-f2");
      const d = el("defs", {}, svg), m = el("marker", { id: "if-a", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, d);
      el("path", { d: "M1 1 L9 5 L1 9", class: "if-head" }, m);
      return;
    }
    const H = 388, svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, host);
    const d = el("defs", {}, svg), m = el("marker", { id: "if-a", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, d);
    el("path", { d: "M1 1 L9 5 L1 9", class: "if-head" }, m);
    const side = Math.min(214, W * 0.19), cx0 = side + 40, cw = W - 2 * (side + 40), rowH = 50, top = 58;
    // the interface: three fields in one frame, each a row — its name and role on the left, an example on the right
    el("rect", { class: "if-frame", x: cx0 - 14, y: 44, width: cw + 28, height: rowH * 3 + 28, rx: 10 }, svg);
    txt(svg, W / 2, 30, T("One task interface", "同一个任务接口"), "if-title", { "text-anchor": "middle" });
    const split = cx0 + Math.min(250, cw * 0.4);
    fields.forEach(([a, b, ex], i) => {
      const y = top + i * rowH;
      el("rect", { class: "if-field", x: cx0, y, width: cw, height: rowH - 8, rx: 6 }, svg);
      txt(svg, cx0 + 16, y + 19, a, "if-f1");
      txt(svg, cx0 + 16, y + 36, b, "if-f3");
      el("line", { class: "ax-g", x1: split, x2: split, y1: y + 8, y2: y + rowH - 16 }, svg);
      txt(svg, split + 16, y + 27, ex, "if-ex");
    });
    txt(svg, cx0 + cw + 14, top + rowH * 3 + 30, T("example values are illustrative", "字段内容为示意"), "if-note", { "text-anchor": "end" });
    // who writes it, on each side
    const mid = top + rowH * 1.5 - 4;
    const lines = (x, anchor, rows, y0) => rows.forEach((s, i) => txt(svg, x, y0 + i * 21, s, i ? "if-side" : "if-side-h", { "text-anchor": anchor }));
    lines(0, "start", [T("Training", "训练侧"), T("Task annotations", "任务标注填充"), T("fill these fields", "这三个字段")], mid - 19);
    el("path", { class: "if-arrow if-wam", d: `M${side - 14} ${mid} H${cx0 - 22}`, "marker-end": "url(#if-a)" }, svg);
    lines(W, "end", [T("Execution", "执行侧"), T("The agent maintains them", "智能体依据经验证的"), T("from verified outcomes", "物理结果维护")], mid - 19);
    el("path", { class: "if-arrow if-agent", d: `M${W - side + 14} ${mid} H${cx0 + cw + 22}`, "marker-end": "url(#if-a)" }, svg);
    // what flows back: two paths, drawn apart on purpose
    el("line", { class: "ax-g", x1: 0, x2: W, y1: 264, y2: 264 }, svg);
    txt(svg, 0, 298, T("Experience flows back two ways", "经验的两条去向"), "if-title");
    const half = W / 2;
    const flow = (x, cls, a, steps) => {
      el("circle", { class: "if-dot " + cls, cx: x + 7, cy: 334, r: 7 }, svg);
      txt(svg, x + 26, 339, a, "if-f1");
      txt(svg, x + 26, 363, steps, "if-f2");
    };
    flow(0, "if-agent", T("Validated interactions and experience", "经验证的交互与经验"), T("→ reusable skills → later decisions and recovery", "→ 可复用技能 → 优化后续决策与恢复策略"));
    flow(half + 10, "if-wam", T("Successful rollout segments", "成功的执行片段"), T("→ shared data pipeline → subsequent policy training", "→ 共享数据管线 → 后续策略训练"));
  });

  /* ───────── one online recovery (Agent) ─────────
     The report's online recovery figure, top row: the searing task in RoboCasa365. Step numbers are the report's. */
  const CASE = [
    [2304, ["Verify burner mismatch", "核实炉头不符"], ["The pan is not on the active burner", "锅不在点着的炉头上"]],
    [2503, ["Retarget pan handle", "重新对准锅柄"], ["", ""]],
    [2577, ["Grasp and lift", "抓起并提起"], ["", ""]],
    [2638, ["Transfer to burner", "移到炉头上"], ["", ""]],
    [2702, ["Official success", "达到官方成功条件"], ["", ""]],
  ];
  mount("case-chart", (host, W) => {
    W = Math.max(W - 56, 260);                       // the card's padding
    const narrow = W < 720, end = 2702, at = 2304;
    if (narrow) {
      const rowH = 54, H = 96 + CASE.length * rowH, svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, host);
      el("rect", { class: "cs-wam", x: 0, y: 6, width: W, height: 12, rx: 6 }, svg);
      const xa = W * at / end;
      el("rect", { class: "cs-agent", x: xa, y: 6, width: W - xa, height: 12, rx: 6 }, svg);
      txt(svg, 0, 40, T("Model executes, steps 0–2304", "模型执行：第 0–2304 步"), "cs-k wam");
      txt(svg, 0, 62, T("Agent recovers on the live scene, 2304–2702", "智能体现场恢复：第 2304–2702 步"), "cs-k agent");
      CASE.forEach(([st, name, note], i) => {
        const y = 96 + i * rowH;
        el("circle", { class: "cs-node" + (i === 0 ? " first" : i === CASE.length - 1 ? " last" : ""), cx: 11, cy: y - 5, r: 11 }, svg);
        txt(svg, 11, y, String(i + 1), "cs-n", { "text-anchor": "middle" });
        txt(svg, 34, y, T(name[0], name[1]), "if-f1");
        txt(svg, 34, y + 20, T("step ", "第 ") + st + T("", " 步") + (T(note[0], note[1]) ? " · " + T(note[0], note[1]) : ""), "if-f2");
      });
      return;
    }
    const H = 232, L = 0, R = W, svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, host);
    // the model's stretch is compressed: nothing to show happens in it. The recovery gets the room.
    const xa = L + (R - L) * 0.30, X = (st) => xa + (R - 14 - xa) * (st - at) / (end - at), y = 150;
    el("rect", { class: "cs-wam", x: L, y: y - 6, width: xa - L, height: 12, rx: 6 }, svg);
    el("rect", { class: "cs-agent", x: xa, y: y - 6, width: R - xa, height: 12, rx: 6 }, svg);
    txt(svg, L, y - 22, T("Model executes", "模型执行"), "cs-k wam");
    txt(svg, L, y + 32, T("steps 0–2304", "第 0–2304 步"), "if-f2");
    el("line", { class: "cs-mark", x1: xa, x2: xa, y1: 22, y2: y + 44 }, svg);
    txt(svg, xa + 10, 20, T("Anomaly verified · the agent takes over the live scene", "确认异常 · 智能体接管现场"), "cs-k agent");
    CASE.forEach(([st, name, note], i) => {
      const x = X(st), up = i % 2 === 1 ? false : true, last = i === CASE.length - 1;
      const lift = last && W < 960 ? 44 : 0;         // no room beside "Grasp and lift": the last label goes up a tier
      const ty = (up ? y - 62 : y + 62) - lift, anchor = i === 0 ? "start" : last ? "end" : "middle", tx = i === 0 ? x + 10 : last ? x : x;
      if (i > 0) el("line", { class: "cs-stem", x1: x, x2: x, y1: up ? y - 16 : y + 16, y2: up ? ty + 26 : ty - 18 }, svg);
      el("circle", { class: "cs-node" + (i === 0 ? " first" : last ? " last" : ""), cx: x, cy: y, r: 12 }, svg);
      txt(svg, x, y + 5, String(i + 1), "cs-n", { "text-anchor": "middle" });
      if (i === 0) { txt(svg, tx, 44, T(name[0], name[1]), "if-f1"); txt(svg, tx, 64, T("step 2304 · ", "第 2304 步 · ") + T(note[0], note[1]), "if-f2"); return; }
      txt(svg, tx, ty, T(name[0], name[1]), "if-f1", { "text-anchor": anchor });
      txt(svg, tx, ty + 20, T("step ", "第 ") + st + T("", " 步"), "if-f2", { "text-anchor": anchor });
    });
  });

  /* ───────── why co-design: two paths that do not hold (System) ─────────
     Report L128-136 and deck slide 2; drawn after shot 2 of the film. Schematic: nothing here is measured. */
  mount("why-chart", (host, W) => {
    W = Math.max(W - 56, 260);
    const narrow = W < 720, colW = narrow ? W : (W - 64) / 2, H = narrow ? 320 : 158;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, host);
    const col = (x0, y0, kCls, k, draw, a, b, capY = 118) => {
      txt(svg, x0, y0 + 12, k, "why-k " + kCls);
      draw(x0, y0 + 34);
      const t = txt(svg, x0, y0 + capY, a + " ", "why-l");
      el("tspan", { class: "why-bad" }, t).textContent = b;
    };
    // a standalone model: the task proceeds block by block and breaks at the fourth
    col(0, 0, "wam", T("A standalone model", "独立的基础模型"), (x, y) => {
      const n = 6, g = 8, bw = Math.min(64, (colW - g * (n - 1)) / n);
      for (let i = 0; i < n; i++) {
        const broken = i >= 4;
        el("rect", { class: "why-blk" + (broken ? " lost" : ""), x: x + i * (bw + g) + (broken ? 10 + (i - 4) * 6 : 0), y: y + (broken ? 8 + (i - 4) * 9 : 0), width: bw, height: 34, rx: 5,
          transform: broken ? `rotate(${6 + (i - 4) * 7} ${x + i * (bw + g) + bw / 2} ${y + 17})` : "" }, svg);
      }
      const bx = x + 4 * (bw + g) - g / 2 + 1;
      el("path", { class: "why-crack", d: `M${bx} ${y - 8} l6 9 l-7 9 l8 10 l-7 9 l6 10` }, svg);
    }, T("long-horizon execution", "长程执行"), T("breaks down", "中途失效"));
    // an agent bolted on: planning and control start as one line and drift apart
    const x1 = narrow ? 0 : colW + 64, y1 = narrow ? 156 : 0;
    col(x1, y1, "agent", T("An agent bolted on", "简单外接的智能体"), (x, y) => {
      const n = 60, wv = (k, drift) => { let d = ""; for (let i = 0; i <= n; i++) { const t = i / n, px = x + t * colW, py = y + 22 + Math.sin(t * 9) * 9 + drift * Math.max(0, t - 0.28) * 44; d += (i ? "L" : "M") + px.toFixed(1) + " " + py.toFixed(1) + " "; } return d; };
      el("path", { class: "why-wave plan", d: wv(0, -1) }, svg);
      el("path", { class: "why-wave ctrl", d: wv(0, 1) }, svg);
      for (const t of [0.52, 0.72, 0.92]) { const px = x + t * colW, o = (t - 0.28) * 44, m = y + 22 + Math.sin(t * 9) * 9; el("line", { class: "why-gap", x1: px, x2: px, y1: m - o, y2: m + o }, svg); }
      const endY = (drift) => y + 22 + Math.sin(9) * 9 + drift * (1 - 0.28) * 44;   // where each curve ends, as in wv()
      txt(svg, x + colW, endY(-1) - 11, T("plan", "规划"), "why-wl plan", { "text-anchor": "end" });
      txt(svg, x + colW, endY(1) + 22, T("control", "控制"), "why-wl ctrl", { "text-anchor": "end" });
    }, T("planning and control", "规划与控制"), T("can diverge", "可能不一致"), narrow ? 138 : 118);   // stacked: clear of the "control" label
  });

  /* ───────── one run on three lanes (Agent) ─────────
     Structure / Execute / Verify on one time axis, after shot 6 of the film. Schematic: the report's own
     figures give the intervals (stage review every 80 steps, verification every 256), not this exact episode. */
  mount("run-chart", (host, W) => {
    W = Math.max(W - 56, 260);
    const narrow = W < 720, L = narrow ? 0 : 118, R = W, tw = R - L, n = 5, take = 3.42;        // the agent takes over 42% into subtask 4
    const laneH = narrow ? 98 : 62, top = narrow ? 30 : 8, H = top + laneH * 3 + (narrow ? 22 : 30);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, host);
    const lane = (i) => top + laneH * i, xs = (k) => L + tw * k / n, xt = xs(take);
    const short = narrow || xt - xs(3) < 92;        // no room for "Subtask 4" left of the takeover line: numbers only
    const names = [[T("Structure", "任务结构"), "plan"], [T("Execute", "执行"), "wam"], [T("Verify", "校验"), "ver"]];
    names.forEach(([t, c], i) => txt(svg, 0, narrow ? lane(i) - 8 : lane(i) + 27, t, "run-k " + c));
    // structure: five subtasks, the first three verified
    for (let k = 0; k < n; k++) {
      const done = k < 3, cur = k === 3;
      el("rect", { class: "run-sub" + (done ? " done" : cur ? " cur" : ""), x: xs(k) + 3, y: lane(0) + 4, width: tw / n - 6, height: 36, rx: 6 }, svg);
      txt(svg, xs(k) + (narrow ? 10 : 14), lane(0) + 27, (short ? "" : T("Subtask ", "子任务 ")) + (k + 1), "run-sub-t" + (done || cur ? " on" : ""));
      if (done) el("path", { class: "run-tick", d: `M${xs(k + 1) - 28} ${lane(0) + 22} l5 5 l9 -10` }, svg);
    }
    // execute: the model's action chunks up to the takeover, then the agent to the end
    const cw = narrow ? 7 : 11, cg = 3, cn = Math.floor((xt - L - 3) / (cw + cg));
    for (let k = 0; k < cn; k++) el("rect", { class: "run-chunk", x: L + 3 + k * (cw + cg), y: lane(1) + 8, width: cw, height: 26, rx: 2, style: `opacity:${0.62 + 0.38 * ((k * 7) % 5) / 4}` }, svg);
    el("rect", { class: "run-agent", x: xt + 2, y: lane(1) + 8, width: R - xt - 5, height: 26, rx: 4 }, svg);
    txt(svg, L + 3, lane(1) + 52, W < 300 ? T("the model", "模型") : T("the model · action chunks", "模型 · 动作块"), "run-n wam");
    txt(svg, R - 3, lane(1) + 52, narrow ? T("the agent, to the end", "智能体，直到结束") : T("the agent in control, to the end of the task", "智能体接管，直到任务结束"), "run-n agent", { "text-anchor": "end" });
    // verify: scheduled checks; the fourth verifies an anomaly
    const checks = [0.62, 1.42, 2.22, 3.02].map((k) => xs(k) + tw / n * 0.2);
    checks.forEach((x, i) => {
      const bad = i === 3, cx = bad ? xt : x;
      el("line", { class: "run-stem", x1: cx, x2: cx, y1: lane(1) + 36, y2: lane(2) + 6 }, svg);
      el("circle", { class: "run-chk" + (bad ? " bad" : ""), cx, cy: lane(2) + 20, r: 13 }, svg);
      el("path", { class: "run-chk-m" + (bad ? " bad" : ""), d: bad ? `M${cx - 5} ${lane(2) + 15} l10 10 M${cx + 5} ${lane(2) + 15} l-10 10` : `M${cx - 6} ${lane(2) + 20} l4 5 l8 -10` }, svg);
    });
    el("line", { class: "run-take", x1: xt, x2: xt, y1: lane(0) - 4, y2: lane(1) + 36 }, svg);
    const lab = T("Verified anomaly", "确认异常"), lw = lab.length * (isZH() ? 17 : 9.4) + 22, lx = narrow ? R - lw : Math.min(xt + 22, R - lw), ly = narrow ? lane(2) + 42 : lane(2) + 5;
    el("rect", { class: "run-flag", x: lx, y: ly, width: lw, height: 30, rx: 5 }, svg);
    txt(svg, lx + 11, ly + 21, lab, "run-flag-t");
    if (!narrow) txt(svg, L + 3, H - 6, T("scheduled checkpoints · slow progress alone is not failure", "按计划设置的检查点 · 仅进展缓慢不算失败"), "run-n");
    svg.querySelectorAll(".run-n, .run-k").forEach((t) => svg.appendChild(t));   // labels on top: their outline interrupts the stems behind them
  });

  /* ───────── misc ───────── */
  document.querySelectorAll("[data-pending]").forEach((a) => {
    if (!a.title) a.title = "Coming soon";
    a.addEventListener("click", (e) => e.preventDefault());
  });
  /* ───────── hero film ─────────
     Nothing is fetched for the film until the page itself has loaded; until then the poster stands in.
     The film plays with its sound on. Browsers only allow that once the visitor has interacted with
     the page, so when sound is refused the film starts muted and the sound comes on at the visitor's
     first click or key press, unless they have muted it. Off screen or in a background tab the film
     is paused. The bar under it scrubs and mutes; play or pause sits with the links; clicking the picture pauses too. */
  const hero = document.querySelector(".hero-film");
  const hv = document.getElementById("hero-video");
  const hs = document.getElementById("hero-sound");
  const hp = document.getElementById("hero-pause");
  let heroLabels = () => {};
  if (hv && hs) {
    const bar = document.getElementById("film-bar"), seek = document.getElementById("film-seek");
    const tNow = document.getElementById("film-now"), tAll = document.getElementById("film-all");
    const saver = !!(navigator.connection && navigator.connection.saveData);
    let userPaused = reduce || saver;            // reduced motion or data saver: poster only, until asked
    let onScreen = true, pageLoaded = false;
    let wantSound = true, blocked = false;       // blocked: the browser refused sound and we are waiting for a gesture
    let waiting = false;                          // waiting: it refused to play at all, even muted (WeChat's browser does), until a tap
    const pick = (kind) => hv.getAttribute(`data-${kind}-${isZH() ? "zh" : "en"}`) || hv.getAttribute(`data-${kind}-en`);
    const source = () => {                        // point the player at this language's cut; true if it changed
      const url = pick("src");
      if (!url || hv.getAttribute("src") === url) return false;
      hv.src = url; hv.load();
      return true;
    };
    const cue = document.getElementById("sound-cue");
    const placeCue = () => {                      // keep the prompt over the film itself, clear of the title
      if (!cue || cue.hidden) return;
      const v = hv.getBoundingClientRect(), h = hero.getBoundingClientRect();
      cue.style.setProperty("--cue-y", Math.round(v.top - h.top + Math.min(v.height * 0.9, v.height - 34)) + "px");
    };
    const say = (node, text) => { node.setAttribute("aria-label", text); node.title = text; };
    const labels = () => {
      hs.classList.toggle("is-muted", hv.muted);
      say(hs, hv.muted ? T("Unmute", "开启声音") : T("Mute", "静音"));
      hs.setAttribute("aria-pressed", String(hv.muted));
      if (cue) {                                  // while the browser holds back the sound, or the film itself, and the visitor has not declined
        cue.lastElementChild.textContent = waiting ? T("Click to play", "点击播放") : T("Click for sound", "点击开启声音");
        cue.classList.toggle("is-go", waiting);
        cue.hidden = !((waiting || (blocked && wantSound)) && !userPaused);
        placeCue();
      }
      const idle = userPaused || waiting;          // nothing is playing: the button offers play
      hp.classList.toggle("is-paused", idle);
      say(hp, idle ? T("Play film", "播放视频") : T("Pause film", "暂停视频"));
      seek.setAttribute("aria-label", T("Seek", "播放进度"));
    };
    const play = () => {
      hv.muted = !wantSound || blocked;
      const started = hv.play();
      if (started && started.catch) started.catch((err) => {
        if (!err || err.name !== "NotAllowedError") return;
        if (hv.muted) { waiting = true; labels(); return; }               // refused even muted: wait for a tap, and say so
        blocked = true; hv.muted = true; labels();
        run();                                    // start again, muted this time
      });
    };
    // Start from inside a tap. The call to play() has to happen in the gesture handler itself, with nothing
    // asynchronous in between, or WeChat's browser does not count it as the visitor's own.
    const startByTap = () => {
      waiting = false; blocked = false; userPaused = false; pageLoaded = true;
      source();
      hv.muted = !wantSound;
      const started = hv.play();
      if (started && started.catch) started.catch(() => { if (hv.paused) { waiting = true; labels(); } });
      labels();
    };
    const run = () => {
      if (!pageLoaded) return;
      if (onScreen && !document.hidden && !userPaused) { source(); if (hv.paused && !waiting) play(); }   // while waiting for a tap, do not keep asking
      else if (!hv.paused) hv.pause();
    };
    hv.addEventListener("playing", () => { if (waiting) { waiting = false; labels(); } });
    heroLabels = () => {
      const poster = pick("poster");
      if (poster && hv.getAttribute("poster") !== poster) hv.setAttribute("poster", poster);
      labels();
      if (hv.getAttribute("src")) run();          // a language switch may call for the other cut
    };

    // the scrubber and the clock
    const clock = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
    let scrubbing = false, ticking = 0;
    const paint = () => {
      const d = isFinite(hv.duration) ? hv.duration : 0, t = scrubbing ? +seek.value : (hv.currentTime || 0);
      if (!scrubbing) seek.value = t;
      seek.style.setProperty("--pos", (d ? Math.min(100, t / d * 100) : 0).toFixed(2) + "%");
      tNow.textContent = clock(t);
      seek.setAttribute("aria-valuetext", clock(t) + " / " + clock(d));
    };
    const tick = () => { ticking = 0; paint(); if (!hv.paused) ticking = requestAnimationFrame(tick); };
    hv.addEventListener("playing", () => { if (!ticking) ticking = requestAnimationFrame(tick); });
    hv.addEventListener("loadedmetadata", () => { seek.max = hv.duration; seek.disabled = false; tAll.textContent = clock(hv.duration); paint(); });
    hv.addEventListener("emptied", () => { seek.disabled = true; seek.value = 0; tAll.textContent = "–:––"; paint(); });
    ["timeupdate", "seeked", "pause"].forEach((t) => hv.addEventListener(t, paint));
    const jump = (t) => { if (!isFinite(hv.duration)) return; hv.currentTime = Math.min(Math.max(0, t), hv.duration - 0.05); paint(); };
    seek.addEventListener("input", () => { scrubbing = true; jump(+seek.value); });
    seek.addEventListener("change", () => { scrubbing = false; paint(); });
    seek.addEventListener("keydown", (e) => {     // arrows step five seconds, which is what video players do
      const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[e.key];
      if (step) { e.preventDefault(); jump(hv.currentTime + step); }
      else if (e.key === "Home") { e.preventDefault(); jump(0); }
    });

    const toggle = () => {
      if (waiting || (hv.paused && !userPaused)) { startByTap(); return; }   // not playing though it was meant to be: this tap starts it
      userPaused = !userPaused; pageLoaded = true; labels();
      if (userPaused) run(); else startByTap();
    };
    hp.addEventListener("click", toggle);
    hv.addEventListener("click", (e) => { if (!e.soundUnlocked) toggle(); });   // a click that just brought the sound on is not also a pause
    if (cue) cue.addEventListener("click", (e) => { if (waiting) { e.stopPropagation(); startByTap(); } });
    hs.addEventListener("click", () => {
      if (hv.muted) { wantSound = true; blocked = false; hv.muted = false; }
      else { wantSound = false; hv.muted = true; }
      labels();
    });
    // the visitor's first click or key press anywhere lets the sound through
    const unlock = (e) => {
      if (waiting) return;                        // nothing is playing yet; the tap handlers above start it
      if (!blocked || hs.contains(e.target)) return;
      blocked = false;
      if (wantSound) {
        hv.muted = false;
        // hear it from the start, unless the visitor is working the controls or has paused
        if (!bar.contains(e.target) && !hp.contains(e.target) && !userPaused && !hv.paused) { if (hv.currentTime > 1) hv.currentTime = 0; e.soundUnlocked = true; }
      }
      labels();
    };
    ["click", "keydown"].forEach((t) => document.addEventListener(t, unlock, true));
    addEventListener("resize", placeCue);
    document.addEventListener("visibilitychange", run);
    if (hero && "IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; run(); }, { threshold: 0 }).observe(hero);
    }
    const begin = () => { pageLoaded = true; run(); };
    document.addEventListener("WeixinJSBridgeReady", () => { if (!pageLoaded || userPaused || !hv.paused) return; waiting = false; source(); play(); }, false);
    if (document.readyState === "complete") setTimeout(begin, 0); else addEventListener("load", () => setTimeout(begin, 0), { once: true });
    heroLabels();
  }

  /* ───────── motion ─────────
     html.motion is set in <head> when the visitor allows motion. Arriving blocks fade and rise;
     blocks that arrive together are staggered in reading order. */
  const root = document.documentElement;
  window.__motionReady = true;
  if (root.classList.contains("motion") && !("IntersectionObserver" in window)) root.classList.remove("motion");
  if (root.classList.contains("motion")) {
    const RISE = ".sec-head > *, .duo-col, .duo-join, .duo-note, .loop, .agent-block > h3, .ladder li, .agent-block > p, .obs, " +
      ".recovery > h3, .recovery > p, .steps li, .evolve > h3, .phases li, .evolve > .note, .clips-cap, .facts > div, .touch, " +
      ".tower-notes > div, #model > .note, .viz, .bib";
    const GROW = ".clip, .towers";
    const io = new IntersectionObserver((entries) => {
      entries.filter((e) => e.isIntersecting)
        .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left))
        .forEach((e, i) => {
          e.target.style.setProperty("--d", Math.min(i, 6) * 90 + "ms");
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0 });
    // Only blocks below the fold are hidden and animated in; whatever is on screen or already
    // scrolled past is left as it is, so nothing blinks.
    const arm = (sel, ...cls) => document.querySelectorAll(sel).forEach((n) => {
      if (n.getBoundingClientRect().top < innerHeight) { n.classList.add("in"); return; }
      n.classList.add("rv", ...cls);
      io.observe(n);
    });
    // whatever sits too close to the end of the page to cross the trigger line arrives when the page ends
    const flush = () => {
      if (scrollY + innerHeight < document.documentElement.scrollHeight - 8) return;
      document.querySelectorAll(".rv:not(.in)").forEach((n) => { n.classList.add("in"); io.unobserve(n); });
    };
    // "The fold" is only known once the browser has put the page where it is going to be (a restored
    // scroll position, an #anchor), so wait for load, but never long.
    let armed = false;
    const armAll = () => {
      if (armed) return; armed = true;
      arm(GROW, "rv-s"); arm(RISE);
      addEventListener("scroll", flush, { passive: true });
    };
    const soon = () => requestAnimationFrame(() => requestAnimationFrame(armAll));
    if (document.readyState === "complete") soon(); else addEventListener("load", soon, { once: true });
    setTimeout(armAll, 1200);

    if (hero) {
      let queued = false;
      const sync = () => {
        queued = false;
        const p = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight || 1)));
        hero.style.setProperty("--p", p.toFixed(4));
      };
      addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(sync); } }, { passive: true });
      sync();
    }
  }

  const copy = document.getElementById("copy-bib");
  if (copy) {
    // the button is an icon; what happened is said in a short note beside it, then cleared
    const note = copy.querySelector(".bib-copy-note");
    let back = 0;
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(document.getElementById("bibtex").textContent);
        copy.classList.add("is-done");
        note.textContent = T("Copied", "已复制");
      } catch { note.textContent = T("Select the text to copy", "请手动选中文本复制"); }
      clearTimeout(back);
      back = setTimeout(() => { copy.classList.remove("is-done"); note.textContent = ""; }, 1800);
    });
  }
  // Re-render all charts and the loop (kept for a future language switch; nothing calls it today).
  window.__applyLangSite = () => {
    charts.forEach((f) => f());
    undTable();
    if (window.__applyLangLoop) window.__applyLangLoop();
    heroLabels();
  };
})();
