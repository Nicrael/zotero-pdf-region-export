# PDF Region Export

A Zotero 7–9 plugin that exports a selected region of a PDF as a high-resolution PNG or JPG image.

## Features

- Right-click in the PDF reader → "Export region as image…", or use the toolbar button
- Auto-loads the page you were viewing
- Drag to select, resize with handles, drag the body to reposition
- Zoom with `+`/`−` buttons, Cmd/Ctrl+wheel, or trackpad pinch (zoom-to-cursor)
- Right-click drag to pan
- Live size readout in pixels
- Exports at chosen DPI (default 300) to PNG or JPG

## Installation

1. Download the latest `.xpi` from the [Releases page](../../releases).
2. In Zotero: Tools → Plugins → gear icon → **Install Plugin From File**.
3. Select the `.xpi`. Open any PDF and right-click in the page.

## Requirements

- Zotero 7, 8, or 9 (tested on 9)
- Works on macOS, Windows, and Linux

## License

MIT (see LICENSE).

PDF.js (Apache 2.0) is bundled in `lib/` — see `lib/LICENSE-pdfjs` for its terms.
