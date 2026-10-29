/* =========================================================================
   06-POMO-NOTE.JS (v16.0 PURE DESKTOP EDITION)
   POMO NOTE MODULE: SIDE-BY-SIDE SCRATCHPAD, CLICKED-ANNOTATION INSPECTOR,
   LINE NOTE & FILE ATTACHMENT VIEWER, TWO-WAY ANNOTATION SYNC & NOTES HUB (A1)
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

    let activeViewingAnnId = null;

    // Helpers to bridge cleanly with 04-pomo-reader.js
    function getActiveBook() {
        return window.PomoReaderCore ? window.PomoReaderCore.getActiveBook() : null;
    }

    function updatePageSvg(pageNum) {
        if (window.PomoReaderCore?.updateSinglePageSvg) {
            window.PomoReaderCore.updateSinglePageSvg(pageNum);
        }
    }

    /* =========================================================================
       1. SIDE-BY-SIDE SPLIT-SCREEN SCRATCHPAD & STUDY NOTES
       ========================================================================= */
    window.toggleSplitScreenScratchpad = function() {
        let pane = document.getElementById('reader-split-scratchpad');
        if (pane) {
            pane.remove();
            showToast("📝 Closed Side-by-Side Scratchpad");
            return;
        }
        pane = document.createElement('div');
        pane.id = 'reader-split-scratchpad';
        pane.className = "fixed top-12 right-2 bottom-12 w-96 z-[275] bg-slate-950/95 backdrop-blur-md border-2 border-cyan-500/60 rounded-2xl shadow-2xl flex flex-col p-3 gap-2";
        pane.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <span class="text-xs font-extrabold text-cyan-300">📝 Side-by-Side Scratchpad & Study Notes</span>
                <button type="button" onclick="document.getElementById('reader-split-scratchpad').remove()" class="text-slate-400 hover:text-white text-xs font-bold">✕</button>
            </div>
            <textarea id="split-scratchpad-txt" placeholder="Write medical mechanisms, historical timelines, behavioral laws, or key formulas side-by-side while reading..." class="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono resize-none focus:outline-none">${escapeHtml(safeGet('pages_pomodoro_scratchpad_v12', ''))}</textarea>
            <div class="flex gap-1.5">
                <button type="button" onclick="safeSet('pages_pomodoro_scratchpad_v12', document.getElementById('split-scratchpad-txt').value); showToast('💾 Scratchpad Saved!')" class="flex-1 bg-emerald-600 text-white font-bold py-1.5 rounded-xl text-xs">💾 Save</button>
                <button type="button" onclick="window.saveNotebookLmReportToVault && window.saveNotebookLmReportToVault('Scratchpad Notes', window.activeTaskSubj || 'Medical Science', document.getElementById('split-scratchpad-txt').value)" class="flex-1 bg-purple-600 text-white font-bold py-1.5 rounded-xl text-xs">📌 Send to Vault</button>
            </div>
        `;
        document.getElementById('reader-fullscreen-overlay')?.appendChild(pane);
    };

    /* =========================================================================
       2. CLICKED ANNOTATION FLOATING INSPECTOR BAR & COLOR RE-STYLING
       ========================================================================= */
    window.showClickedItemInspectorBar = function(ann, clientX, clientY) {
        const activeBook = getActiveBook();
        let bar = document.getElementById('v5-clicked-ann-inspector');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'v5-clicked-ann-inspector';
            bar.className = "fixed z-[295] rounded-2xl shadow-2xl p-1.5 flex items-center gap-1.5";
            document.getElementById('reader-fullscreen-overlay')?.appendChild(bar);
        }
        const colors = ['#facc15', '#34d399', '#60a5fa', '#f472b6', '#fb923c', '#ef4444'];
        const safeAnnId = escapeJsStr(ann.id);
        const safeBookId = escapeJsStr(activeBook?.id || '');
        const safeText = escapeJsStr((ann.text || '').slice(0, 50));

        bar.innerHTML = `
            <div class="flex items-center gap-1 border-r border-slate-700/60 pr-1.5">
                ${colors.map(c => `<button type="button" onclick="window.recolorSelectedAnnotation('${safeAnnId}', '${c}')" class="w-4 h-4 rounded-full border ${ann.color === c ? 'border-white scale-110' : 'border-transparent'}" style="background:${c}"></button>`).join('')}
            </div>
            <button type="button" onclick="window.openReaderDictionaryModal && window.openReaderDictionaryModal('${safeText}')" class="sym-dock-btn text-emerald-300" title="📖 4-Language Dictionary">📖</button>
            <button type="button" onclick="window.openSelectedAnnNoteModal('${safeAnnId}')" class="sym-dock-btn text-blue-300" title="📝 Edit Note">📝</button>
            <button type="button" onclick="window.deleteAnnotationTwoWay('${safeBookId}', '${safeAnnId}')" class="sym-dock-btn text-red-400" title="🗑️ Delete">🗑️</button>
            <button type="button" onclick="window.hideClickedItemInspectorBar()" class="text-slate-300 hover:text-white text-xs font-bold px-1">✕</button>
        `;
        bar.classList.remove('hidden');
        bar.style.left = `${Math.max(12, Math.min(window.innerWidth - 300, clientX - 130))}px`;
        bar.style.top = `${Math.max(58, Math.min(window.innerHeight - 100, clientY - 58))}px`;
    };

    window.hideClickedItemInspectorBar = function() {
        document.getElementById('v5-clicked-ann-inspector')?.classList.add('hidden');
    };

    window.recolorSelectedAnnotation = function(annId, newColor) {
        const activeBook = getActiveBook();
        if (!activeBook) return;
        const ann = (activeBook.annotations || []).find(a => a.id === annId);
        if (ann) {
            ann.color = newColor;
            ann.updatedAt = Date.now();
            activeBook.lastModified = Date.now();
            saveReaderMeta();
            updatePageSvg(ann.page);
        }
    };

    window.openSelectedAnnNoteModal = function(annId) {
        window.hideClickedItemInspectorBar();
        window.openLineItemViewerModal(annId);
    };

    /* =========================================================================
       3. LINE NOTE & FILE ATTACHMENT VIEWER MODAL
       ========================================================================= */
    window.openLineItemViewerModal = async function(annId) {
        const activeBook = getActiveBook();
        if (!activeBook) return;
        const ann = (activeBook.annotations || []).find(a => a.id === annId);
        if (!ann) return;
        activeViewingAnnId = annId;

        document.getElementById('line-viewer-title').textContent = `📝 Page ${ann.page} Annotation`;
        document.getElementById('line-viewer-quote').textContent = `"${ann.text || ''}"`;
        document.getElementById('line-viewer-note-input').value = ann.note || '';

        const attBox = document.getElementById('line-viewer-attachment-box');
        attBox.innerHTML = '';
        if (ann.attachmentId) {
            const att = await idbGet('lineAttachments', ann.attachmentId);
            if (att) {
                attBox.classList.remove('hidden');
                attBox.classList.add('flex');
                let html = `<p class="text-xs font-bold text-emerald-400">📎 ${escapeHtml(att.name)}</p>`;
                if ((att.mime || '').startsWith('image/')) html += `<img src="${att.dataUrl}" class="max-h-56 rounded-xl border border-slate-700 object-contain mx-auto">`;
                else if ((att.mime || '').startsWith('audio/')) html += `<audio controls src="${att.dataUrl}" class="w-full mt-1"></audio>`;
                html += `<a href="${att.dataUrl}" download="${escapeHtml(att.name)}" class="bg-slate-800 text-blue-300 text-center py-1.5 rounded-lg text-xs font-bold">⬇️ Download File</a>`;
                attBox.innerHTML = html;
            }
        } else {
            attBox.classList.add('hidden');
        }
        document.getElementById('line-item-viewer-modal').classList.remove('hidden');
    };

    document.getElementById('close-line-viewer-btn')?.addEventListener('click', () => {
        document.getElementById('line-item-viewer-modal').classList.add('hidden');
    });

    document.getElementById('line-viewer-save-btn')?.addEventListener('click', () => {
        const activeBook = getActiveBook();
        if (!activeBook || !activeViewingAnnId) return;
        const ann = (activeBook.annotations || []).find(a => a.id === activeViewingAnnId);
        if (ann) {
            ann.note = document.getElementById('line-viewer-note-input').value.trim();
            if (ann.note && ann.type === 'highlight') ann.type = 'note';
            ann.updatedAt = Date.now();
            saveReaderMeta();
            updatePageSvg(ann.page);
            showToast("💾 Note saved into book!");
        }
        document.getElementById('line-item-viewer-modal').classList.add('hidden');
    });

    document.getElementById('line-viewer-delete-btn')?.addEventListener('click', () => {
        const activeBook = getActiveBook();
        if (activeBook && activeViewingAnnId) {
            window.deleteAnnotationTwoWay(activeBook.id, activeViewingAnnId);
            document.getElementById('line-item-viewer-modal').classList.add('hidden');
        }
    });

    document.getElementById('line-viewer-attach-btn')?.addEventListener('click', () => {
        const inp = document.getElementById('line-attach-file-input');
        inp.onchange = (ev) => {
            const file = ev.target.files[0];
            const activeBook = getActiveBook();
            if (!file || !activeBook || !activeViewingAnnId) return;
            const r = new FileReader();
            r.onload = async () => {
                const attId = 'att_' + Date.now();
                await idbPut('lineAttachments', { id: attId, name: file.name, mime: file.type, dataUrl: r.result });
                const ann = (activeBook.annotations || []).find(a => a.id === activeViewingAnnId);
                if (ann) {
                    ann.attachmentId = attId;
                    ann.attachmentName = file.name;
                    ann.attachmentMime = file.type;
                    ann.type = 'attachment';
                    ann.updatedAt = Date.now();
                    saveReaderMeta();
                    window.openLineItemViewerModal(ann.id);
                    updatePageSvg(ann.page);
                }
            };
            r.readAsDataURL(file);
            inp.value = '';
        };
        inp.click();
    });

    /* =========================================================================
       4. TWO-WAY ANNOTATION DELETION, SHARING & GLOBAL NOTES HUB (PANEL A1)
       ========================================================================= */
    window.deleteAnnotationTwoWay = async function(bookId, annId) {
        const b = (window.readerBooks || []).find(x => x.id === bookId);
        if (!b) return;
        const idx = (b.annotations || []).findIndex(a => a.id === annId);
        if (idx === -1) return;
        const removed = b.annotations[idx];
        if (removed.attachmentId) await idbDelete('lineAttachments', removed.attachmentId);
        b.annotations.splice(idx, 1);
        if (!Array.isArray(b.deletedAnnotationIds)) b.deletedAnnotationIds = [];
        if (!b.deletedAnnotationIds.includes(annId)) b.deletedAnnotationIds.push(annId);

        if (window.PomoReaderCore && window.PomoReaderCore.getSelectedShapeId() === annId) {
            window.PomoReaderCore.setSelectedShapeId(null);
        }
        window.hideClickedItemInspectorBar();

        b.rev = (b.rev || 1) + 1;
        b.lastModified = Date.now();
        b.pendingCloudSync = true;
        saveReaderMeta();
        window.renderA1GlobalAnnotations();

        const activeBook = getActiveBook();
        if (activeBook && activeBook.id === bookId) {
            updatePageSvg(removed.page || 1);
            window.PomoReaderCore?.renderBookTocAndBookmarksDrawer?.();
        }
        showToast("🗑️ Deleted!");
    };

    window.shareAnnotationItem = function(bookId, annId) {
        const b = (window.readerBooks || []).find(x => x.id === bookId);
        const ann = b?.annotations?.find(a => a.id === annId);
        if (!b || !ann) return;
        const shareText = `📘 ${b.title} (Page ${ann.page})\n"${ann.text || ''}"\n${ann.note ? 'Note: ' + ann.note : ''}`;
        if (navigator.share) navigator.share({ title: b.title, text: shareText }).catch(() => {});
        else {
            try { navigator.clipboard.writeText(shareText); } catch (e) {}
            showToast("📋 Full quote copied to clipboard!");
        }
    };

    window.renderA1GlobalAnnotations = function() {
        const listEl = document.getElementById('a1-global-annotations-list');
        if (!listEl) return;
        const q = (document.getElementById('a1-global-search-input')?.value || '').trim().toLowerCase();
        const typeFilter = document.getElementById('a1-global-type-filter')?.value || 'all';
        const allItems = [];
        (window.readerBooks || []).forEach(b => {
            (b.annotations || []).forEach(ann => {
                if (typeFilter !== 'all' && ann.type !== typeFilter) return;
                if (q && !`${b.title} ${ann.text || ''} ${ann.note || ''} ${ann.attachmentName || ''}`.toLowerCase().includes(q)) return;
                allItems.push({ book: b, ann });
            });
        });
        listEl.innerHTML = allItems.length
            ? ''
            : `<p class="text-xs text-slate-500 italic text-center p-6 bg-slate-950 rounded-2xl border border-slate-800">No matching annotations found.</p>`;
        allItems.forEach(({ book, ann }) => {
            const safeBookId = escapeJsStr(book.id);
            const safeAnnId = escapeJsStr(ann.id);
            const row = document.createElement('div');
            row.className = "bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-start justify-between gap-3";
            row.style.borderLeft = `5px solid ${ann.color || '#facc15'}`;
            row.innerHTML = `
                <div class="min-w-0 flex-1 cursor-pointer" onclick="document.getElementById('reader-master-settings-modal').classList.add('hidden'); openBookAtPage('${safeBookId}', ${ann.page || 1});">
                    <span class="text-xs font-extrabold text-white">📘 ${escapeHtml(book.title)} <span class="text-emerald-400 font-mono">(Page ${ann.page || 1})</span></span>
                    <p class="text-xs text-slate-300 mt-1 whitespace-pre-wrap break-words">"${escapeHtml(ann.text || ann.note || ann.shapeType || 'Annotation')}"</p>
                </div>
                <div class="flex gap-1.5 shrink-0">
                    <button onclick="window.shareAnnotationItem('${safeBookId}', '${safeAnnId}')" class="bg-slate-900 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">📋</button>
                    <button onclick="window.deleteAnnotationTwoWay('${safeBookId}', '${safeAnnId}')" class="bg-slate-900 text-red-400 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">🗑️</button>
                </div>
            `;
            listEl.appendChild(row);
        });
    };

    document.getElementById('a1-global-search-input')?.addEventListener('input', window.renderA1GlobalAnnotations);
    document.getElementById('a1-global-type-filter')?.addEventListener('change', window.renderA1GlobalAnnotations);

    // Public Module Handle for Future PomoNote Expansions
    window.PomoNote = {
        toggleScratchpad: window.toggleSplitScreenScratchpad,
        openLineViewer: window.openLineItemViewerModal,
        showInspector: window.showClickedItemInspectorBar,
        hideInspector: window.hideClickedItemInspectorBar,
        deleteAnnotation: window.deleteAnnotationTwoWay,
        shareAnnotation: window.shareAnnotationItem,
        renderGlobalNotesHub: window.renderA1GlobalAnnotations
    };
})();
// ✅ END OF FILE (06-pomo-note.js v16.0 Pure Desktop Edition) — 100% COMPLETE & UNCUT
