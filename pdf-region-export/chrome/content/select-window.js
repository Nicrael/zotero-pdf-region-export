var RegionExport = {
  init() {
    try { window.moveTo(0, 0); window.resizeTo(window.screen.availWidth, window.screen.availHeight); } catch (e) {}
    const args = window.arguments[0];
    const Zotero = args.Zotero;
    const rootURI = args.rootURI;
    const doc = document;
    const NS = "http://www.w3.org/1999/xhtml";
    const el = (tag, props = {}, css = "") => {
      const e = doc.createElementNS(NS, tag);
      Object.assign(e, props);
      if (css) e.setAttribute("style", css);
      return e;
    };

    const root = el("div", {}, "display:flex;flex-direction:column;height:100vh;width:100vw;font:13px sans-serif;background:#fff;");

    const bar = el("div", {}, "padding:6px;display:flex;gap:8px;align-items:center;border-bottom:1px solid #ccc;flex:0 0 auto;background:#fff;");

    const styleEl = el("style");
    styleEl.textContent = "button { border:1px solid #888; background:#f4f4f4; padding:3px 10px; border-radius:4px; color:#222; } button:hover:not([disabled]) { background:#e8e8e8; border-color:#666; } button:active:not([disabled]) { background:#dcdcdc; } button[disabled] { color:#999; border-color:#ccc; background:#f9f9f9; } input[type=number] { border:1px solid #888; background:#fff; padding:2px 4px; border-radius:4px; color:#222; } input[type=number]:focus { border-color:#06c; outline:none; }";
    doc.documentElement.appendChild(styleEl);

    const pageInput = el("input", { type: "number", min: "1", value: String(args.startPage || 1) }, "width:60px;");
    const fmtBtn = el("button", { textContent: "PNG" }, "width:60px;");
    fmtBtn.dataset.value = "png";
    fmtBtn.addEventListener("click", function () {
      const next = fmtBtn.dataset.value === "png" ? "jpg" : "png";
      fmtBtn.dataset.value = next;
      fmtBtn.textContent = next.toUpperCase();
    });
    const fmtSel = { get value() { return fmtBtn.dataset.value; }, set value(v) { fmtBtn.dataset.value = v; fmtBtn.textContent = v.toUpperCase(); } };
    const dpiInput = el("input", { type: "number", min: "72", value: "300" }, "width:70px;");
    const renderBtn = el("button", { textContent: "Load page" });
    const zoomOutBtn = el("button", { textContent: "−" }, "width:28px;");
    const zoomInBtn = el("button", { textContent: "+" }, "width:28px;");
    const zoomLabel = el("span", { textContent: "100%" }, "font-size:12px;min-width:42px;text-align:center;");
    const exportBtn = el("button", { textContent: "Export selection", disabled: true });

    bar.appendChild(el("label", { textContent: "Page:" }));
    bar.appendChild(pageInput);
    bar.appendChild(el("label", { textContent: "Format:" }));
    bar.appendChild(fmtBtn);
    bar.appendChild(el("label", { textContent: "DPI:" }));
    bar.appendChild(dpiInput);
    bar.appendChild(renderBtn);
    bar.appendChild(el("span", { textContent: "⚠ Reload the page if you changed the DPI." },
      "color:#b35900;font-size:12px;margin-left:6px;"));
    bar.appendChild(el("span", {}, "flex:1;"));
    bar.appendChild(zoomOutBtn);
    bar.appendChild(zoomLabel);
    bar.appendChild(zoomInBtn);
    bar.appendChild(exportBtn);

    const stage = el("div", {}, "flex:1;overflow:auto;background:#444;position:relative;");
    const canvas = el("canvas", {}, "display:block;cursor:crosshair;margin:auto;");
    const rectEl = el("div", {}, "position:absolute;border:2px solid #06f;background:rgba(0,120,255,0.15);display:none;cursor:move;");
    const handles = {};
    const HSIZE = 10;
    const handleDefs = [
      ["nw", "nwse-resize", 0, 0],
      ["n",  "ns-resize",   0.5, 0],
      ["ne", "nesw-resize", 1, 0],
      ["e",  "ew-resize",   1, 0.5],
      ["se", "nwse-resize", 1, 1],
      ["s",  "ns-resize",   0.5, 1],
      ["sw", "nesw-resize", 0, 1],
      ["w",  "ew-resize",   0, 0.5]
    ];
    for (const [name, cursor] of handleDefs) {
      const h = el("div", {}, `position:absolute;width:${HSIZE}px;height:${HSIZE}px;background:#fff;border:1px solid #06f;box-sizing:border-box;cursor:${cursor};`);
      h.dataset.handle = name;
      handles[name] = h;
      rectEl.appendChild(h);
    }
    stage.appendChild(canvas);
    stage.appendChild(rectEl);

    const statusEl = el("div", {}, "padding:4px 8px;border-top:1px solid #ccc;color:#333;flex:0 0 auto;display:flex;gap:16px;align-items:center;");
    const statusText = el("span", {}, "flex:1;");
    const sizeText = el("span", {}, "color:#555;font-variant-numeric:tabular-nums;");
    statusEl.appendChild(statusText);
    statusEl.appendChild(sizeText);

    root.appendChild(bar);
    root.appendChild(stage);
    root.appendChild(statusEl);
    doc.documentElement.appendChild(root);
    doc.documentElement.style.background = "#fff";
    doc.documentElement.style.height = "100%";

    const ctx = canvas.getContext("2d");
    function status(m) { statusText.textContent = m; }

    fmtSel.value = Zotero.Prefs.get("extensions.regionExport.format", true) || "png";
    dpiInput.value = Zotero.Prefs.get("extensions.regionExport.dpi", true) || 300;

    let pdfjs = null, pdfDoc = null, viewport = null;
    let sel = null;
    let sx = 0, sy = 0;
    let mode = null;
    let resizeName = null;
    let startSel = null;
    let startMouse = null;

    async function getPdfjs() {
      if (pdfjs) return pdfjs;
      pdfjs = await import(rootURI + "lib/pdf.mjs");
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = rootURI + "lib/pdf.worker.mjs";
      } catch (e) {}
      return pdfjs;
    }

    async function loadDoc() {
      if (pdfDoc) return pdfDoc;
      const item = await Zotero.Items.getAsync(args.itemID);
      const path = await item.getFilePathAsync();
      const data = await IOUtils.read(path);
      const lib = await getPdfjs();
      pdfDoc = await lib.getDocument({ data, useWorkerFetch: false }).promise;
      pageInput.max = pdfDoc.numPages;
      return pdfDoc;
    }

    async function renderPage() {
      status("Loading…");
      try {
        const d = await loadDoc();
        const n = Math.min(Math.max(parseInt(pageInput.value, 10) || 1, 1), d.numPages);
        pageInput.value = n;
        const dpi = parseInt(dpiInput.value, 10) || 300;
        const page = await d.getPage(n);
        viewport = page.getViewport({ scale: dpi / 72 });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const fitRatio = Math.min(1, 860 / viewport.width);
        canvas.dataset.fitRatio = fitRatio;
        canvas.dataset.zoom = 1;
        applyZoom();
        await page.render({ canvasContext: ctx, viewport }).promise;
        sel = null; rectEl.style.display = "none"; exportBtn.disabled = true;
        sizeText.textContent = "";
        status("Page " + n + " at " + dpi + " DPI. Drag to select.");
      } catch (e) {
        status("Error: " + e.message);
      }
    }

    function applyZoom(anchor) {
      const fitRatio = parseFloat(canvas.dataset.fitRatio) || 1;
      const oldRatio = parseFloat(canvas.dataset.ratio) || fitRatio;
      const zoom = parseFloat(canvas.dataset.zoom) || 1;
      const ratio = fitRatio * zoom;
      canvas.dataset.ratio = ratio;
      canvas.style.width = (canvas.width * ratio) + "px";
      canvas.style.height = (canvas.height * ratio) + "px";
      zoomLabel.textContent = Math.round(zoom * 100) + "%";
      if (anchor && oldRatio > 0) {
        // Keep the point under the cursor stationary on screen.
        const scaleChange = ratio / oldRatio;
        const sr = stage.getBoundingClientRect();
        const cursorStageX = anchor.clientX - sr.left + stage.scrollLeft;
        const cursorStageY = anchor.clientY - sr.top + stage.scrollTop;
        stage.scrollLeft = cursorStageX * scaleChange - (anchor.clientX - sr.left);
        stage.scrollTop  = cursorStageY * scaleChange - (anchor.clientY - sr.top);
      }
      if (sel) positionRect();
    }

    function changeZoom(factor, anchor) {
      const cur = parseFloat(canvas.dataset.zoom) || 1;
      let next = cur * factor;
      next = Math.max(0.25, Math.min(8, next));
      canvas.dataset.zoom = next;
      applyZoom(anchor);
    }

    zoomInBtn.addEventListener("click", function () { changeZoom(1.25); });
    zoomOutBtn.addEventListener("click", function () { changeZoom(1 / 1.25); });

    stage.addEventListener("wheel", function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.005);
      changeZoom(factor, { clientX: e.clientX, clientY: e.clientY });
    }, { passive: false });

    function clientToCanvas(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function updateSize() {
      if (!sel || sel.w < 1 || sel.h < 1) { sizeText.textContent = ""; return; }
      const pxW = Math.round(sel.w);
      const pxH = Math.round(sel.h);
      sizeText.textContent = pxW + " × " + pxH + " px";
    }

    function positionRect() {
      if (!sel) return;
      const cr = canvas.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      const ratio = parseFloat(canvas.dataset.ratio) || 1;
      const left = cr.left - sr.left + stage.scrollLeft + sel.x * ratio;
      const top  = cr.top  - sr.top  + stage.scrollTop  + sel.y * ratio;
      const w = sel.w * ratio, h = sel.h * ratio;
      rectEl.style.left = left + "px";
      rectEl.style.top = top + "px";
      rectEl.style.width = w + "px";
      rectEl.style.height = h + "px";
      rectEl.style.display = "block";
      for (const def of handleDefs) {
        const name = def[0], fx = def[2], fy = def[3];
        const hh = handles[name];
        hh.style.left = (fx * w - HSIZE / 2) + "px";
        hh.style.top  = (fy * h - HSIZE / 2) + "px";
      }
      updateSize();
    }

    function normalizeSel(s) {
      let x = s.x, y = s.y, w = s.w, h = s.h;
      if (w < 0) { x += w; w = -w; }
      if (h < 0) { y += h; h = -h; }
      const ratio = parseFloat(canvas.dataset.ratio) || 1;
      const maxW = canvas.width / ratio, maxH = canvas.height / ratio;
      x = Math.max(0, Math.min(x, maxW));
      y = Math.max(0, Math.min(y, maxH));
      w = Math.max(1, Math.min(w, maxW - x));
      h = Math.max(1, Math.min(h, maxH - y));
      return { x: x, y: y, w: w, h: h };
    }

    let panStart = null;

    stage.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    stage.addEventListener("mousedown", function (e) {
      if (e.button === 2) {
        panStart = {
          x: e.clientX, y: e.clientY,
          scrollLeft: stage.scrollLeft, scrollTop: stage.scrollTop
        };
        stage.style.cursor = "grabbing";
        canvas.style.cursor = "grabbing";
        rectEl.style.cursor = "grabbing";
        e.preventDefault();
      }
    });

    canvas.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      if (!viewport) return;
      const p = clientToCanvas(e);
      const ratio = parseFloat(canvas.dataset.ratio) || 1;
      mode = "draw";
      sx = p.x / ratio; sy = p.y / ratio;
      sel = { x: sx, y: sy, w: 0, h: 0 };
      positionRect();
      e.preventDefault();
    });

    rectEl.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      if (!sel) return;
      const handle = e.target && e.target.dataset && e.target.dataset.handle;
      startSel = { x: sel.x, y: sel.y, w: sel.w, h: sel.h };
      startMouse = { x: e.clientX, y: e.clientY };
      if (handle) { mode = "resize"; resizeName = handle; }
      else { mode = "move"; }
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener("mousemove", function (e) {
      if (panStart) {
        stage.scrollLeft = panStart.scrollLeft - (e.clientX - panStart.x);
        stage.scrollTop  = panStart.scrollTop  - (e.clientY - panStart.y);
        return;
      }
      if (!mode) return;
      const ratio = parseFloat(canvas.dataset.ratio) || 1;
      if (mode === "draw") {
        const p = clientToCanvas(e);
        const cx = p.x / ratio, cy = p.y / ratio;
        sel = normalizeSel({ x: sx, y: sy, w: cx - sx, h: cy - sy });
        positionRect();
      } else if (mode === "move") {
        const dx = (e.clientX - startMouse.x) / ratio;
        const dy = (e.clientY - startMouse.y) / ratio;
        sel = normalizeSel({ x: startSel.x + dx, y: startSel.y + dy, w: startSel.w, h: startSel.h });
        positionRect();
      } else if (mode === "resize") {
        const dx = (e.clientX - startMouse.x) / ratio;
        const dy = (e.clientY - startMouse.y) / ratio;
        let x = startSel.x, y = startSel.y, w = startSel.w, h = startSel.h;
        if (resizeName.indexOf("n") !== -1) { y += dy; h -= dy; }
        if (resizeName.indexOf("s") !== -1) { h += dy; }
        if (resizeName.indexOf("w") !== -1) { x += dx; w -= dx; }
        if (resizeName.indexOf("e") !== -1) { w += dx; }
        sel = normalizeSel({ x: x, y: y, w: w, h: h });
        positionRect();
      }
    });

    window.addEventListener("mouseup", function (e) {
      if (panStart && e.button === 2) {
        panStart = null;
        stage.style.cursor = "";
        canvas.style.cursor = "crosshair";
        rectEl.style.cursor = "move";
        return;
      }
      if (!mode) return;
      if (e.button !== 0) return;
      mode = null; resizeName = null;
      if (sel && sel.w > 4 && sel.h > 4) exportBtn.disabled = false;
      else exportBtn.disabled = true;
    });

    renderBtn.addEventListener("click", renderPage);

    exportBtn.addEventListener("click", async () => {
      if (!sel) return;
      const fmt = fmtSel.value;
      const dpi = parseInt(dpiInput.value, 10) || 300;
      const crop = doc.createElementNS(NS, "canvas");
      crop.width = Math.round(sel.w); crop.height = Math.round(sel.h);
      crop.getContext("2d").drawImage(canvas,
        Math.round(sel.x), Math.round(sel.y), Math.round(sel.w), Math.round(sel.h),
        0, 0, crop.width, crop.height);

      const mod = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");
      const fp = new mod.FilePicker();
      fp.init(window, "Save image", fp.modeSave);
      fp.appendFilter(fmt.toUpperCase(), "*." + fmt);
      fp.defaultExtension = fmt;
      fp.defaultString = "region." + fmt;
      const lastDir = Zotero.Prefs.get("extensions.regionExport.saveDir", true);
      if (lastDir) fp.displayDirectory = lastDir;
      const rv = await fp.show();
      if (rv !== fp.returnOK && rv !== fp.returnReplace) return;
      const savePath = fp.file;

      const mime = fmt === "jpg" ? "image/jpeg" : "image/png";
      const blob = await new Promise((res) => crop.toBlob(res, mime, fmt === "jpg" ? 0.95 : undefined));
      const buf = new Uint8Array(await blob.arrayBuffer());
      await IOUtils.write(savePath, buf);

      Zotero.Prefs.set("extensions.regionExport.format", fmt, true);
      Zotero.Prefs.set("extensions.regionExport.dpi", dpi, true);
      Zotero.Prefs.set("extensions.regionExport.saveDir", savePath.replace(/[^/\\]+$/, ""), true);
      status("Saved: " + savePath);
    });

    renderPage();
  }
};