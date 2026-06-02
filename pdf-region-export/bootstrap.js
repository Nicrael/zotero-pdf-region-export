var RE = {};
var chromeHandle;

function startup({ id, version, rootURI }) {
  RE.rootURI = rootURI;
  RE.pluginID = id;

  var aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"]
    .getService(Ci.amIAddonManagerStartup);
  var manifestURI = Services.io.newURI(rootURI + "manifest.json");
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ["content", "pdf-region-export", "chrome/content/"]
  ]);

  RE.openSelector = function (reader) {
    const win = Zotero.getMainWindow();
    let startPage = 1;
    try {
      const r = reader._iframeWindow.wrappedJSObject._reader;
      const idx = r._state.primaryViewState.pageIndex
              ?? r._primaryView._pageIndex;
      if (Number.isInteger(idx)) startPage = idx + 1;
    } catch (e) {}
    const args = {
      rootURI: RE.rootURI,
      itemID: reader.itemID,
      startPage,
      Zotero,
      result: null
    };
    win.openDialog(
      "chrome://pdf-region-export/content/select-window.xhtml",
      "region-export",
      "chrome,centerscreen,resizable,width=" + (win.screen.availWidth || 1400) +
        ",height=" + (win.screen.availHeight || 900),
      args
    );
  };

  RE.handler = (event) => {
    const { reader, append } = event;
    if (reader.type !== "pdf") return;
    append({
      label: "Export region as image…",
      onCommand: () => RE.openSelector(reader)
    });
  };

  // Resolve the citation key for the bibliographic (parent) item behind a
  // reader. Prefers the Better BibTeX citekey, falls back to the Zotero key.
  RE.getCiteKey = function (reader) {
    try {
      const att = Zotero.Items.get(reader.itemID);
      const targetID = (att && att.parentItemID) ? att.parentItemID : reader.itemID;
      try {
        const KM = Zotero.BetterBibTeX && Zotero.BetterBibTeX.KeyManager;
        if (KM && typeof KM.get === "function") {
          const k = KM.get(targetID);
          if (k && k.citationKey) return k.citationKey;
        }
      } catch (e) {}
      const target = Zotero.Items.get(targetID);
      return (target && target.key) ? target.key : "";
    } catch (e) {
      return "";
    }
  };

  // Build the LaTeX citation string from the selection popup's annotation and
  // copy it to the clipboard. Returns true on success.
  RE.copyCite = function (reader, annotation) {
    try {
      // Collapse PDF line-break whitespace into single spaces so the quote is
      // one clean line (a blank line would also break a LaTeX argument).
      const text = (annotation && annotation.text ? String(annotation.text) : "")
        .replace(/\s+/g, " ").trim();
      let page = "";
      if (annotation) {
        if (annotation.pageLabel) {
          page = String(annotation.pageLabel);
        } else if (annotation.position && Number.isInteger(annotation.position.pageIndex)) {
          page = String(annotation.position.pageIndex + 1);
        }
      }
      const key = RE.getCiteKey(reader);
      let tpl = "";
      try { tpl = Zotero.Prefs.get("extensions.regionExport.citeTemplate", true); } catch (e) {}
      if (!tpl) tpl = "\\zquote{%text%}{\\autocite[%page%]{%key%}}";
      // Use a function replacer so `$` in the text/key isn't treated as a
      // special replacement pattern.
      const map = { "%key%": key, "%page%": page, "%text%": text };
      const out = tpl.replace(/%key%|%page%|%text%/g, (m) => map[m]);
      Cc["@mozilla.org/widget/clipboardhelper;1"]
        .getService(Ci.nsIClipboardHelper)
        .copyString(out);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Inject a "LaTeX cite" button into the text-selection popup.
  RE.selectionPopupHandler = (event) => {
    const { reader, doc, params, append } = event;
    if (reader.type !== "pdf") return;
    const annotation = params && params.annotation;
    if (!annotation) return;
    // Lift our custom section to the top of the selection popup (the API
    // otherwise renders plugin content last). The popup is a column flexbox,
    // so a one-time `order: -1` rule does it without fighting React.
    try {
      if (doc && doc.head && !doc.getElementById("re-cite-style")) {
        const style = doc.createElement("style");
        style.id = "re-cite-style";
        style.textContent = ".selection-popup .custom-sections{order:-1;padding-top:0}"
          + ".selection-popup .custom-sections .section{border-top:0;padding:0 0 3px}";
        doc.head.appendChild(style);
      }
    } catch (e) {}
    const label = "LaTeX cite";
    const btn = doc.createElement("button");
    btn.textContent = label;
    btn.title = "Copy as LaTeX citation";
    btn.style.cssText = "margin:0 2px;padding:2px 8px;cursor:pointer;border:1px solid #888;background:#f4f4f4;border-radius:4px;color:#222;font:inherit;font-size:12px;white-space:nowrap;transition:background 0.1s,border-color 0.1s;";
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#e0e0e0";
      btn.style.borderColor = "#555";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "#f4f4f4";
      btn.style.borderColor = "#888";
    });
    btn.addEventListener("click", () => {
      const ok = RE.copyCite(reader, annotation);
      btn.textContent = ok ? "Copied!" : "Failed";
      btn.disabled = !ok;
      setTimeout(() => { btn.textContent = label; btn.disabled = false; }, 1200);
    });
    append(btn);
  };

  RE.toolbarHandler = (event) => {
    const { reader, doc, append } = event;
    if (reader.type !== "pdf") return;
    const btn = doc.createElement("button");
    btn.textContent = "Export region";
    btn.title = "Export region as image";
    btn.style.cssText = "margin:0 4px;padding:3px 10px;cursor:pointer;border:1px solid #888;background:#f4f4f4;border-radius:4px;color:#222;font:inherit;transition:background 0.1s,border-color 0.1s;";
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#e0e0e0";
      btn.style.borderColor = "#555";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "#f4f4f4";
      btn.style.borderColor = "#888";
    });
    btn.addEventListener("mousedown", () => {
      btn.style.background = "#d0d0d0";
    });
    btn.addEventListener("mouseup", () => {
      btn.style.background = "#e0e0e0";
    });
    btn.addEventListener("click", () => RE.openSelector(reader));
    append(btn);
  };

  Zotero.Reader.registerEventListener("createViewContextMenu", RE.handler, RE.pluginID);
  Zotero.Reader.registerEventListener("renderToolbar", RE.toolbarHandler, RE.pluginID);
  Zotero.Reader.registerEventListener("renderTextSelectionPopup", RE.selectionPopupHandler, RE.pluginID);
}

function shutdown() {
  try {
    Zotero.Reader.unregisterEventListener("createViewContextMenu", RE.handler);
    Zotero.Reader.unregisterEventListener("renderToolbar", RE.toolbarHandler);
    Zotero.Reader.unregisterEventListener("renderTextSelectionPopup", RE.selectionPopupHandler);
  } catch (e) {}
  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }
  RE = {};
}

function install() {}
function uninstall() {}
function onMainWindowLoad() {}
function onMainWindowUnload() {}