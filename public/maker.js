// Shared by the kids' page and the teacher page: turns photos, PDFs and Word
// docs into one study set by sending them to our server in small parts.
window.Maker = (() => {
  const PER_PART = 3;          // photos per request; matches MAX_IMAGES in lib/study.mjs
  const TEXT_CHUNK = 20000;    // characters of document text per request
  const LIB = window.__STUDY_LIB || "https://cdn.jsdelivr.net/npm/";

  const ERR = {
    rate_limited: "Hoot is busy right now. Wait a few minutes and try again.",
    server_misconfigured: "Hoot isn't set up yet. Ask a grown-up to check the app settings.",
    too_large: "That's too big to send. Try fewer or smaller pages.",
    image_rejected: "One of the photos couldn't be read. Remove it and take it again.",
    refused: "Hoot couldn't make a study set from these pages. Try clearer photos of the review pages.",
    empty_completion: "Hoot came back empty. Try again with clearer photos.",
    invalid_json: "Hoot's answer got scrambled. Tap the button to try again.",
    class_not_found: "There's no class with that code. Check the letters and try again.",
    not_teacher: "This teacher link doesn't match the class. Open the link you saved when you made the class.",
    class_full: "This class has the most study guides it can hold. Remove an old one first."
  };
  const STOP_ALL = ["rate_limited", "server_misconfigured"];
  const errText = e => ERR[e && e.code] || "Something went wrong. Check your connection and try again.";

  async function api(path, opts) {
    let r;
    try { r = await fetch(path, opts); } catch { throw { code: "upstream_error" }; }
    const j = await r.json().catch(() => null);
    if (!r.ok || !j) throw { code: (j && j.code) || (r.status === 413 ? "too_large" : "upstream_error") };
    return j.data;
  }
  const post = (path, body) => api(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  function status(el, msg, kind) {
    el.hidden = !msg; el.className = "status" + (kind === "err" ? " err" : "");
    el.replaceChildren();
    if (!msg) return;
    if (kind === "busy") { const s = document.createElement("div"); s.className = "spinner"; el.style.display = "flex"; el.style.gap = "10px"; el.style.alignItems = "center"; el.append(s); }
    else el.style.display = "";
    const t = document.createElement("span"); t.textContent = msg; el.append(t);
  }

  // ---------- reading files in the browser ----------
  const loaded = {};
  function loadScript(path) {
    return loaded[path] || (loaded[path] = new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = LIB + path;
      s.onload = res; s.onerror = () => { delete loaded[path]; rej(new Error("load")); };
      document.head.append(s);
    }));
  }
  const canvasToJpeg = c => new Promise(r => c.toBlob(r, "image/jpeg", 0.82));
  async function toJpeg(file) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return (await canvasToJpeg(c)) || file;
    } catch { return file; }
  }
  async function readPdf(file, out, onStatus) {
    // pdf.js runs on the page's main thread: the worker script defines window.pdfjsWorker
    await loadScript("pdfjs-dist@3.11.174/build/pdf.min.js");
    await loadScript("pdfjs-dist@3.11.174/build/pdf.worker.min.js");
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    const base = file.name.replace(/\.pdf$/i, "");
    for (let p = 1; p <= pdf.numPages; p++) {
      onStatus(`Opening ${file.name}: page ${p} of ${pdf.numPages}…`);
      const page = await pdf.getPage(p);
      const v1 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min(3, 1600 / Math.max(v1.width, v1.height)) });
      const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const blob = await canvasToJpeg(c);
      if (blob) out.push({ kind: "img", blob, url: URL.createObjectURL(blob), label: `${base} p${p}` });
    }
  }
  async function readDocx(file, out) {
    await loadScript("mammoth@1.6.0/mammoth.browser.min.js");
    const r = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (r.value.trim()) out.push({ kind: "text", text: r.value, label: file.name });
  }

  // A photo/file picker with page thumbnails. els: {photos, files, thumbs,
  // tally, pickLabel, status}; onChange runs whenever the page list changes.
  function picker(els, onChange) {
    let sources = [];
    function render() {
      const t = els.thumbs; t.replaceChildren();
      sources.forEach((p, i) => {
        const d = document.createElement("div"); d.className = "thumb";
        if (p.kind === "img") { const img = document.createElement("img"); img.src = p.url; img.alt = p.label || "Page " + (i + 1); d.append(img); }
        else { const doc = document.createElement("div"); doc.className = "doc"; doc.textContent = p.label; d.append(doc); }
        const x = document.createElement("button"); x.textContent = "×"; x.setAttribute("aria-label", "Remove page " + (i + 1));
        x.onclick = () => { if (p.url) URL.revokeObjectURL(p.url); sources.splice(i, 1); render(); };
        const n = document.createElement("span"); n.textContent = i + 1;
        d.append(n, x); t.append(d);
      });
      t.hidden = !sources.length;
      if (els.pickLabel) els.pickLabel.textContent = sources.length ? "Take another photo" : "Take photos of the pages";
      els.tally.hidden = !sources.length;
      els.tally.textContent = `${sources.length} page${sources.length === 1 ? "" : "s"} added.`;
      onChange();
    }
    async function add(files) {
      const problems = [];
      status(els.status, "Adding…", "busy");
      for (const f of files) {
        const n = (f.name || "").toLowerCase();
        try {
          if (f.type === "application/pdf" || n.endsWith(".pdf")) await readPdf(f, sources, m => status(els.status, m, "busy"));
          else if (n.endsWith(".docx")) await readDocx(f, sources);
          else if (f.type.startsWith("text/") || n.endsWith(".txt") || n.endsWith(".md")) { const t = await f.text(); if (t.trim()) sources.push({ kind: "text", text: t, label: f.name }); }
          else if (f.type.startsWith("image/") || /\.(jpe?g|png|heic|heif|webp|gif)$/.test(n)) { const blob = await toJpeg(f); sources.push({ kind: "img", blob, url: URL.createObjectURL(blob), label: "" }); }
          else problems.push(`${f.name} (that kind of file isn't supported yet; save it as a PDF)`);
        } catch { problems.push(`${f.name} (couldn't open it)`); }
        render();
      }
      status(els.status, problems.length ? "Skipped: " + problems.join(", ") : "", problems.length ? "err" : "");
    }
    for (const input of [els.photos, els.files].filter(Boolean)) {
      input.addEventListener("change", async ev => {
        const files = [...ev.target.files]; ev.target.value = "";
        if (files.length) await add(files);
      });
    }
    render();
    return {
      get sources() { return sources; },
      get count() { return sources.length; },
      clear() { sources.forEach(p => p.url && URL.revokeObjectURL(p.url)); sources = []; render(); }
    };
  }

  // ---------- turning pages into a study set ----------
  const toB64 = blob => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res({ type: blob.type || "image/jpeg", data: String(fr.result).split(",")[1] });
    fr.onerror = rej; fr.readAsDataURL(blob);
  });
  function cleanQuiz(q) {
    return (Array.isArray(q) ? q : []).filter(x => x && x.q && Array.isArray(x.choices) && x.choices.length >= 2 && Number.isInteger(+x.answer) && x.choices[+x.answer] != null)
      .map(x => ({ q: String(x.q), choices: x.choices.map(String), answer: +x.answer, why: String(x.why || "") }));
  }
  const pageRange = ps => ps.length > 1 ? `pages ${ps[0]}–${ps[ps.length - 1]}` : `page ${ps[0]}`;

  function makeBatches(sources) {
    const numbered = sources.map((s, i) => ({ ...s, n: i + 1 }));
    const imgs = numbered.filter(s => s.kind === "img"), batches = [];
    for (let i = 0; i < imgs.length; i += PER_PART) batches.push({ imgs: imgs.slice(i, i + PER_PART), text: "", pages: imgs.slice(i, i + PER_PART).map(s => s.n) });
    for (const s of numbered.filter(s => s.kind === "text")) {
      for (let i = 0; i < s.text.length; i += TEXT_CHUNK)
        batches.push({ imgs: [], text: `From "${s.label}":\n` + s.text.slice(i, i + TEXT_CHUNK), pages: [s.n] });
    }
    return batches;
  }

  // Reads every page (two parts at a time) and merges the parts into one set.
  // onProgress(message) shows status. Rejects {code} when nothing could be read.
  async function build(sources, name, onProgress) {
    const batches = makeBatches(sources), count = sources.length;
    const results = new Array(batches.length).fill(null), failed = [];
    let done = 0, stop = null, next = 0;
    const show = () => onProgress(batches.length > 1
      ? `Reading ${count} pages in ${batches.length} parts… ${done} of ${batches.length} done. Keep this page open.`
      : `Reading ${count} page${count > 1 ? "s" : ""}… this usually takes under a minute.`);
    show();
    async function worker() {
      while (!stop && next < batches.length) {
        const k = next++, b = batches[k];
        try {
          const images = await Promise.all(b.imgs.map(s => toB64(s.blob)));
          const d = await post("/api/study", { kind: "batch", part: k + 1, total: batches.length, name, images, text: b.text });
          if (!d || typeof d !== "object" || d.error) throw { code: "refused" };
          results[k] = d;
        } catch (e) {
          if (STOP_ALL.includes(e && e.code)) stop = e; else failed.push(b);
        }
        done++; show();
      }
    }
    await Promise.all([worker(), worker()]);
    const ok = results.filter(Boolean);
    const cards = [], quiz = [], seenC = new Set(), seenQ = new Set();
    for (const d of ok) {
      for (const c of Array.isArray(d.cards) ? d.cards : []) {
        if (!c || !c.front || !c.back) continue;
        const key = String(c.front).trim().toLowerCase(); if (seenC.has(key)) continue; seenC.add(key);
        cards.push({ front: String(c.front), back: String(c.back) });
      }
      for (const q of cleanQuiz(d.quiz)) { const key = q.q.trim().toLowerCase(); if (!seenQ.has(key)) { seenQ.add(key); quiz.push(q); } }
    }
    if (!cards.length && !quiz.length) throw stop || { code: failed.length ? "refused" : "empty_completion" };
    const missing = [...new Set([...failed, ...(stop ? batches.filter((b, k) => !results[k]) : [])].flatMap(b => b.pages))].sort((a, b) => a - b);
    const head = ok[0];
    return {
      id: "s" + Date.now().toString(36), name: (name || String(head.title || "Study set")).slice(0, 80),
      subject: String(head.subject || "").slice(0, 40), summary: String(head.summary || ""),
      notes: ok.map(d => String(d.notes || "")).join("\n").slice(0, 40000),
      warning: missing.length ? `Hoot couldn't read ${pageRange(missing)}, so ${missing.length > 1 ? "those aren't" : "it isn't"} in this set. You can make a second set from just those pages.` : "",
      created: Date.now(), best: null, cards, quiz
    };
  }

  return { api, post, status, errText, picker, build, cleanQuiz };
})();
