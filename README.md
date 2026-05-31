# PDF Region Export

A Zotero 7–9 plugin that exports a selected region of a PDF as a high-resolution PNG or JPG image.

## Installation

1. Download the latest `.xpi` from the [Releases page](https://github.com/Nicrael/zotero-pdf-region-export/releases/latest).
2. In Zotero: Tools → Plugins → gear icon → **Install Plugin From File**.
3. Select the downloaded `.xpi`. Open any PDF and right-click in the page or use the toolbar button.

## Usage

Open any PDF in Zotero's reader. Trigger the selector window with either:

- **Right-click** anywhere on the PDF page → **Export region as image…**
- **Toolbar button** — click **Export region** in the reader toolbar

The window opens on the page you were already viewing.

---

## Selector window

### Toolbar controls

| Control | Description |
|---|---|
| **Page** | Page number to view. Type a number or use the arrows and click **Load page**. |
| **Format** | Toggle between **PNG** and **JPG** output. |
| **DPI** | Render resolution. Default is 300 DPI. Higher values produce larger, sharper exports. **Reload the page** after changing DPI. |
| **Load page** | Renders the selected page at the chosen DPI. |
| **Ratio** | Aspect ratio lock for the selection (see below). |
| **−  / +** | Zoom out / zoom in the canvas view. |
| **Export selection** | Saves the selected region to disk (enabled once a selection exists). |

### Aspect ratio lock

The **Ratio** buttons constrain the shape of your selection:

| Button | Behaviour |
|---|---|
| **Free** | No constraint — drag any rectangle freely. |
| **1:1** | Forces a square selection. |
| **4:3** | Standard photo / presentation ratio. |
| **16:9** | Widescreen ratio. |

The active ratio is highlighted in blue. The lock is applied both when **drawing** a new selection and when **resizing from a corner handle**.

### Selecting a region

- **Draw** — click and drag on the canvas to create a new selection.
- **Move** — click and drag inside the selection box to reposition it.
- **Resize** — drag any of the 8 handles around the selection border. Corner handles respect the aspect ratio lock.
- The pixel dimensions of the current selection are shown in the status bar at the bottom right.

### Navigating the canvas

| Action | Result |
|---|---|
| `+` / `−` buttons | Zoom in / out |
| Ctrl/Cmd + scroll wheel | Zoom to cursor position |
| Right-click drag | Pan the canvas |

### Exporting

Click **Export selection** to open a save dialog. The default filename is built from the item's metadata:

```
LastName-year-pageXX-fig.png
```

For example: `Smith-2023-page05-fig.png`.

The last used folder and format are remembered across sessions.

---

## Requirements

- Zotero 7, 8, or 9 (tested on 9)
- macOS, Windows, or Linux (tested on macOS)

## License

MIT — see [LICENSE](LICENSE).

PDF.js (Apache 2.0) is bundled in `lib/` — see `lib/LICENSE-pdfjs` for its terms.
