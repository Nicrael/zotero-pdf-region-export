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
}

function shutdown() {
  try {
    Zotero.Reader.unregisterEventListener("createViewContextMenu", RE.handler);
    Zotero.Reader.unregisterEventListener("renderToolbar", RE.toolbarHandler);
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