/* =========================================================================
   05-POMO-DOC.JS (v16.0 PURE DESKTOP EDITION)
   POMODOC FORGE MODULE: TRUE-KERNING PDF-TO-BOOK (.PBOOK / .TXT) CONVERTER,
   CHAPTER SPLITTER, MULTI-PDF MERGER, PAGE INSERTER (RULED/GRID/BLANK/FILE),
   90° ROTATOR, PHOTO-TO-PDF BUILDER, PNG ZIP EXPORTER & VISUAL THUMBNAILS
   ========================================================================= */
(function() {
    window.haptic = window.haptic || function() {};
    window.escapeJsStr = window.escapeJsStr || function(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/\r?\n/g, ' ');
    };

    let activeILovePdfBookId = null;

    // Helpers to bridge cleanly with 04-pomo-reader.js
    function getActiveBook() {
        return window.PomoReaderCore ? window.PomoReaderCore.getActiveBook() : null;
    }

    document.getElementById('shelf-open-ilovepdf-btn')?.addEventListener('click', () => {
        const activeBook = getActiveBook();
        window.openILovePdfStudioModal(activeBook?.id || window.readerBooks?.[0]?.id || null);
    });
    document.getElementById('reader-open-ilovepdf-btn')?.addEventListener('click', () => {
        const activeBook = getActiveBook();
        window.openILovePdfStudioModal(activeBook?.id || null);
    });
    document.getElementById('close-ilovepdf-modal-btn')?.addEventListener('click', () => {
        document.getElementById('ilovepdf-studio-modal')?.classList.add('hidden');
    });

    /* =========================================================================
       1. POMODOC FORGE MODAL & VISUAL PAGE THUMBNAIL INSPECTOR
       ========================================================================= */
    window.openILovePdfStudioModal = function(bookId = null) {
        const sortedBySeq = [...(window.readerBooks || [])].sort((a, b) => (a.readSeq || 999) - (b.readSeq || 999));
        const activeBook = getActiveBook();
        activeILovePdfBookId = bookId || activeBook?.id || sortedBySeq[0]?.id || null;
        const modal = document.getElementById('ilovepdf-studio-modal');
        const body = document.getElementById('ilovepdf-studio-body');
        if (!modal || !body) return;

        const targetBook = (window.readerBooks || []).find(b => b.id === activeILovePdfBookId) || null;
        const curP = targetBook?.currentPage || 1;
        const totP = targetBook?.totalPages || 1;
        const defaultEndP = Math.min(totP, curP + 20);

        body.innerHTML = `
            <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <span class="text-lg">📘</span>
                    <span class="text-xs font-extrabold uppercase text-slate-300">Target Book (Sequence Order):</span>
                </div>
                <select id="ilovepdf-book-select" class="flex-1 sm:max-w-md bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white">
                    ${sortedBySeq.length ? sortedBySeq.map(b => `<option value="${escapeHtml(b.id)}" ${b.id === activeILovePdfBookId ? 'selected' : ''}>#${b.readSeq || 1} [${escapeHtml(b.shelfName || 'Shelf')}] ${escapeHtml(b.title)} (${b.totalPages}p • ${b.format.toUpperCase()})</option>`).join('') : '<option value="">No books imported yet</option>'}
                </select>
            </div>

            <!-- 1. TRUE-KERNING PDF-TO-STRUCTURED-BOOK (.PBOOK) & CLEAN-FORMAT TXT CONVERTER -->
            <div class="bg-gradient-to-br from-emerald-950/50 via-slate-950 to-slate-950 border border-emerald-500/50 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
                <div>
                    <span class="text-[9px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">📖 PomoDoc Forge True-Kerning Typography Engine (Zero Word-Splitting • Auto-Chapter Detection • Studio Bridge Index)</span>
                    <h4 class="text-sm font-extrabold text-white mt-1">1. Convert PDF to True-Format Book (.pbook) or Clean-Format Text (.txt)</h4>
                    <p class="text-[11px] text-slate-300 mt-0.5">Preserves 1:1 Page Numbers (1 to ${totP}), eliminates split words, de-hyphenates wrapped lines, auto-extracts Chapters into your ☰ Contents Drawer, and indexes all pages for your external Studio Bridge!</p>
                </div>
                <div class="flex flex-wrap items-center gap-2 pt-1">
                    <label class="flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                        <input type="checkbox" id="pbook-keep-diagrams-chk" checked class="accent-emerald-500">
                        <span>🖼️ Embed Verified Charts & Figures</span>
                    </label>
                    <button type="button" onclick="window.convertPdfToStructuredBook('replace')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow active:scale-95">
                        🔄 Convert in Same Book (Keep Highlights & Auto-Detect Chapters)
                    </button>
                    <button type="button" onclick="window.convertPdfToStructuredBook('add')" class="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow active:scale-95">
                        ➕ Add as New Book on Shelf
                    </button>
                    <button type="button" onclick="window.convertPdfToStructuredBook('txt')" class="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs active:scale-95">
                        ⬇️ Export Clean-Format .TXT
                    </button>
                </div>
                <div id="pbook-convert-status" class="hidden text-xs font-mono font-bold text-emerald-400 bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/30"></div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5">
                    <div>
                        <span class="text-xs font-extrabold text-rose-400">✂️ 2. Split / Extract Chapter Into New Shelf Book</span>
                        <p class="text-[11px] text-slate-400 mt-0.5">Extract a page range into a lightweight book on your #1 Top Wooden Shelf.</p>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="text-[9px] font-bold uppercase text-slate-400">From Page</label><input type="number" id="ilove-split-start" value="${curP}" min="1" max="${totP}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-mono text-white text-center"></div>
                        <div><label class="text-[9px] font-bold uppercase text-slate-400">To Page</label><input type="number" id="ilove-split-end" value="${defaultEndP}" min="1" max="${totP}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-mono text-white text-center"></div>
                    </div>
                    <input type="text" id="ilove-split-title" placeholder="New Chapter Book Name" value="${targetBook ? `${escapeHtml(targetBook.title)} (p.${curP}-${defaultEndP})` : ''}" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white">
                    <div class="flex gap-2">
                        <button type="button" onclick="window.runILovePdfSplit(true)" class="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-2 rounded-xl text-xs shadow">🪵 Extract to #1 Shelf</button>
                        <button type="button" onclick="window.runILovePdfSplit(false)" class="bg-slate-800 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs">⬇️ Download</button>
                    </div>
                </div>

                <div class="bg-slate-950 border border-amber-500/40 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5">
                    <div>
                        <span class="text-xs font-extrabold text-amber-400">📄 3. Add Page from Local File, Blank Page, Rotate or Delete</span>
                        <p class="text-[11px] text-slate-400 mt-0.5">Insert external PDF/Image pages or a Blank/Ruled Note Canvas right after Target Page #:</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold text-slate-300">After Page #:</span>
                        <input type="number" id="ilove-pageop-num" value="${curP}" min="1" max="${totP}" class="w-16 bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs font-mono text-white text-center">
                        <select id="ilove-blank-style-sel" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] font-bold text-emerald-300">
                            <option value="ruled">📝 Ruled / Lined Note Page</option>
                            <option value="blank">⬜ Pure Blank Canvas Page</option>
                            <option value="grid">⊞ Dot-Grid Diagram Page</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-1.5">
                        <button type="button" onclick="window.runILovePdfPageOp('insertBlank')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 rounded-xl text-[11px] shadow">➕ Add Blank/Note Page</button>
                        <button type="button" onclick="document.getElementById('ilovepdf-insert-page-file-input').click()" class="bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2 rounded-xl text-[11px] shadow">📂 Add Page from File</button>
                    </div>
                    <div class="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800">
                        <button type="button" onclick="window.runILovePdfPageOp('rotate90')" class="bg-amber-600/25 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 font-extrabold py-1.5 rounded-xl text-[11px]">🔄 Rotate Page 90°</button>
                        <button type="button" onclick="window.runILovePdfPageOp('delete')" class="bg-red-600/25 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 font-extrabold py-1.5 rounded-xl text-[11px]">🗑️ Delete Page</button>
                    </div>
                </div>

                <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5">
                    <div>
                        <span class="text-xs font-extrabold text-blue-400">🔗 4. Merge Multiple PDFs Into One Book</span>
                        <p class="text-[11px] text-slate-400 mt-0.5">Combine textbook chapters + handwritten notes + PYQ PDFs into one book on your shelf.</p>
                    </div>
                    <input type="text" id="ilove-merge-title" placeholder="Merged Book Title (e.g. Complete Anatomy & Physiology Master)" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                    <button type="button" onclick="document.getElementById('ilovepdf-merge-files-input').click()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 rounded-xl text-xs shadow">📂 Select 2+ PDF Files to Merge & Add to Shelf</button>
                </div>

                <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5">
                    <div>
                        <span class="text-xs font-extrabold text-purple-400">🖼️ 5. Images-to-PDF & PDF-to-Images (ZIP)</span>
                        <p class="text-[11px] text-slate-400 mt-0.5">Turn photos of handwritten notes into a Shelf Book, or export pages as a PNG ZIP.</p>
                    </div>
                    <input type="text" id="ilove-img2pdf-title" placeholder="New Photo-Notes Book Title..." class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white">
                    <div class="flex gap-2">
                        <button type="button" onclick="document.getElementById('ilovepdf-images-input').click()" class="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-2 rounded-xl text-xs shadow">📸 Photos ➔ Shelf PDF</button>
                        <button type="button" onclick="window.exportPdfRangeAsImagesZip()" class="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs">📦 PDF ➔ PNG ZIP</button>
                    </div>
                </div>
            </div>

            <div class="bg-slate-950 border border-cyan-500/40 rounded-2xl p-3.5 flex flex-col gap-2.5">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-xs font-extrabold text-cyan-300">🖼️ 6. Visual Page Thumbnail Inspector (Click to Rotate 90° or Delete Page)</span>
                        <p class="text-[11px] text-slate-400">Preview actual PDF pages visually before rotating or deleting them.</p>
                    </div>
                    <button type="button" onclick="window.renderILovePdfVisualThumbGrid()" class="bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs shadow">🔍 Load Page Thumbnails</button>
                </div>
                <div id="ilovepdf-thumb-grid-box" class="grid grid-cols-4 gap-2.5 max-h-64 native-scroll"></div>
            </div>
        `;

        document.getElementById('ilovepdf-book-select')?.addEventListener('change', (e) => {
            window.openILovePdfStudioModal(e.target.value);
        });
        modal.classList.remove('hidden');
    };

    window.renderILovePdfVisualThumbGrid = async function() {
        const grid = document.getElementById('ilovepdf-thumb-grid-box');
        const selId = document.getElementById('ilovepdf-book-select')?.value || activeILovePdfBookId;
        const b = (window.readerBooks || []).find(x => x.id === selId);
        if (!grid || !b) return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored?.originalBytes || typeof pdfjsLib === 'undefined') {
            grid.innerHTML = `<p class="text-xs text-red-400 col-span-4">Requires a PDF binary book.</p>`;
            return;
        }
        grid.innerHTML = `<p class="text-xs text-slate-400 col-span-4">⏳ Rendering visual page thumbnails...</p>`;
        let pdf = null;
        try {
            pdf = await pdfjsLib.getDocument({ data: stored.originalBytes.slice(0) }).promise;
            grid.innerHTML = '';
            const maxPreview = Math.min(pdf.numPages, 16);
            for (let p = 1; p <= maxPreview; p++) {
                const page = await pdf.getPage(p);
                const vp = page.getViewport({ scale: 0.3 });
                const c = document.createElement('canvas');
                c.width = vp.width; c.height = vp.height;
                await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
                const card = document.createElement('div');
                card.className = "bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-col items-center gap-1.5";
                card.innerHTML = `
                    <img src="${c.toDataURL('image/jpeg', 0.7)}" class="h-28 object-contain rounded border border-slate-700">
                    <span class="text-[10px] font-mono font-bold text-white">Page ${p}</span>
                    <div class="flex gap-1 w-full">
                        <button type="button" onclick="document.getElementById('ilove-pageop-num').value=${p}; window.runILovePdfPageOp('rotate90');" class="flex-1 bg-amber-600/30 text-amber-300 text-[9px] font-bold py-1 rounded">🔄 90°</button>
                        <button type="button" onclick="document.getElementById('ilove-pageop-num').value=${p}; window.runILovePdfPageOp('delete');" class="flex-1 bg-red-600/30 text-red-300 text-[9px] font-bold py-1 rounded">🗑️ Del</button>
                    </div>
                `;
                grid.appendChild(card);
            }
        } catch (e) {
            grid.innerHTML = `<p class="text-xs text-red-400 col-span-4">Could not render page thumbnails.</p>`;
        } finally {
            if (pdf) {
                try { await pdf.destroy(); } catch (err) {}
            }
        }
    };

    /* =========================================================================
       2. TRUE-KERNING PDF-TO-BOOK (.PBOOK / .TXT) CONVERTER ENGINE
       ========================================================================= */
    window.convertPdfToStructuredBook = async function(actionMode = 'replace') {
        const activeBook = getActiveBook();
        const b = (window.readerBooks || []).find(x => x.id === activeILovePdfBookId) || activeBook;
        if (!b) { showToast("Select a book first!", true); return; }
        const stored = await idbGet('bookFiles', b.id);
        if (!stored || (!stored.originalBytes && !stored.structuredPages)) {
            showToast("Book file binary not found in local storage.", true);
            return;
        }

        const statusEl = document.getElementById('pbook-convert-status');
        const keepDiagrams = document.getElementById('pbook-keep-diagrams-chk')?.checked !== false;
        if (statusEl) {
            statusEl.classList.remove('hidden');
            statusEl.textContent = `⏳ Running True-Kerning Typography & Auto-Chapter Engine across ${b.totalPages} pages...`;
        }

        let pdf = null;
        try {
            let structuredPages = [];
            let extractedPlain = [];
            const autoChapters = [];
            const seenChapKeys = new Set();

            if (stored.originalBytes && typeof pdfjsLib !== 'undefined') {
                pdf = await pdfjsLib.getDocument({ data: stored.originalBytes.slice(0) }).promise;
                const numPages = pdf.numPages || b.totalPages;

                for (let p = 1; p <= numPages; p++) {
                    if (p % 5 === 0) {
                        if (statusEl) statusEl.textContent = `⏳ Reconstructing Page ${p} / ${numPages} (Zero Word-Splitting & Natural Paragraphs)...`;
                        await new Promise(r => setTimeout(r, 0));
                    }
                    const page = await pdf.getPage(p);
                    const unitVp = page.getViewport({ scale: 1.0 });
                    const tc = await page.getTextContent();

                    let hasEmbeddedGraphicOps = false;
                    if (keepDiagrams && page.getOperatorList) {
                        try {
                            const opList = await page.getOperatorList();
                            const OPS = pdfjsLib.OPS || {};
                            let imgOps = 0, pathOps = 0;
                            (opList.fnArray || []).forEach(fn => {
                                if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageMaskXObject) imgOps++;
                                if (fn === OPS.constructPath || fn === OPS.stroke || fn === OPS.fill) pathOps++;
                            });
                            hasEmbeddedGraphicOps = (imgOps > 0 || pathOps > 45);
                        } catch (e) {}
                    }

                    const rawItems = [];
                    let totalFh = 0;
                    tc.items.forEach(it => {
                        if (!it.str || !it.str.trim()) return;
                        const m = pdfjsLib.Util.transform(unitVp.transform, it.transform);
                        const fh = Math.hypot(m[2], m[3]);
                        const fhNorm = fh / unitVp.height;
                        const w = ((it.width || (it.str.length * fh * 0.5)) * unitVp.scale) / unitVp.width;
                        totalFh += fh;
                        rawItems.push({
                            str: it.str,
                            x: m[4] / unitVp.width,
                            y: m[5] / unitVp.height,
                            w,
                            fh,
                            fhNorm
                        });
                    });

                    const avgFh = rawItems.length ? (totalFh / rawItems.length) : 12;
                    rawItems.sort((a, b) => (Math.abs(a.y - b.y) < 0.009 ? a.x - b.x : a.y - b.y));

                    const lines = [];
                    rawItems.forEach(item => {
                        const last = lines[lines.length - 1];
                        const sameLineTol = Math.max(0.008, item.fhNorm * 0.65);
                        if (last && Math.abs(last.y - item.y) < sameLineTol) {
                            const xGap = item.x - last.xEnd;
                            const wordSpaceThreshold = Math.max(0.0035, (item.fh / unitVp.width) * 0.18);
                            const joiner = xGap > 0.12 ? '   ' : (xGap >= wordSpaceThreshold ? ' ' : '');
                            last.text += joiner + item.str;
                            last.xEnd = Math.max(last.xEnd, item.x + item.w);
                            last.maxFh = Math.max(last.maxFh, item.fh);
                        } else {
                            lines.push({
                                y: item.y,
                                xStart: item.x,
                                xEnd: item.x + item.w,
                                text: item.str.replace(/\s+/g, ' ').trim(),
                                maxFh: item.fh
                            });
                        }
                    });

                    const yGaps = [];
                    for (let i = 1; i < lines.length; i++) {
                        const g = lines[i].y - lines[i - 1].y;
                        if (g > 0.005 && g < 0.09) yGaps.push(g);
                    }
                    yGaps.sort((a, b) => a - b);
                    const medianGap = yGaps.length ? yGaps[Math.floor(yGaps.length / 2)] : 0.026;
                    const minMarginX = lines.length ? Math.min(...lines.map(l => l.xStart)) : 0.08;

                    const blocks = [];
                    let curPara = null;
                    const flushPara = () => {
                        if (curPara && curPara.text.trim()) {
                            curPara.text = curPara.text.replace(/\s{2,}/g, ' ').trim();
                            blocks.push(curPara);
                            curPara = null;
                        }
                    };

                    const diagramBands = [];
                    if (keepDiagrams && hasEmbeddedGraphicOps) {
                        if (lines.length === 0) {
                            diagramBands.push({ yStart: 0.06, yEnd: 0.90 });
                        } else {
                            for (let i = 0; i < lines.length - 1; i++) {
                                const gap = lines[i + 1].y - lines[i].y;
                                if (gap > 0.24) {
                                    diagramBands.push({ yStart: lines[i].y + 0.018, yEnd: lines[i + 1].y - 0.018, afterLineIdx: i });
                                }
                            }
                        }
                    }

                    let offCanvas = null;
                    if (diagramBands.length > 0) {
                        try {
                            const renderVp = page.getViewport({ scale: 1.25 });
                            offCanvas = document.createElement('canvas');
                            offCanvas.width = renderVp.width;
                            offCanvas.height = renderVp.height;
                            await page.render({ canvasContext: offCanvas.getContext('2d'), viewport: renderVp }).promise;
                        } catch (e) { offCanvas = null; }
                    }

                    const cropDiagramBand = (band) => {
                        if (!offCanvas) return null;
                        const sy = Math.max(0, Math.floor(band.yStart * offCanvas.height));
                        const ey = Math.min(offCanvas.height, Math.floor(band.yEnd * offCanvas.height));
                        const sh = ey - sy;
                        if (sh < 50) return null;
                        const cropC = document.createElement('canvas');
                        cropC.width = offCanvas.width;
                        cropC.height = sh;
                        cropC.getContext('2d').drawImage(offCanvas, 0, sy, offCanvas.width, sh, 0, 0, offCanvas.width, sh);
                        return cropC.toDataURL('image/jpeg', 0.82);
                    };

                    if (lines.length === 0 && diagramBands[0]) {
                        const dUrl = cropDiagramBand(diagramBands[0]);
                        if (dUrl) blocks.push({ type: 'diagram', dataUrl: dUrl, caption: `Page ${p} Visual Figure / Chart` });
                    }

                    lines.forEach((ln, idx) => {
                        const t = ln.text.trim();
                        if (!t) return;
                        const prev = idx > 0 ? lines[idx - 1] : null;
                        const yJump = prev ? (ln.y - prev.y) : 0;
                        const centerPos = (ln.xStart + ln.xEnd) / 2;
                        const lineW = ln.xEnd - ln.xStart;
                        const isCentered = Math.abs(centerPos - 0.5) < 0.08 && lineW < 0.68;
                        const indentPct = Math.max(0, Math.round((ln.xStart - minMarginX) * 100));
                        const tocMatch = t.match(/^([0-9IVX]+\.?\s+[A-Za-z].*?)\s*\.{3,}\s*(\d+)$/);
                        const isTocLine = Boolean(tocMatch);

                        const isH1 = ln.maxFh >= avgFh * 1.28 || (/^(chapter|unit|section|part)\s+[0-9ivx]+/i.test(t) && t.length < 95);
                        const isH2 = !isH1 && (ln.maxFh >= avgFh * 1.14 || (/^\d+(\.\d+)*\s+[A-Z]/.test(t) && t.length < 95 && !isTocLine));
                        const isBullet = /^[•▪▸◦❖✦★☆✓✔✗✘\-*]\s+|^\(\d+\)\s+|^[a-z0-9]\)\s+/i.test(t);

                        if (tocMatch) {
                            const chTitle = tocMatch[1].trim();
                            const chPage = Math.max(1, Math.min(numPages, parseInt(tocMatch[2]) || p));
                            const ck = chTitle.toLowerCase().slice(0, 30);
                            if (!seenChapKeys.has(ck)) {
                                seenChapKeys.add(ck);
                                autoChapters.push({ id: 'ch_' + Date.now() + '_' + autoChapters.length, title: chTitle, page: chPage, level: 1 });
                            }
                        }

                        if (isH1) {
                            flushPara();
                            blocks.push({ type: 'h1', text: t, align: isCentered ? 'center' : 'left', indentPct: 0 });
                            const ck = t.toLowerCase().slice(0, 30);
                            if (!seenChapKeys.has(ck) && t.length >= 4 && !/^page\s+\d+/i.test(t)) {
                                seenChapKeys.add(ck);
                                autoChapters.push({ id: 'ch_' + Date.now() + '_' + autoChapters.length, title: t, page: p, level: 1 });
                            }
                        } else if (isH2) {
                            flushPara();
                            blocks.push({ type: 'h2', text: t, align: isCentered ? 'center' : 'left', indentPct: 0 });
                            const ck = t.toLowerCase().slice(0, 30);
                            if (!seenChapKeys.has(ck) && t.length >= 4) {
                                seenChapKeys.add(ck);
                                autoChapters.push({ id: 'ch_' + Date.now() + '_' + autoChapters.length, title: t, page: p, level: 2 });
                            }
                        } else if (isBullet || isTocLine) {
                            flushPara();
                            blocks.push({ type: 'bullet', text: t, align: 'left', indentPct });
                        } else {
                            const prevEndedSentence = prev ? /[.!?:”"']$/.test(prev.text.trim()) : true;
                            const prevLineShort = prev ? ((prev.xEnd - prev.xStart) < 0.52) : false;
                            const isNewParaBreak = !curPara
                                || yJump > medianGap * 1.48
                                || (indentPct >= 4 && prevEndedSentence)
                                || (prevLineShort && prevEndedSentence);

                            if (isNewParaBreak) {
                                flushPara();
                                curPara = { type: 'p', text: t, align: isCentered ? 'center' : 'left', indentPct: isCentered ? 0 : indentPct };
                            } else {
                                if (/[a-z]-\s*$/i.test(curPara.text) && /^[a-z]/.test(t)) {
                                    curPara.text = curPara.text.replace(/-\s*$/, '') + t;
                                } else {
                                    curPara.text += ' ' + t;
                                }
                            }
                        }

                        const midBand = diagramBands.find(d => d.afterLineIdx === idx);
                        if (midBand) {
                            flushPara();
                            const dUrl = cropDiagramBand(midBand);
                            if (dUrl) blocks.push({ type: 'diagram', dataUrl: dUrl, caption: `Page ${p} Visual Chart / Diagram` });
                        }
                    });
                    flushPara();

                    const formattedPageTxt = blocks.map(blk => {
                        if (blk.type === 'h1') return `\n# ${blk.text}\n`;
                        if (blk.type === 'h2') return `\n## ${blk.text}\n`;
                        if (blk.type === 'diagram') return `\n[📊 ${blk.caption || 'Visual Chart / Figure'}]\n`;
                        return blk.text;
                    }).join('\n\n');

                    structuredPages.push({ page: p, blocks, plainText: formattedPageTxt.trim() });
                    extractedPlain.push(formattedPageTxt.trim());
                }
            } else {
                structuredPages = stored.structuredPages || [];
                extractedPlain = stored.extractedPagesText || [];
            }

            if (actionMode === 'txt') {
                const fullTxt = structuredPages.map(sp => `==================== PAGE ${sp.page} ====================\n\n${sp.plainText}`).join('\n\n\n');
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([fullTxt], { type: 'text/plain;charset=utf-8' }));
                a.download = `${b.title}_CleanFormat.txt`;
                a.click();
                if (statusEl) statusEl.textContent = `✅ Exported Clean-Format .TXT (${structuredPages.length} pages)!`;
                showToast("⬇️ Clean-Format .TXT Downloaded!");
                return;
            }

            if (autoChapters.length > 0) {
                autoChapters.sort((a, b) => a.page - b.page);
                b.outline = autoChapters;
            }

            if (actionMode === 'replace') {
                b.format = 'pbook';
                b.totalPages = structuredPages.length;
                b.lastModified = Date.now();
                await idbPut('bookFiles', {
                    id: b.id,
                    originalBytes: stored.originalBytes || null,
                    bakedBytes: null,
                    structuredPages,
                    extractedPagesText: extractedPlain
                });
                window.PomoStudioBridge?.syncBookPageIndexToCloud(b.id, extractedPlain);
                saveReaderMeta();
                renderWoodenShelf();
                if (activeBook && activeBook.id === b.id && window.PomoReaderCore) {
                    window.PomoReaderCore.setStructuredPages(structuredPages);
                    window.PomoReaderCore.setExtractedPages(extractedPlain);
                    await window.PomoReaderCore.buildBookStageAndObserver();
                }
                document.getElementById('ilovepdf-studio-modal').classList.add('hidden');
                showToast(`🔄 Converted "${b.title}" with True-Kerning, ${autoChapters.length} Chapters & Studio Bridge Index!`);
            } else {
                const newBookId = 'pbook_' + Date.now();
                const newBook = {
                    ...JSON.parse(JSON.stringify(b)),
                    id: newBookId,
                    title: `${b.title} [📖 Book-OS]`,
                    fileName: b.fileName.replace(/\.[^/.]+$/, '') + '.pbook',
                    format: 'pbook',
                    totalPages: structuredPages.length,
                    outline: autoChapters.length ? autoChapters : (b.outline || []),
                    lastOpened: Date.now(),
                    lastModified: Date.now()
                };
                if (coverMemoryCache[b.id]) {
                    coverMemoryCache[newBookId] = coverMemoryCache[b.id];
                    await idbPut('bookCovers', { id: newBookId, coverDataUrl: coverMemoryCache[b.id] });
                }
                await idbPut('bookFiles', {
                    id: newBookId,
                    originalBytes: null,
                    bakedBytes: null,
                    structuredPages,
                    extractedPagesText: extractedPlain
                });
                window.readerBooks.unshift(newBook);
                window.PomoStudioBridge?.syncBookPageIndexToCloud(newBookId, extractedPlain);
                saveReaderMeta();
                renderWoodenShelf();
                document.getElementById('ilovepdf-studio-modal').classList.add('hidden');
                showToast(`➕ Added "${newBook.title}" to Wooden Shelf & Studio Bridge!`);
            }
        } catch (err) {
            showToast("Conversion encountered an issue on this PDF.", true);
        } finally {
            if (pdf) {
                try { await pdf.destroy(); } catch (e) {}
            }
        }
    };

    /* =========================================================================
       3. SPLIT, MERGE, INSERT PAGE, ROTATE, DELETE & IMAGE-ZIP OPERATIONS
       ========================================================================= */
    window.runILovePdfSplit = async function(addToShelf = true) {
        const b = (window.readerBooks || []).find(x => x.id === activeILovePdfBookId);
        if (!b || typeof PDFLib === 'undefined') return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored || !stored.originalBytes) { showToast("Requires a PDF binary book.", true); return; }

        const startP = Math.max(1, parseInt(document.getElementById('ilove-split-start')?.value) || 1);
        const endP = Math.min(b.totalPages, Math.max(startP, parseInt(document.getElementById('ilove-split-end')?.value) || startP));
        const customTitle = (document.getElementById('ilove-split-title')?.value || '').trim() || `${b.title} (p.${startP}-${endP})`;

        try {
            showToast(`✂️ Extracting pages ${startP} to ${endP}...`);
            const srcDoc = await PDFLib.PDFDocument.load(stored.originalBytes, { ignoreEncryption: true });
            const newDoc = await PDFLib.PDFDocument.create();
            const indices = [];
            for (let i = startP - 1; i <= endP - 1; i++) indices.push(i);
            const copied = await newDoc.copyPages(srcDoc, indices);
            copied.forEach(p => newDoc.addPage(p));
            const newUint8 = await newDoc.save();

            if (!addToShelf) {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([newUint8], { type: 'application/pdf' }));
                a.download = `${customTitle.replace(/\s+/g, '_')}.pdf`;
                a.click();
                showToast(`⬇️ Downloaded "${customTitle}.pdf"!`);
                return;
            }

            const fileObj = new File([newUint8], `${customTitle}.pdf`, { type: 'application/pdf' });
            const topShelf = window.customShelves?.[0] || { name: b.shelfName || 'Medical Science & Anatomy', category: b.category || 'study' };
            if (window.PomoReaderCore?.importBookFileObject) {
                await window.PomoReaderCore.importBookFileObject(fileObj, 'local', null, { shelfName: topShelf.name, category: topShelf.category, isManual: true });
            }
            renderWoodenShelf();
            document.getElementById('ilovepdf-studio-modal').classList.add('hidden');
            showToast(`✂️ Extracted "${customTitle}" (${indices.length} pages) onto #1 Shelf!`);
        } catch (e) { showToast("PDF Split failed.", true); }
    };

    document.getElementById('ilovepdf-merge-files-input')?.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length < 2 || typeof PDFLib === 'undefined') {
            showToast("Select at least 2 PDF files to merge!", true);
            return;
        }
        const mergeTitle = (document.getElementById('ilove-merge-title')?.value || '').trim() || `Merged_Study_Book_${getLocalTodayString()}`;
        try {
            showToast(`🔗 Merging ${files.length} PDFs...`);
            const mergedDoc = await PDFLib.PDFDocument.create();
            for (const f of files) {
                const buf = await f.arrayBuffer();
                const doc = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
                const copied = await mergedDoc.copyPages(doc, doc.getPageIndices());
                copied.forEach(p => mergedDoc.addPage(p));
            }
            const outBytes = await mergedDoc.save();
            const mergedFile = new File([outBytes], `${mergeTitle}.pdf`, { type: 'application/pdf' });
            const topShelf = window.customShelves?.[0] || { name: 'Medical Science & Anatomy', category: 'study' };
            if (window.PomoReaderCore?.importBookFileObject) {
                await window.PomoReaderCore.importBookFileObject(mergedFile, 'local', null, { shelfName: topShelf.name, category: topShelf.category, isManual: true });
            }
            renderWoodenShelf();
            document.getElementById('ilovepdf-studio-modal').classList.add('hidden');
            showToast(`🔗 Merged ${files.length} PDFs into "${mergeTitle}" on your Shelf!`);
        } catch (err) { showToast("Could not merge selected PDFs.", true); }
        e.target.value = '';
    });

    document.getElementById('ilovepdf-insert-page-file-input')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const b = (window.readerBooks || []).find(x => x.id === activeILovePdfBookId);
        if (!b || typeof PDFLib === 'undefined') return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored || !stored.originalBytes) { showToast("Requires a PDF binary book.", true); return; }

        const targetP = Math.max(1, Math.min(b.totalPages, parseInt(document.getElementById('ilove-pageop-num')?.value) || b.currentPage || 1));
        try {
            showToast(`📂 Inserting "${file.name}" after Page ${targetP}...`);
            const pdfDoc = await PDFLib.PDFDocument.load(stored.originalBytes, { ignoreEncryption: true });
            const buf = await file.arrayBuffer();
            let insertedCount = 0;

            if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
                const extDoc = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
                const copied = await pdfDoc.copyPages(extDoc, extDoc.getPageIndices());
                copied.forEach((cp, idx) => {
                    pdfDoc.insertPage(targetP + idx, cp);
                    insertedCount++;
                });
            } else {
                const imgEmbed = (/\.png$/i.test(file.name) || file.type === 'image/png')
                    ? await pdfDoc.embedPng(buf)
                    : await pdfDoc.embedJpg(buf);
                const refPage = pdfDoc.getPages()[targetP - 1];
                const { width, height } = refPage ? refPage.getSize() : { width: 612, height: 792 };
                const newPage = pdfDoc.insertPage(targetP, [width, height]);
                const scale = Math.min((width - 40) / imgEmbed.width, (height - 40) / imgEmbed.height);
                const dw = imgEmbed.width * scale, dh = imgEmbed.height * scale;
                newPage.drawImage(imgEmbed, { x: (width - dw) / 2, y: (height - dh) / 2, width: dw, height: dh });
                insertedCount = 1;
            }

            (b.annotations || []).forEach(a => { if ((a.page || 1) > targetP) a.page += insertedCount; });
            const updatedUint8 = await pdfDoc.save();
            stored.originalBytes = updatedUint8.buffer;
            stored.bakedBytes = null;
            await idbPut('bookFiles', stored);
            b.totalPages = pdfDoc.getPageCount();
            b.currentPage = targetP + 1;
            b.lastModified = Date.now();
            saveReaderMeta();

            const activeBook = getActiveBook();
            if (activeBook && activeBook.id === b.id && window.PomoReaderCore?.openBookInReader) {
                await window.PomoReaderCore.openBookInReader(b.id, b.currentPage);
            } else {
                renderWoodenShelf();
            }
            document.getElementById('ilovepdf-studio-modal').classList.add('hidden');
            showToast(`✅ Inserted ${insertedCount} page(s) from "${file.name}" into "${b.title}"!`);
        } catch (err) {
            showToast("Could not insert file. Select a valid PDF, PNG, or JPG.", true);
        }
        e.target.value = '';
    });

    window.runILovePdfPageOp = async function(opType) {
        const b = (window.readerBooks || []).find(x => x.id === activeILovePdfBookId);
        if (!b || typeof PDFLib === 'undefined') return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored || !stored.originalBytes) { showToast("Requires a PDF binary book.", true); return; }

        const targetP = Math.max(1, Math.min(b.totalPages, parseInt(document.getElementById('ilove-pageop-num')?.value) || b.currentPage || 1));
        const blankStyle = document.getElementById('ilove-blank-style-sel')?.value || 'ruled';

        try {
            const pdfDoc = await PDFLib.PDFDocument.load(stored.originalBytes, { ignoreEncryption: true });
            const pages = pdfDoc.getPages();
            const pIdx = targetP - 1;

            if (opType === 'insertBlank') {
                const refSize = pages[pIdx] ? pages[pIdx].getSize() : { width: 612, height: 792 };
                const newPage = pdfDoc.insertPage(pIdx + 1, [refSize.width, refSize.height]);
                newPage.drawText(`Study Notes & Diagrams — Page ${targetP + 1}`, {
                    x: 36, y: refSize.height - 32, size: 10, color: PDFLib.rgb(0.45, 0.52, 0.65)
                });
                if (blankStyle === 'ruled') {
                    for (let ly = refSize.height - 56; ly >= 40; ly -= 24) {
                        newPage.drawLine({
                            start: { x: 36, y: ly }, end: { x: refSize.width - 36, y: ly },
                            thickness: 0.6, color: PDFLib.rgb(0.82, 0.86, 0.92)
                        });
                    }
                } else if (blankStyle === 'grid') {
                    for (let gx = 40; gx <= refSize.width - 40; gx += 22) {
                        for (let gy = 40; gy <= refSize.height - 55; gy += 22) {
                            newPage.drawCircle({ x: gx, y: gy, size: 0.8, color: PDFLib.rgb(0.75, 0.8, 0.88) });
                        }
                    }
                }
                (b.annotations || []).forEach(a => { if ((a.page || 1) > targetP) a.page += 1; });
            } else if (opType === 'rotate90') {
                const pg = pages[pIdx];
                if (pg) pg.setRotation(PDFLib.degrees(((pg.getRotation().angle || 0) + 90) % 360));
            } else if (opType === 'delete') {
                if (pages.length <= 1) { showToast("Cannot delete the only page in a book!", true); return; }
                pdfDoc.removePage(pIdx);
                b.annotations = (b.annotations || []).filter(a => (a.page || 1) !== targetP);
                b.annotations.forEach(a => { if ((a.page || 1) > targetP) a.page -= 1; });
            }

            const updatedUint8 = await pdfDoc.save();
            stored.originalBytes = updatedUint8.buffer;
            stored.bakedBytes = null;
            await idbPut('bookFiles', stored);
            b.totalPages = pdfDoc.getPageCount();
            b.currentPage = Math.min(b.totalPages, opType === 'insertBlank' ? targetP + 1 : targetP);
            b.lastModified = Date.now();
            saveReaderMeta();

            const activeBook = getActiveBook();
            if (activeBook && activeBook.id === b.id && window.PomoReaderCore?.openBookInReader) {
                await window.PomoReaderCore.openBookInReader(b.id, b.currentPage);
            } else {
                renderWoodenShelf();
            }
            document.getElementById('ilovepdf-studio-modal').classList.add('hidden');
            showToast(opType === 'insertBlank' ? `➕ Added ${blankStyle.toUpperCase()} Note Page at Page ${targetP + 1}!` : (opType === 'rotate90' ? `🔄 Page ${targetP} rotated 90°!` : `🗑️ Page ${targetP} deleted!`));
        } catch (e) { showToast("Page operation failed.", true); }
    };

    document.getElementById('ilovepdf-images-input')?.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length || typeof PDFLib === 'undefined') return;
        const bookTitle = (document.getElementById('ilove-img2pdf-title')?.value || '').trim() || `Handwritten_Notes_${getLocalTodayString()}`;
        try {
            showToast(`🖼️ Converting ${files.length} image(s) into a PDF Book...`);
            const pdfDoc = await PDFLib.PDFDocument.create();
            for (const f of files) {
                const buf = await f.arrayBuffer();
                const imgEmbed = (/png$/i.test(f.name) || f.type === 'image/png') ? await pdfDoc.embedPng(buf) : await pdfDoc.embedJpg(buf);
                const page = pdfDoc.addPage([imgEmbed.width, imgEmbed.height]);
                page.drawImage(imgEmbed, { x: 0, y: 0, width: imgEmbed.width, height: imgEmbed.height });
            }
            const pdfBytes = await pdfDoc.save();
            const newFile = new File([pdfBytes], `${bookTitle}.pdf`, { type: 'application/pdf' });
            const topShelf = window.customShelves?.[0] || { name: 'Medical Science & Anatomy', category: 'study' };
            if (window.PomoReaderCore?.importBookFileObject) {
                await window.PomoReaderCore.importBookFileObject(newFile, 'local', null, { shelfName: topShelf.name, category: topShelf.category, isManual: true });
            }
            renderWoodenShelf();
            document.getElementById('ilovepdf-studio-modal').classList.add('hidden');
            showToast(`📸 Created "${bookTitle}" (${files.length} pages) on your Shelf!`);
        } catch (err) { showToast("Please select standard JPG or PNG images.", true); }
        e.target.value = '';
    });

    window.exportPdfRangeAsImagesZip = async function() {
        const b = (window.readerBooks || []).find(x => x.id === activeILovePdfBookId);
        if (!b || typeof pdfjsLib === 'undefined' || typeof JSZip === 'undefined') return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored || !stored.originalBytes) { showToast("Requires a PDF binary book.", true); return; }

        const startP = Math.max(1, parseInt(document.getElementById('ilove-split-start')?.value) || 1);
        const endP = Math.min(b.totalPages, Math.min(startP + 25, parseInt(document.getElementById('ilove-split-end')?.value) || startP + 5));

        let pdf = null;
        try {
            showToast(`📦 Rendering pages ${startP}–${endP} to PNG ZIP...`);
            pdf = await pdfjsLib.getDocument({ data: stored.originalBytes.slice(0) }).promise;
            const zip = new JSZip();
            for (let p = startP; p <= endP; p++) {
                const page = await pdf.getPage(p);
                const vp = page.getViewport({ scale: 1.5 });
                const c = document.createElement('canvas');
                c.width = vp.width; c.height = vp.height;
                await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
                const b64 = c.toDataURL('image/png').split(',')[1];
                zip.file(`Page_${String(p).padStart(3, '0')}.png`, b64, { base64: true });
            }
            const blob = await zip.generateAsync({ type: 'blob' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${b.title}_Pages_${startP}-${endP}_Images.zip`;
            a.click();
            showToast(`✅ Downloaded ZIP of pages ${startP}–${endP}!`);
        } catch (e) {
            showToast("ZIP export failed.", true);
        } finally {
            if (pdf) {
                try { await pdf.destroy(); } catch (err) {}
            }
        }
    };

    // Public Module Handle for Future PomoDoc Expansions
    window.PomoDoc = {
        openModal: window.openILovePdfStudioModal,
        convertToBook: window.convertPdfToStructuredBook,
        splitBook: window.runILovePdfSplit,
        pageOp: window.runILovePdfPageOp,
        exportZip: window.exportPdfRangeAsImagesZip,
        renderThumbnails: window.renderILovePdfVisualThumbGrid
    };
})();
// ✅ END OF FILE (05-pomo-doc.js v16.0 Pure Desktop Edition) — 100% COMPLETE & UNCUT
