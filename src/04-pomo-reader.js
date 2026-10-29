/* =========================================================================
   04-POMO-READER.JS (v16.0 PURE DESKTOP EDITION — PART 1 OF 2)
   CORE POMO READER MODULE: 3D WOODEN BOOKSHELF, ANTI-CUTOFF GENRE SLIDER,
   POMOCLOUD 0MB OFFLOAD, CROSS-APP STUDIO BRIDGE, PIP MINI-COCKPIT,
   SMART CHAPTER AUTO-DETECTOR & SHARED MODULE BRIDGE (FOR POMODOC & POMONOTE)
   ========================================================================= */
(function() {
    document.getElementById('reader-floating-thumb-dock')?.remove();
    const HTTPS = 'https:' + '//';

    window.haptic = window.haptic || function() {};
    window.escapeJsStr = window.escapeJsStr || function(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/\r?\n/g, ' ');
    };

    /* =========================================================================
       1. UNIFIED READER STATE, POLYMATH GENRES & SHARED MODULE VARIABLES
       ========================================================================= */
    window.readerBooks = JSON.parse(safeGet('pages_pomodoro_reader_books_v1', '[]'));
    window.readerReadingLog = JSON.parse(safeGet('pages_pomodoro_reader_log_v1', '{}'));
    window.customShelves = JSON.parse(safeGet('pages_pomodoro_custom_shelves_v1', 'null')) || [
        { id: 'shelf_med', name: 'Medical Science & Anatomy', category: 'study' },
        { id: 'shelf_hist', name: 'World History & Civilizations', category: 'study' },
        { id: 'shelf_behav', name: 'Human Behavior & Psychology', category: 'side' },
        { id: 'shelf_cosmos', name: 'Universe & Existence Purpose', category: 'side' },
        { id: 'shelf_deen', name: 'Quran, Tafseer & Hadith', category: 'deen' }
    ];
    window.readerSettings = JSON.parse(safeGet('pages_pomodoro_reader_cfg_v1', 'null')) || {
        woodStyle: 'walnut',
        sortBy: 'sequence',
        autoFolderImport: true,
        mainFolderName: '',
        viewMode: 'scroll',
        orientation: 'auto',
        theme: 'night',
        keepScreenOn: true,
        blueLightEnabled: false,
        blueLightIntensity: 30,
        lockVerticalScroll: false,
        lockHorizontalScroll: false,
        hideBottomBar: false,
        shelfWrapMode: false,
        clouds: {
            local: { name: 'Local PC Folder', icon: '💾', connected: true, status: 'Ready (IndexedDB + Disk)' },
            telegram: { name: 'Telegram Cloud (Bot + TDLib)', icon: '✈️', connected: false, tdlibUrl: '', status: 'Bot API + TDLib Ready' },
            gdrive: { name: 'Google Drive (OAuth2 + API)', icon: '☁️', connected: false, folderName: '', token: '', apiKey: '', folderId: '', status: 'Not Connected' },
            dropbox: { name: 'Dropbox', icon: '📦', connected: false, folderName: '', token: '', status: 'Not Connected' },
            onedrive: { name: 'OneDrive', icon: '☁️', connected: false, folderName: '', token: '', status: 'Not Connected' },
            mega: { name: 'Mega Storage', icon: 'Ⓜ️', connected: false, folderName: '', token: '', status: 'Not Connected' }
        }
    };

    readerBooks.forEach((b, idx) => {
        if (typeof b.readSeq !== 'number') b.readSeq = idx + 1;
    });

    // Shared Module State across Part 1, Part 2, PomoDoc (05) & PomoNote (06)
    let mainDirectoryHandle = null;
    let cloudDirectoryHandles = {};
    let pendingManualGenreChoice = null;
    let isApplyingRemoteReaderSync = false;
    let readerCloudUnsubscribe = null;
    let readerWirelessSyncTimer = null;

    let activeShelfFilter = 'all';
    let activeCustomShelfFilter = 'all';
    let shelfDisplayLayout = 'sections';
    let activeCornerBookId = null;

    let activeReaderBook = null;
    let activePdfDoc = null;
    let activeExtractedPages = [];
    let activeStructuredPages = [];
    let readerZoom = 1.0;
    let studioActive = false;
    let studioTool = 'line';
    let readerSelectionMode = 'official';
    let occlusionModeActive = false;
    let bionicReadingActive = false;
    let selectedShapeId = null;
    let activeHighlightColor = '#facc15';
    let pendingLaserSelection = null;
    let pendingTextPlacement = null;
    let activeReadingSessionTimer = null;
    let pageScrollObserver = null;
    let isJumpingPage = false;
    let jumpUnlockTimer = null;
    let teleprompterTimer = null;
    let teleprompterSpeed = 1.2;
    let splitSecondPdfDoc = null;
    let splitSecondPageNum = 1;
    const pageTextItemsCache = {};
    const renderedCanvasPages = new Set();

    // =========================================================================
    // 1A. SHARED INTER-MODULE BRIDGE FOR POMODOC (05) & POMONOTE (06)
    // =========================================================================
    window.PomoReaderCore = {
        getActiveBook: () => activeReaderBook,
        setActiveBook: (b) => { activeReaderBook = b; },
        getActivePdfDoc: () => activePdfDoc,
        getExtractedPages: () => activeExtractedPages,
        setExtractedPages: (arr) => { activeExtractedPages = Array.isArray(arr) ? arr : []; },
        getStructuredPages: () => activeStructuredPages,
        setStructuredPages: (arr) => { activeStructuredPages = Array.isArray(arr) ? arr : []; },
        getSelectedShapeId: () => selectedShapeId,
        setSelectedShapeId: (id) => { selectedShapeId = id; },
        getActiveHighlightColor: () => activeHighlightColor,
        setActiveHighlightColor: (c) => { activeHighlightColor = c; },
        getStudioState: () => ({ studioActive, studioTool }),
        importBookFileObject: (...args) => importBookFileObject(...args),
        generatePdfCoverAndMeta: (...args) => generatePdfCoverAndMeta(...args),
        bakeAnnotationsIntoPdfBytes: (...args) => bakeAnnotationsIntoPdfBytes(...args),
        openBookInReader: (...args) => openBookInReader(...args),
        buildBookStageAndObserver: (...args) => buildBookStageAndObserver(...args),
        updateSinglePageSvg: (...args) => updateSinglePageSvg(...args),
        refreshVisiblePageSvgs: (...args) => refreshVisiblePageSvgs(...args),
        jumpToReaderPage: (...args) => jumpToReaderPage(...args),
        renderBookTocAndBookmarksDrawer: (...args) => renderBookTocAndBookmarksDrawer(...args)
    };

    /* =========================================================================
       1B. CROSS-APP "POMO STUDIO BRIDGE" (FOR EXTERNAL POMOAI STUDIO APP)
           Syncs Books, Shelves, Page-Range Text Indexes, Telegram file_id,
           Google Drive IDs & Live Passages via Firebase, BroadcastChannel & Disk
       ========================================================================= */
    const studioBroadcastChan = ('BroadcastChannel' in window) ? new BroadcastChannel('pomo_studio_bridge_v1') : null;

    window.PomoStudioBridge = {
        async syncBookPageIndexToCloud(bookId, pagesTextArray = []) {
            const b = readerBooks.find(x => x.id === bookId);
            if (!b || !Array.isArray(pagesTextArray) || !pagesTextArray.length) return false;
            const roomId = safeGet('pages_pomodoro_sync_room', '');
            if (!roomId || typeof firebase === 'undefined' || !firebase.apps?.length) return false;

            try {
                const db = firebase.firestore();
                const indexRef = db.collection('artifacts').doc('neettimercloud')
                    .collection('public').doc('data')
                    .collection('sync_rooms').doc(roomId)
                    .collection('reader_page_index').doc(b.id);

                const pagesPerChunk = 25;
                const totalChunks = Math.ceil(pagesTextArray.length / pagesPerChunk);
                await indexRef.set({
                    bookId: b.id,
                    title: b.title,
                    shelfName: b.shelfName || 'General Shelf',
                    readSeq: b.readSeq || 1,
                    totalPages: b.totalPages || pagesTextArray.length,
                    totalChunks,
                    telegramFileId: b.telegramFileId || '',
                    gdriveFileId: b.gdriveFileId || '',
                    dropboxPath: b.dropboxPath || '',
                    outline: b.outline || [],
                    updatedAt: Date.now()
                }, { merge: true });

                for (let c = 0; c < totalChunks; c++) {
                    const slice = pagesTextArray.slice(c * pagesPerChunk, (c + 1) * pagesPerChunk).map((txt, idx) => ({
                        p: (c * pagesPerChunk) + idx + 1,
                        t: String(txt || '').slice(0, 12000)
                    }));
                    await indexRef.collection('page_chunks').doc(String(c)).set({
                        chunkIndex: c,
                        startPage: c * pagesPerChunk + 1,
                        endPage: Math.min(pagesTextArray.length, (c + 1) * pagesPerChunk),
                        pages: slice
                    });
                }
                b.hasCloudPageIndex = true;
                saveReaderMeta(true);
                return true;
            } catch (e) {
                return false;
            }
        },

        async sendSelectionToExternalStudio(payload) {
            const packet = {
                id: 'bridge_' + Date.now(),
                bookId: payload.bookId || activeReaderBook?.id || '',
                bookTitle: payload.bookTitle || activeReaderBook?.title || 'Book Passage',
                shelfName: payload.shelfName || activeReaderBook?.shelfName || 'General Shelf',
                startPage: payload.startPage || activeReaderBook?.currentPage || 1,
                endPage: payload.endPage || payload.startPage || activeReaderBook?.currentPage || 1,
                selectedText: payload.selectedText || '',
                telegramFileId: payload.telegramFileId || activeReaderBook?.telegramFileId || '',
                gdriveFileId: payload.gdriveFileId || activeReaderBook?.gdriveFileId || '',
                dropboxPath: payload.dropboxPath || activeReaderBook?.dropboxPath || '',
                timestamp: Date.now()
            };

            try {
                studioBroadcastChan?.postMessage({ type: 'STUDIO_IMPORT_PASSAGE', packet });
            } catch (e) {}

            try {
                const inbox = JSON.parse(safeGet('pages_pomodoro_studio_bridge_inbox_v1', '[]'));
                inbox.unshift(packet);
                safeSet('pages_pomodoro_studio_bridge_inbox_v1', JSON.stringify(inbox.slice(0, 30)));
            } catch (e) {}

            const roomId = safeGet('pages_pomodoro_sync_room', '');
            if (roomId && typeof firebase !== 'undefined' && firebase.apps?.length) {
                try {
                    const db = firebase.firestore();
                    await db.collection('artifacts').doc('neettimercloud')
                        .collection('public').doc('data')
                        .collection('sync_rooms').doc(roomId)
                        .collection('reader_pro').doc('studio_inbox')
                        .set({ latestPacket: packet, updatedAt: Date.now() }, { merge: true });
                } catch (e) {}
            }

            const citationStr = `📘 [${packet.shelfName}] ${packet.bookTitle} (Page ${packet.startPage}${packet.endPage > packet.startPage ? `–${packet.endPage}` : ''}):\n"${packet.selectedText}"`;
            try { await navigator.clipboard.writeText(citationStr); } catch (e) {}
            showToast(`📤 Sent to External Studio Bridge & Copied Citation (p.${packet.startPage})!`);
        },

        async writeDesktopFolderLibraryIndex() {
            if (!mainDirectoryHandle) return;
            try {
                const fh = await mainDirectoryHandle.getFileHandle('pomo-library-index.json', { create: true });
                const wr = await fh.createWritable();
                const payload = {
                    updatedAt: Date.now(),
                    customShelves,
                    readerBooks: readerBooks.map(b => ({ ...b, coverDataUrl: '' }))
                };
                await wr.write(JSON.stringify(payload, null, 2));
                await wr.close();
            } catch (e) {}
        }
    };

    if (studioBroadcastChan) {
        studioBroadcastChan.onmessage = async (ev) => {
            const msg = ev.data || {};
            if (msg.type === 'REQUEST_LIBRARY_MANIFEST') {
                studioBroadcastChan.postMessage({
                    type: 'LIBRARY_MANIFEST_RESPONSE',
                    customShelves,
                    readerBooks: readerBooks.map(b => ({ ...b, coverDataUrl: '' }))
                });
            } else if (msg.type === 'REQUEST_BOOK_PAGE_RANGE' && msg.bookId) {
                const b = readerBooks.find(x => x.id === msg.bookId);
                if (!b) return;
                const startP = Math.max(1, parseInt(msg.startPage) || 1);
                const endP = Math.min(b.totalPages || 1, Math.max(startP, parseInt(msg.endPage) || startP));
                const text = await window.extractBookPageRangeTextForBridge(b.id, startP, endP);
                studioBroadcastChan.postMessage({
                    type: 'BOOK_PAGE_RANGE_RESPONSE',
                    requestId: msg.requestId,
                    bookId: b.id,
                    bookTitle: b.title,
                    shelfName: b.shelfName,
                    startPage: startP,
                    endPage: endP,
                    text
                });
            }
        };
    }

    window.saveReaderMeta = function(skipCloudBroadcast = false) {
        const slimBooks = readerBooks.map(b => {
            const copy = { ...b };
            if (copy.coverDataUrl && copy.coverDataUrl.length > 200) {
                coverMemoryCache[copy.id] = copy.coverDataUrl;
                idbPut('bookCovers', { id: copy.id, coverDataUrl: copy.coverDataUrl });
                copy.hasCachedCover = true;
                copy.coverDataUrl = '';
            }
            return copy;
        });
        safeSet('pages_pomodoro_reader_books_v1', JSON.stringify(slimBooks));
        safeSet('pages_pomodoro_reader_log_v1', JSON.stringify(readerReadingLog));
        safeSet('pages_pomodoro_reader_cfg_v1', JSON.stringify(readerSettings));
        safeSet('pages_pomodoro_custom_shelves_v1', JSON.stringify(customShelves));
        updatePendingSyncBadge();
        updateHomeContinueReadingWidget();
        PomoEventBus.emit('reader:updated', { booksCount: readerBooks.length });
        if (!skipCloudBroadcast && !isApplyingRemoteReaderSync) {
            broadcastReaderLedgerToCloud();
        }
    };

    async function hydrateBookCoversAndHandles() {
        for (const b of readerBooks) {
            if (b.coverDataUrl && b.coverDataUrl.length > 200) {
                coverMemoryCache[b.id] = b.coverDataUrl;
                await idbPut('bookCovers', { id: b.id, coverDataUrl: b.coverDataUrl });
                b.coverDataUrl = '';
            } else if (!coverMemoryCache[b.id]) {
                const cov = await idbGet('bookCovers', b.id);
                if (cov && cov.coverDataUrl) coverMemoryCache[b.id] = cov.coverDataUrl;
            }
        }
        try {
            const savedMain = await idbGet('handles', 'mainFolder');
            if (savedMain && savedMain.handle) {
                mainDirectoryHandle = savedMain.handle;
                readerSettings.mainFolderName = savedMain.name || mainDirectoryHandle.name;
                updateMainFolderUI();
            }
            for (const cKey of ['gdrive', 'dropbox', 'onedrive', 'mega']) {
                const cSaved = await idbGet('handles', 'cloud_' + cKey);
                if (cSaved && cSaved.handle) {
                    cloudDirectoryHandles[cKey] = cSaved.handle;
                    readerSettings.clouds[cKey].connected = true;
                    readerSettings.clouds[cKey].folderName = cSaved.name;
                    readerSettings.clouds[cKey].status = `Synced Folder: ${cSaved.name}`;
                }
            }
        } catch (e) {}
        saveReaderMeta(true);
        renderWoodenShelf();
    }

    function updateMainFolderUI() {
        const lbl = document.getElementById('reader-main-folder-label');
        const st = document.getElementById('settings-main-folder-status');
        if (readerSettings.mainFolderName) {
            if (lbl) lbl.textContent = `📂 Main Folder: ${readerSettings.mainFolderName} • Auto-Import ${readerSettings.autoFolderImport ? 'ON' : 'OFF'} • Bridge Ready`;
            if (st) st.textContent = `Connected Main Folder: "${readerSettings.mainFolderName}" (Respects Manual Genre Locks)`;
        }
        const autoBtn = document.getElementById('toggle-auto-folder-import-btn');
        if (autoBtn) {
            autoBtn.textContent = readerSettings.autoFolderImport ? 'Enabled' : 'Disabled';
            autoBtn.className = readerSettings.autoFolderImport
                ? 'bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-xl'
                : 'bg-slate-800 text-slate-400 text-xs font-bold px-4 py-1.5 rounded-xl';
        }
    }

    /* =========================================================================
       2. ZERO-CONTRADICTION CRDT WIRELESS SYNC & POMOCLOUD 0MB OFFLOAD ENGINE
       ========================================================================= */
    function mergeSingleBookCRDT(localBook, remoteBook) {
        if (!localBook) return remoteBook;
        if (!remoteBook) return localBook;

        const mergedDeleted = Array.from(new Set([
            ...(localBook.deletedAnnotationIds || []),
            ...(remoteBook.deletedAnnotationIds || [])
        ]));

        const annMap = new Map();
        (localBook.annotations || []).forEach(a => {
            if (a && a.id && !mergedDeleted.includes(a.id)) annMap.set(a.id, a);
        });
        (remoteBook.annotations || []).forEach(rAnn => {
            if (!rAnn || !rAnn.id || mergedDeleted.includes(rAnn.id)) return;
            const existing = annMap.get(rAnn.id);
            if (!existing || (rAnn.updatedAt || rAnn.createdAt || 0) >= (existing.updatedAt || existing.createdAt || 0)) {
                annMap.set(rAnn.id, rAnn);
            }
        });

        const mergedAnns = Array.from(annMap.values()).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        const rMod = remoteBook.lastModified || 0;
        const lMod = localBook.lastModified || 0;
        const newerMeta = rMod > lMod ? remoteBook : localBook;

        let finalShelf = newerMeta.shelfName || localBook.shelfName || 'General Shelf';
        let finalLock = Boolean(localBook.manualGenreLock || remoteBook.manualGenreLock);
        if (remoteBook.manualGenreLock && (!localBook.manualGenreLock || rMod >= lMod)) finalShelf = remoteBook.shelfName;
        else if (localBook.manualGenreLock) finalShelf = localBook.shelfName;

        const mergedSources = Array.from(new Set([...(localBook.sources || []), ...(remoteBook.sources || [])]));
        const finalPage = rMod > lMod ? (remoteBook.currentPage || localBook.currentPage || 1) : (localBook.currentPage || remoteBook.currentPage || 1);
        const finalTotal = Math.max(1, localBook.totalPages || remoteBook.totalPages || 1);
        const finalOutline = (newerMeta.outline && newerMeta.outline.length) ? newerMeta.outline : (localBook.outline || []);

        return {
            ...localBook,
            ...newerMeta,
            id: localBook.id,
            shelfName: finalShelf,
            manualGenreLock: finalLock,
            readSeq: newerMeta.readSeq || localBook.readSeq || 1,
            totalPages: finalTotal,
            currentPage: finalPage,
            progressPct: Math.min(100, Math.round((finalPage / finalTotal) * 100)),
            readingMins: Math.max(localBook.readingMins || 0, remoteBook.readingMins || 0),
            rev: Math.max(localBook.rev || 1, remoteBook.rev || 1),
            cloudBinaryAvailable: Boolean(localBook.cloudBinaryAvailable || remoteBook.cloudBinaryAvailable),
            hasCloudPageIndex: Boolean(localBook.hasCloudPageIndex || remoteBook.hasCloudPageIndex),
            telegramFileId: remoteBook.telegramFileId || localBook.telegramFileId || '',
            dropboxPath: remoteBook.dropboxPath || localBook.dropboxPath || '',
            gdriveFileId: remoteBook.gdriveFileId || localBook.gdriveFileId || '',
            sources: mergedSources,
            outline: finalOutline,
            annotations: mergedAnns,
            deletedAnnotationIds: mergedDeleted,
            lastModified: Math.max(lMod, rMod)
        };
    }

    function broadcastReaderLedgerToCloud() {
        const roomId = safeGet('pages_pomodoro_sync_room', '');
        if (!roomId || isApplyingRemoteReaderSync || typeof firebase === 'undefined' || !firebase.apps?.length) return;
        clearTimeout(readerWirelessSyncTimer);
        readerWirelessSyncTimer = setTimeout(async () => {
            try {
                const db = firebase.firestore();
                const ledgerDoc = db.collection('artifacts').doc('neettimercloud')
                    .collection('public').doc('data')
                    .collection('sync_rooms').doc(roomId)
                    .collection('reader_pro').doc('ledger');

                const slimBooks = readerBooks.map(b => ({ ...b, coverDataUrl: '' }));
                await ledgerDoc.set({
                    booksJson: JSON.stringify(slimBooks),
                    shelvesJson: JSON.stringify(customShelves),
                    readingLogJson: JSON.stringify(readerReadingLog),
                    updatedAt: Date.now()
                }, { merge: true });

                window.PomoStudioBridge.writeDesktopFolderLibraryIndex();
            } catch (e) {}
        }, 450);
    }

    function attachWirelessReaderCloudListener() {
        const roomId = safeGet('pages_pomodoro_sync_room', '');
        if (!roomId || typeof firebase === 'undefined' || !firebase.apps?.length) return;
        try {
            if (readerCloudUnsubscribe) readerCloudUnsubscribe();
            const db = firebase.firestore();
            const ledgerDoc = db.collection('artifacts').doc('neettimercloud')
                .collection('public').doc('data')
                .collection('sync_rooms').doc(roomId)
                .collection('reader_pro').doc('ledger');

            readerCloudUnsubscribe = ledgerDoc.onSnapshot((snap) => {
                if (!snap.exists) return;
                const data = snap.data();
                isApplyingRemoteReaderSync = true;
                try {
                    if (data.shelvesJson) {
                        const rShelves = JSON.parse(data.shelvesJson);
                        rShelves.forEach(rs => {
                            if (!customShelves.some(cs => cs.name.toLowerCase() === rs.name.toLowerCase())) customShelves.push(rs);
                        });
                    }
                    if (data.readingLogJson) {
                        const rLog = JSON.parse(data.readingLogJson);
                        Object.entries(rLog).forEach(([dateKey, dayVal]) => {
                            if (!readerReadingLog[dateKey]) readerReadingLog[dateKey] = dayVal;
                            else readerReadingLog[dateKey].totalMins = Math.max(readerReadingLog[dateKey].totalMins || 0, dayVal.totalMins || 0);
                        });
                    }
                    if (data.booksJson) {
                        const remoteBooks = JSON.parse(data.booksJson);
                        const bookMap = new Map();
                        readerBooks.forEach(lb => bookMap.set(lb.id, lb));
                        remoteBooks.forEach(rb => {
                            if (!rb || !rb.id) return;
                            const existing = bookMap.get(rb.id);
                            bookMap.set(rb.id, existing ? mergeSingleBookCRDT(existing, rb) : rb);
                        });
                        window.readerBooks = Array.from(bookMap.values());
                    }
                    saveReaderMeta(true);
                    renderWoodenShelf();
                    if (activeReaderBook) {
                        const updatedActive = readerBooks.find(x => x.id === activeReaderBook.id);
                        if (updatedActive) { activeReaderBook = updatedActive; refreshVisiblePageSvgs(); }
                    }
                } catch (err) {}
                isApplyingRemoteReaderSync = false;
            });
        } catch (e) {}
    }
    setTimeout(attachWirelessReaderCloudListener, 900);
    document.getElementById('login-sync-btn')?.addEventListener('click', () => setTimeout(attachWirelessReaderCloudListener, 1200));

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i += 8192) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(len, i + 8192)));
        }
        return btoa(binary);
    }

    function base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
    }

    window.offloadBookBinaryToSaveLocalSpace = async function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored || (!stored.originalBytes && !stored.bakedBytes)) {
            showToast("☁️ Book PDF binary is already offloaded (0 MB local use)!");
            return;
        }
        await idbPut('bookFiles', {
            id: b.id,
            originalBytes: null,
            bakedBytes: null,
            structuredPages: stored.structuredPages || null,
            extractedPagesText: stored.extractedPagesText || []
        });
        b.isOffloadedZeroStorage = true;
        saveReaderMeta();
        renderWoodenShelf();
        showToast(`☁️ Offloaded "${b.title}" PDF binary! Local storage freed (All Highlights, Notes, Cover, Chapters & Page Texts safely kept).`);
    };

    window.uploadBookBinaryToWirelessCloud = async function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored || (!stored.originalBytes && !stored.structuredPages && !stored.extractedPagesText?.length)) {
            showToast("Book binary is not on this device yet.", true);
            return;
        }

        if (Array.isArray(stored.extractedPagesText) && stored.extractedPagesText.length > 0) {
            window.PomoStudioBridge.syncBookPageIndexToCloud(b.id, stored.extractedPagesText);
        }

        const bakedBytes = stored.originalBytes
            ? await bakeAnnotationsIntoPdfBytes(b, stored.originalBytes)
            : new TextEncoder().encode(JSON.stringify(stored.structuredPages || stored.extractedPagesText || [])).buffer;

        const gdToken = readerSettings.clouds?.gdrive?.token?.trim();
        if (gdToken && navigator.onLine) {
            try {
                showToast(`☁️ Uploading "${b.title}" to Google Drive API...`);
                const metadata = { name: b.fileName, mimeType: 'application/pdf' };
                const folderId = readerSettings.clouds?.gdrive?.folderId?.trim();
                if (folderId) metadata.parents = [folderId];
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', new Blob([bakedBytes], { type: 'application/pdf' }));
                const res = await fetch(HTTPS + 'www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${gdToken}` },
                    body: form
                });
                if (res.ok) {
                    const gdData = await res.json();
                    b.gdriveFileId = gdData.id || '';
                    b.cloudBinaryAvailable = true;
                    if (!b.sources.includes('gdrive')) b.sources.push('gdrive');
                    b.lastModified = Date.now();
                    saveReaderMeta();
                    showToast(`✅ "${b.title}" uploaded to Google Drive & indexed for Studio Bridge!`);
                    return;
                }
            } catch (e) {}
        }

        const dbxToken = readerSettings.clouds?.dropbox?.token?.trim();
        if (dbxToken && navigator.onLine) {
            try {
                showToast(`📦 Uploading "${b.title}" to Dropbox PomoCloud...`);
                const dbxPath = `/PomoReader/${b.fileName}`;
                const res = await fetch(HTTPS + 'content.dropboxapi.com/2/files/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${dbxToken}`,
                        'Dropbox-API-Arg': JSON.stringify({ path: dbxPath, mode: 'overwrite', autorename: false, mute: true }),
                        'Content-Type': 'application/octet-stream'
                    },
                    body: bakedBytes
                });
                if (res.ok) {
                    b.dropboxPath = dbxPath;
                    b.cloudBinaryAvailable = true;
                    if (!b.sources.includes('dropbox')) b.sources.push('dropbox');
                    b.lastModified = Date.now();
                    saveReaderMeta();
                    showToast(`✅ "${b.title}" synced to Dropbox & indexed for Studio Bridge!`);
                    return;
                }
            } catch (e) {}
        }

        const roomId = safeGet('pages_pomodoro_sync_room', '');
        if (!roomId || typeof firebase === 'undefined') {
            showToast("Connect your Cloud Room ID (in Profile -> PomoCloud) or Google Drive/Dropbox token first!", true);
            return;
        }
        if (bakedBytes.byteLength > 15 * 1024 * 1024) {
            showToast("Book > 15MB: Page-text index synced to Firebase! For full binary, use Telegram Sync or Google Drive.", false);
            return;
        }

        try {
            showToast(`☁️ Uploading "${b.title}" to PomoCloud Room...`);
            const b64 = arrayBufferToBase64(bakedBytes);
            const chunkSize = 650000;
            const totalChunks = Math.ceil(b64.length / chunkSize);
            const db = firebase.firestore();
            const binRef = db.collection('artifacts').doc('neettimercloud')
                .collection('public').doc('data')
                .collection('sync_rooms').doc(roomId)
                .collection('reader_binaries').doc(b.id);

            await binRef.set({ fileName: b.fileName, totalChunks, byteLength: bakedBytes.byteLength, updatedAt: Date.now() });
            for (let c = 0; c < totalChunks; c++) {
                await binRef.collection('chunks').doc(String(c)).set({ idx: c, data: b64.slice(c * chunkSize, (c + 1) * chunkSize) });
            }
            b.cloudBinaryAvailable = true;
            b.lastModified = Date.now();
            saveReaderMeta();
            showToast(`✅ "${b.title}" pushed to PomoCloud Room & Studio Bridge!`);
        } catch (err) { showToast("Wireless upload interrupted.", true); }
    };

    window.downloadBookBinaryFromWirelessCloud = async function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return null;

        const gdToken = readerSettings.clouds?.gdrive?.token?.trim();
        const gdKey = readerSettings.clouds?.gdrive?.apiKey?.trim();
        if (b.gdriveFileId && (gdToken || gdKey) && navigator.onLine) {
            try {
                showToast(`📲 Streaming "${b.title}" from Google Drive...`);
                const url = `${HTTPS}www.googleapis.com/drive/v3/files/${encodeURIComponent(b.gdriveFileId)}?alt=media${gdKey ? `&key=${encodeURIComponent(gdKey)}` : ''}`;
                const headers = gdToken ? { 'Authorization': `Bearer ${gdToken}` } : {};
                const res = await fetch(url, { headers });
                if (res.ok) {
                    const arrayBuffer = await res.arrayBuffer();
                    const record = { id: b.id, originalBytes: arrayBuffer, bakedBytes: null, extractedPagesText: [] };
                    await idbPut('bookFiles', record);
                    b.isOffloadedZeroStorage = false;
                    showToast(`✅ "${b.title}" streamed from Google Drive!`);
                    return record;
                }
            } catch (e) {}
        }

        const dbxToken = readerSettings.clouds?.dropbox?.token?.trim();
        if (b.dropboxPath && dbxToken && navigator.onLine) {
            try {
                showToast(`📲 Streaming "${b.title}" from Dropbox...`);
                const res = await fetch(HTTPS + 'content.dropboxapi.com/2/files/download', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${dbxToken}`,
                        'Dropbox-API-Arg': JSON.stringify({ path: b.dropboxPath })
                    }
                });
                if (res.ok) {
                    const arrayBuffer = await res.arrayBuffer();
                    const record = { id: b.id, originalBytes: arrayBuffer, bakedBytes: null, extractedPagesText: [] };
                    await idbPut('bookFiles', record);
                    b.isOffloadedZeroStorage = false;
                    showToast(`✅ "${b.title}" streamed from Dropbox!`);
                    return record;
                }
            } catch (e) {}
        }

        const roomId = safeGet('pages_pomodoro_sync_room', '');
        if (!roomId || typeof firebase === 'undefined') return null;
        try {
            showToast(`📲 Streaming "${b.title}" from PomoCloud Room...`);
            const db = firebase.firestore();
            const binRef = db.collection('artifacts').doc('neettimercloud')
                .collection('public').doc('data')
                .collection('sync_rooms').doc(roomId)
                .collection('reader_binaries').doc(b.id);

            const metaSnap = await binRef.get();
            if (!metaSnap.exists) return null;
            const chunksSnap = await binRef.collection('chunks').get();
            const chunks = [];
            chunksSnap.forEach(doc => chunks.push(doc.data()));
            chunks.sort((a, b) => a.idx - b.idx);
            const arrayBuffer = base64ToArrayBuffer(chunks.map(c => c.data).join(''));

            const record = { id: b.id, originalBytes: arrayBuffer, bakedBytes: null, extractedPagesText: [] };
            await idbPut('bookFiles', record);
            b.isOffloadedZeroStorage = false;
            renderWoodenShelf();
            showToast(`✅ "${b.title}" streamed wirelessly!`);
            return record;
        } catch (e) { return null; }
    };

    /* =========================================================================
       3. HOME CONTINUE-READING WIDGET & INTERACTIVE DOCUMENT PiP MINI-COCKPIT
       ========================================================================= */
    function mountHomeContinueReadingWidget() {
        const rightCol = document.querySelector('#page-timer .cockpit-right');
        if (!rightCol || document.getElementById('home-reader-widget-card')) return;
        const widget = document.createElement('div');
        widget.id = 'home-reader-widget-card';
        widget.className = "w-full bg-slate-900/90 border border-slate-800/90 p-2.5 rounded-2xl shadow-lg flex items-center justify-between gap-2 min-w-0 max-w-full overflow-hidden";
        rightCol.appendChild(widget);
        updateHomeContinueReadingWidget();
    }

    function updateHomeContinueReadingWidget() {
        const widget = document.getElementById('home-reader-widget-card');
        if (!widget) return;
        const sorted = [...readerBooks].sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));
        const latest = sorted[0];

        if (!latest) {
            widget.innerHTML = `
                <div class="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <span class="text-xl shrink-0">📖</span>
                    <div class="min-w-0 flex-1 overflow-hidden">
                        <p class="text-[9px] font-extrabold uppercase tracking-widest text-amber-400 truncate">PomoReader Pro</p>
                        <p class="text-xs font-bold text-slate-300 truncate">No books imported yet — Click to open Shelf</p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" onclick="window.launchPipMiniCockpitWidget()" class="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-2 py-1.5 rounded-xl text-[10px] font-bold">🖼️ PiP</button>
                    <button type="button" onclick="switchPage('page-reader')" class="bg-blue-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold">Shelf</button>
                </div>
            `;
            return;
        }

        const pct = Math.min(100, Math.round(((latest.currentPage || 1) / Math.max(1, latest.totalPages || 1)) * 100));
        const shortTitle = String(latest.title || 'Book').length > 44
            ? String(latest.title).slice(0, 42) + '…'
            : String(latest.title || 'Book');
        const safeLatestId = escapeJsStr(latest.id);

        widget.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden cursor-pointer" onclick="openBookAtPage('${safeLatestId}', ${latest.currentPage || 1})">
                <div class="w-8 h-11 rounded-lg bg-slate-950 border border-amber-500/40 shrink-0 bg-cover bg-center flex items-center justify-center text-xs" style="${coverMemoryCache[latest.id] ? `background-image:url('${coverMemoryCache[latest.id]}')` : ''}">
                    ${coverMemoryCache[latest.id] ? '' : '📘'}
                </div>
                <div class="min-w-0 flex-1 overflow-hidden">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[9px] font-extrabold uppercase tracking-wider text-amber-400 shrink-0">📖 Continue Reading</span>
                        <span class="text-[9px] font-mono text-emerald-400 font-bold shrink-0">${pct}% • p.${latest.currentPage}/${latest.totalPages}</span>
                    </div>
                    <p class="text-xs font-extrabold text-white truncate block max-w-full" title="${escapeHtml(latest.title)}">${escapeHtml(shortTitle)}</p>
                    <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-1">
                        <div class="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full" style="width:${pct}%"></div>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                <button type="button" onclick="window.launchPipMiniCockpitWidget()" class="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-2 py-1.5 rounded-xl text-[10px] font-bold" title="Pop Out Interactive Always-On-Top Mini-Cockpit">🖼️ PiP</button>
                <button type="button" onclick="openBookAtPage('${safeLatestId}', ${latest.currentPage || 1})" class="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold shadow">Resume ➔</button>
            </div>
        `;
    }

    let pipVideoEl = null, pipCanvasEl = null, pipRenderInterval = null;
    window.launchPipMiniCockpitWidget = async function() {
        if ('documentPictureInPicture' in window) {
            try {
                if (window.documentPictureInPicture.window) {
                    window.documentPictureInPicture.window.close();
                    return;
                }
                const pipWin = await window.documentPictureInPicture.requestWindow({ width: 360, height: 210 });
                pipWin.document.body.style.cssText = 'margin:0;background:#020617;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;justify-content:space-between;padding:12px;user-select:none;';
                pipWin.document.body.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:10px;font-weight:800;color:#60a5fa;text-transform:uppercase;">⚡ DEENTIMER PRO</span>
                        <span id="dpip-salah" style="font-size:11px;font-family:monospace;color:#34d399;font-weight:800;">🕋 0/5</span>
                    </div>
                    <div id="dpip-clock" style="font-size:48px;font-family:monospace;font-weight:900;text-align:center;line-height:1;margin:4px 0;">00:00</div>
                    <div id="dpip-title" style="font-size:11px;color:#cbd5e1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Ready</div>
                    <div style="display:flex;gap:6px;margin-top:8px;">
                        <button id="dpip-toggle" style="flex:1;background:#2563eb;color:#fff;border:none;border-radius:8px;padding:7px;font-size:11px;font-weight:800;cursor:pointer;">▶️ Start / Pause</button>
                        <button id="dpip-done" style="flex:1;background:#059669;color:#fff;border:none;border-radius:8px;padding:7px;font-size:11px;font-weight:800;cursor:pointer;">✓ Complete</button>
                    </div>
                `;
                pipWin.document.getElementById('dpip-toggle').onclick = () => { if (window.isRunning) window.stopTimer(); else window.startTimer(); };
                pipWin.document.getElementById('dpip-done').onclick = () => window.completeSession();
                const syncInt = setInterval(() => {
                    if (pipWin.closed) { clearInterval(syncInt); return; }
                    pipWin.document.getElementById('dpip-clock').textContent = document.getElementById('time-display')?.textContent || '00:00';
                    pipWin.document.getElementById('dpip-title').textContent = document.getElementById('session-type')?.textContent || '';
                    pipWin.document.getElementById('dpip-salah').textContent = `🕋 ${document.getElementById('salah-score-badge')?.textContent || '0/5'}`;
                }, 400);
                return;
            } catch (e) {}
        }

        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                clearInterval(pipRenderInterval);
                return;
            }
            if (!pipCanvasEl) {
                pipCanvasEl = document.createElement('canvas');
                pipCanvasEl.width = 420; pipCanvasEl.height = 220;
                pipVideoEl = document.createElement('video');
                pipVideoEl.muted = true; pipVideoEl.playsInline = true;
                pipVideoEl.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0.01;pointer-events:none;';
                document.body.appendChild(pipVideoEl);
            }
            const drawPipFrame = () => {
                const ctx = pipCanvasEl.getContext('2d');
                ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, 420, 220);
                ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 4; ctx.strokeRect(4, 4, 412, 212);
                ctx.fillStyle = '#60a5fa'; ctx.font = 'bold 14px Inter, sans-serif';
                ctx.fillText(`⚡ DEENTIMER PRO  •  ${document.getElementById('current-phase-display')?.textContent || 'READY'}`, 20, 32);
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 64px monospace';
                ctx.fillText(document.getElementById('time-display')?.textContent || '00:00', 20, 108);
                ctx.fillStyle = '#34d399'; ctx.font = 'bold 15px monospace';
                ctx.fillText(`🧠 Study: ${document.getElementById('hud-study-hours-text')?.textContent || '0.0h'}   🕋 Salah: ${document.getElementById('salah-score-badge')?.textContent || '0/5'}`, 20, 152);
                const latestBook = readerBooks[0];
                ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 13px Inter, sans-serif';
                ctx.fillText(latestBook ? `📖 ${latestBook.title.slice(0, 32)} (p.${latestBook.currentPage}/${latestBook.totalPages})` : '📖 PomoReader Ready', 20, 188);
            };
            drawPipFrame();
            clearInterval(pipRenderInterval);
            pipRenderInterval = setInterval(drawPipFrame, 800);
            if (!pipVideoEl.srcObject) pipVideoEl.srcObject = pipCanvasEl.captureStream(10);
            await pipVideoEl.play();
            await pipVideoEl.requestPictureInPicture();
        } catch (e) { showToast("PiP Widget requires Desktop Browser.", true); }
    };

    /* =========================================================================
       4. SMART BOOK IMPORT + TRUE PDF CHAPTER AUTO-DETECTOR (WITH WORKER CLEANUP)
       ========================================================================= */
    async function computeBookFingerprint(file, arrayBuffer) {
        const bytes = new Uint8Array(arrayBuffer);
        let hash = 2166136261;
        const step = Math.max(1, Math.floor(bytes.length / 4096));
        for (let i = 0; i < bytes.length; i += step) {
            hash ^= bytes[i];
            hash = Math.imul(hash, 16777619);
        }
        return 'book_' + (hash >>> 0).toString(16) + '_' + bytes.length;
    }

    async function generatePdfCoverAndMeta(arrayBuffer) {
        const info = { totalPages: 1, author: '', creator: '', producer: '', coverDataUrl: '', outline: [], pagesText: [] };
        if (typeof pdfjsLib === 'undefined') return info;
        let pdf = null;
        try {
            pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
            info.totalPages = pdf.numPages || 1;
            try {
                const meta = await pdf.getMetadata();
                if (meta?.info) {
                    info.author = meta.info.Author || '';
                    info.creator = meta.info.Creator || '';
                    info.producer = meta.info.Producer || '';
                }
            } catch (e) {}

            try {
                const rawOutline = await pdf.getOutline();
                if (Array.isArray(rawOutline) && rawOutline.length > 0) {
                    const flatItems = [];
                    const walkOutline = (items, level = 1) => {
                        (items || []).forEach(it => {
                            if (it && it.title) flatItems.push({ ...it, level });
                            if (it?.items?.length && level < 3) walkOutline(it.items, level + 1);
                        });
                    };
                    walkOutline(rawOutline, 1);

                    for (let i = 0; i < Math.min(flatItems.length, 100); i++) {
                        const it = flatItems[i];
                        let resolvedPage = i + 1;
                        try {
                            let dest = it.dest;
                            if (typeof dest === 'string') dest = await pdf.getDestination(dest);
                            if (Array.isArray(dest) && dest[0]) {
                                const pIdx = await pdf.getPageIndex(dest[0]);
                                resolvedPage = pIdx + 1;
                            }
                        } catch (e) {}
                        info.outline.push({
                            id: 'ch_' + Date.now() + '_' + i,
                            title: String(it.title).replace(/\s+/g, ' ').trim(),
                            page: Math.max(1, Math.min(info.totalPages, resolvedPage)),
                            level: it.level || 1
                        });
                    }
                }
            } catch (e) {}

            const scanLimit = Math.min(info.totalPages, 45);
            const seenKeys = new Set();
            for (let p = 1; p <= scanLimit; p++) {
                try {
                    const pg = await pdf.getPage(p);
                    const vp = pg.getViewport({ scale: 1.0 });
                    const tc = await pg.getTextContent();
                    info.pagesText.push(tc.items.map(i => i.str).join(' '));

                    if (info.outline.length < 2) {
                        const lines = [];
                        let fhSum = 0, fhCount = 0;
                        tc.items.forEach(item => {
                            if (!item.str || !item.str.trim()) return;
                            const m = pdfjsLib.Util.transform(vp.transform, item.transform);
                            const fh = Math.hypot(m[2], m[3]);
                            const y = m[5] / vp.height;
                            const x = m[4] / vp.width;
                            fhSum += fh; fhCount++;
                            const last = lines[lines.length - 1];
                            if (last && Math.abs(last.y - y) < 0.011) {
                                last.text += ' ' + item.str.trim();
                                last.maxFh = Math.max(last.maxFh, fh);
                            } else {
                                lines.push({ y, x, text: item.str.trim(), maxFh: fh });
                            }
                        });
                        const avgFh = fhCount ? (fhSum / fhCount) : 12;
                        lines.forEach(ln => {
                            const t = ln.text.replace(/\s+/g, ' ').trim();
                            if (t.length < 3 || t.length > 105 || /^page\s+\d+$/i.test(t)) return;
                            const tocMatch = t.match(/^([0-9IVX]+\.?\s+[A-Za-z].*?)\s*\.{2,}\s*(\d+)$/);
                            if (tocMatch) {
                                const targetP = Math.max(1, Math.min(info.totalPages, parseInt(tocMatch[2]) || p));
                                const k = tocMatch[1].toLowerCase().slice(0, 30);
                                if (!seenKeys.has(k)) {
                                    seenKeys.add(k);
                                    info.outline.push({ id: 'ch_' + Date.now() + '_' + info.outline.length, title: tocMatch[1].trim(), page: targetP, level: 1 });
                                }
                            } else if (
                                /^(chapter|unit|section|part)\s+([0-9ivx]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(t) ||
                                (ln.maxFh >= avgFh * 1.26 && t.length >= 4 && t.length <= 85 && !/[.!?]$/.test(t))
                            ) {
                                const k = t.toLowerCase().slice(0, 30);
                                if (!seenKeys.has(k)) {
                                    seenKeys.add(k);
                                    info.outline.push({ id: 'ch_' + Date.now() + '_' + info.outline.length, title: t, page: p, level: 1 });
                                }
                            }
                        });
                    }
                } catch (e) {}
            }

            const page = await pdf.getPage(1);
            const vp = page.getViewport({ scale: 0.45 });
            const canvas = document.createElement('canvas');
            canvas.width = vp.width; canvas.height = vp.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            info.coverDataUrl = canvas.toDataURL('image/jpeg', 0.78);
        } catch (e) {
        } finally {
            if (pdf) {
                try { await pdf.destroy(); } catch (err) {}
            }
        }
        return info;
    }

    function openManualImportPriorityModal() {
        const sel = document.getElementById('v45-import-genre-select');
        const newInp = document.getElementById('v45-import-new-genre-inp');
        if (!sel) { document.getElementById('reader-book-file-input').click(); return; }
        if (newInp) newInp.value = '';
        sel.innerHTML = customShelves.map(sh => `<option value="${escapeHtml(sh.name)}" data-cat="${sh.category}">🪵 ${escapeHtml(sh.name)} (${sh.category.toUpperCase()})</option>`).join('');
        document.getElementById('v45-manual-import-modal').classList.remove('hidden');
    }

    document.getElementById('v45-close-manual-import')?.addEventListener('click', () => document.getElementById('v45-manual-import-modal').classList.add('hidden'));
    document.getElementById('v45-proceed-file-pick-btn')?.addEventListener('click', () => {
        const newGenreName = (document.getElementById('v45-import-new-genre-inp')?.value || '').trim();
        const catVal = document.getElementById('v45-import-cat-select')?.value || 'study';
        const existingSel = document.getElementById('v45-import-genre-select');
        let chosenShelf = existingSel?.value || (customShelves[0]?.name || 'General Shelf');
        let chosenCat = existingSel?.selectedOptions?.[0]?.getAttribute('data-cat') || catVal;

        if (newGenreName) {
            chosenShelf = newGenreName;
            chosenCat = catVal;
            if (!customShelves.some(s => s.name.toLowerCase() === newGenreName.toLowerCase())) {
                customShelves.push({ id: 'sh_' + Date.now(), name: newGenreName, category: chosenCat });
                saveReaderMeta();
            }
        }
        pendingManualGenreChoice = { shelfName: chosenShelf, category: chosenCat, isManual: true };
        document.getElementById('v45-manual-import-modal').classList.add('hidden');
        document.getElementById('reader-book-file-input').click();
    });

    async function importBookFileObject(file, sourceTag = 'local', fileHandle = null, manualChoice = null) {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (!['pdf', 'epub', 'txt', 'md', 'docx', 'html', 'htm'].includes(ext)) return null;

        const arrayBuffer = await file.arrayBuffer();
        const bookId = await computeBookFingerprint(file, arrayBuffer);

        let existing = readerBooks.find(b => b.id === bookId || (b.fileName === file.name && b.fileSize === file.size));
        if (existing) {
            if (!existing.sources.includes(sourceTag)) existing.sources.push(sourceTag);
            if (manualChoice && manualChoice.isManual) {
                existing.shelfName = manualChoice.shelfName;
                existing.category = manualChoice.category;
                existing.manualGenreLock = true;
                existing.lastOpened = Date.now();
                existing.lastModified = Date.now();
            }
            existing.isOffloadedZeroStorage = false;
            const prevStored = await idbGet('bookFiles', existing.id);
            await idbPut('bookFiles', {
                id: existing.id,
                originalBytes: arrayBuffer,
                bakedBytes: null,
                structuredPages: prevStored?.structuredPages || null,
                extractedPagesText: prevStored?.extractedPagesText || []
            });
            if (fileHandle) await idbPut('handles', { key: 'file_' + existing.id, handle: fileHandle });
            saveReaderMeta();
            return existing;
        }

        let totalPages = 1, author = 'Unknown Author', creator = 'Standard File', producer = ext.toUpperCase(), coverDataUrl = '', outline = [];
        let extractedPagesText = [];

        if (ext === 'pdf') {
            const pdfMeta = await generatePdfCoverAndMeta(arrayBuffer);
            totalPages = pdfMeta.totalPages;
            if (pdfMeta.author) author = pdfMeta.author;
            if (pdfMeta.creator) creator = pdfMeta.creator;
            if (pdfMeta.producer) producer = pdfMeta.producer;
            coverDataUrl = pdfMeta.coverDataUrl;
            outline = pdfMeta.outline;
            extractedPagesText = pdfMeta.pagesText || [];
        } else if (['txt', 'md', 'html', 'htm'].includes(ext)) {
            const text = new TextDecoder('utf-8').decode(arrayBuffer);
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i += 42) {
                const chunk = lines.slice(i, i + 42);
                const pageIdx = extractedPagesText.length + 1;
                chunk.forEach(ln => {
                    const tr = ln.trim();
                    if (/^(#\s+|chapter\s+\d+|section\s+\d+)/i.test(tr) && tr.length < 90) {
                        outline.push({ id: 'ch_' + Date.now() + '_' + outline.length, title: tr.replace(/^#+\s*/, ''), page: pageIdx, level: 1 });
                    }
                });
                extractedPagesText.push(chunk.join('\n'));
            }
            if (!extractedPagesText.length) extractedPagesText.push(text || 'Empty file');
            totalPages = extractedPagesText.length;
        } else if (['epub', 'docx'].includes(ext) && typeof JSZip !== 'undefined') {
            try {
                const zip = await JSZip.loadAsync(arrayBuffer);
                const fNames = Object.keys(zip.files).filter(n => /\.(xhtml|html|xml)$/i.test(n));
                for (const fn of fNames.slice(0, 60)) {
                    const raw = await zip.files[fn].async('string');
                    const hMatch = raw.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
                    const stripped = raw.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                    if (stripped.length > 80) {
                        const startP = extractedPagesText.length + 1;
                        if (hMatch && hMatch[1]) {
                            const hClean = hMatch[1].replace(/<[^>]+>/g, '').trim();
                            if (hClean.length >= 3 && hClean.length <= 90) {
                                outline.push({ id: 'ch_' + Date.now() + '_' + outline.length, title: hClean, page: startP, level: 1 });
                            }
                        }
                        for (let c = 0; c < stripped.length; c += 1800) extractedPagesText.push(stripped.slice(c, c + 1800));
                    }
                }
            } catch (e) {}
            if (!extractedPagesText.length) extractedPagesText.push(`Loaded ${file.name}`);
            totalPages = extractedPagesText.length;
        }

        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
        const isDeenGuess = /quran|tafseer|hadith|seerah|fiqh|islam|deen|salah|dua|ummah|kathir|bidaya/i.test(cleanTitle);
        const finalShelfName = (manualChoice && manualChoice.shelfName) ? manualChoice.shelfName : (isDeenGuess ? 'Quran, Tafseer & Hadith' : (customShelves[0]?.name || 'Medical Science & Anatomy'));
        const finalCategory = (manualChoice && manualChoice.category) ? manualChoice.category : (isDeenGuess ? 'deen' : 'study');

        const shelfBooksCount = readerBooks.filter(b => b.shelfName === finalShelfName).length;

        const newBook = {
            id: bookId, title: cleanTitle, author,
            description: `Imported from ${sourceTag.toUpperCase()} (${(file.size / 1048576).toFixed(2)} MB)`,
            fileName: file.name, format: ext, fileSize: file.size,
            totalPages, currentPage: 1, progressPct: Math.min(100, Math.round((1 / Math.max(1, totalPages)) * 100)),
            category: finalCategory, shelfName: finalShelfName,
            readSeq: shelfBooksCount + 1,
            manualGenreLock: Boolean(manualChoice && manualChoice.isManual),
            favorite: false, rating: 5, creator, producer,
            locationPath: readerSettings.mainFolderName ? `${readerSettings.mainFolderName}/${file.name}` : `${sourceTag.toUpperCase()}://${file.name}`,
            sources: [sourceTag], coverDataUrl, readingMins: 0, dailyTargetMins: 30,
            remindOnTarget: true, openMode: 'last', autoSync: true, manualSyncOnly: false,
            pendingCloudSync: false, cloudBinaryAvailable: false, isOffloadedZeroStorage: false,
            telegramFileId: '', gdriveFileId: '', dropboxPath: '',
            rev: 1, lastModified: Date.now(), lastOpened: Date.now(),
            outline, annotations: [], deletedAnnotationIds: []
        };

        await idbPut('bookFiles', { id: bookId, originalBytes: arrayBuffer, bakedBytes: null, extractedPagesText });
        if (coverDataUrl) {
            coverMemoryCache[bookId] = coverDataUrl;
            await idbPut('bookCovers', { id: bookId, coverDataUrl });
        }
        if (fileHandle) await idbPut('handles', { key: 'file_' + bookId, handle: fileHandle });

        readerBooks.unshift(newBook);
        saveReaderMeta();

        if (extractedPagesText.length > 0) {
            window.PomoStudioBridge.syncBookPageIndexToCloud(bookId, extractedPagesText);
        }
        return newBook;
    }

    window.handleMultipleBookImport = async function(fileList, sourceTag = 'local', manualChoice = null) {
        if (!fileList || !fileList.length) return;
        const choiceToUse = manualChoice || pendingManualGenreChoice;
        pendingManualGenreChoice = null;
        showToast(`📥 Importing ${fileList.length} book(s)${choiceToUse ? ` into "${choiceToUse.shelfName}"` : ''}...`);
        let count = 0;
        for (const f of Array.from(fileList)) {
            const added = await importBookFileObject(f, sourceTag, null, choiceToUse);
            if (added) count++;
        }
        renderWoodenShelf();
        renderA9StatsAndClock();
        renderA10MyFiles();
        showToast(`✅ ${count} book(s) ready${choiceToUse ? ` in "${choiceToUse.shelfName}"` : ''}!`);
    };

    document.getElementById('shelf-quick-import-btn')?.addEventListener('click', openManualImportPriorityModal);
    document.getElementById('settings-import-books-btn')?.addEventListener('click', openManualImportPriorityModal);
    document.getElementById('reader-book-file-input')?.addEventListener('change', (e) => {
        handleMultipleBookImport(e.target.files, 'local', pendingManualGenreChoice);
        e.target.value = '';
    });

    const pageReaderEl = document.getElementById('page-reader');
    pageReaderEl?.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
    pageReaderEl?.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer?.files?.length) {
            const targetGenre = activeCustomShelfFilter !== 'all' ? { shelfName: activeCustomShelfFilter, category: 'study', isManual: true } : null;
            handleMultipleBookImport(e.dataTransfer.files, 'local', targetGenre);
        }
    });

    async function pickAndScanMainFolder() {
        if (window.showDirectoryPicker) {
            try {
                const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                mainDirectoryHandle = dirHandle;
                readerSettings.mainFolderName = dirHandle.name;
                await idbPut('handles', { key: 'mainFolder', handle: dirHandle, name: dirHandle.name });
                saveReaderMeta();
                updateMainFolderUI();
                await scanDirectoryForBooks(dirHandle, 'local');
                return;
            } catch (e) { if (e.name === 'AbortError') return; }
        }
        document.getElementById('reader-folder-fallback-input').click();
    }

    async function scanDirectoryForBooks(dirHandle, sourceTag = 'local') {
        if (!dirHandle) return;
        try {
            const perm = await dirHandle.queryPermission({ mode: 'readwrite' });
            if (perm !== 'granted') {
                const req = await dirHandle.requestPermission({ mode: 'readwrite' });
                if (req !== 'granted') return;
            }
            let imported = 0;
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file') {
                    const ext = (entry.name.split('.').pop() || '').toLowerCase();
                    if (['pdf', 'epub', 'txt', 'md', 'docx', 'html'].includes(ext)) {
                        const file = await entry.getFile();
                        const prevLen = readerBooks.length;
                        await importBookFileObject(file, sourceTag, entry, null);
                        if (readerBooks.length > prevLen) imported++;
                    }
                }
            }
            await window.PomoStudioBridge.writeDesktopFolderLibraryIndex();
            renderWoodenShelf();
            renderA10MyFiles();
            showToast(imported > 0 ? `📂 Auto-Imported ${imported} new book(s)` : `📂 Folder "${dirHandle.name}" is up to date.`);
        } catch (e) { showToast("Click 'Scan Now' to grant folder read access.", true); }
    }

    document.getElementById('shelf-scan-folder-btn')?.addEventListener('click', pickAndScanMainFolder);
    document.getElementById('settings-select-main-folder-btn')?.addEventListener('click', pickAndScanMainFolder);
    document.getElementById('settings-rescan-main-folder-btn')?.addEventListener('click', () => {
        if (mainDirectoryHandle) scanDirectoryForBooks(mainDirectoryHandle, 'local');
        else pickAndScanMainFolder();
    });
    document.getElementById('reader-folder-fallback-input')?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const rel = e.target.files[0].webkitRelativePath || '';
            if (rel.includes('/')) {
                readerSettings.mainFolderName = rel.split('/')[0];
                saveReaderMeta();
                updateMainFolderUI();
            }
            handleMultipleBookImport(e.target.files, 'local', null);
        }
    });
    document.getElementById('toggle-auto-folder-import-btn')?.addEventListener('click', () => {
        readerSettings.autoFolderImport = !readerSettings.autoFolderImport;
        saveReaderMeta();
        updateMainFolderUI();
    });

    /* =========================================================================
       5. 3D WOODEN BOOKSHELF & FIXED SMOOTH-SLIDING / WRAP-GRID SHELF BAR
       ========================================================================= */
    function applyWoodThemeStyle() {
        const wrap = document.getElementById('wooden-bookshelf-wrapper');
        if (!wrap) return;
        const styles = {
            walnut: 'linear-gradient(180deg, #2b1d12 0%, #1a110a 100%)',
            oak: 'linear-gradient(180deg, #4a3219 0%, #2d1e0f 100%)',
            mahogany: 'linear-gradient(180deg, #3b1614 0%, #210b0a 100%)',
            ebony: 'linear-gradient(180deg, #171c26 0%, #0b0e14 100%)'
        };
        wrap.style.background = styles[readerSettings.woodStyle] || styles.walnut;
    }

    window.moveBookInShelfSequence = function(bookId, delta) {
        const target = readerBooks.find(b => b.id === bookId);
        if (!target) return;
        const shelfName = target.shelfName || 'General Shelf';
        const peerBooks = readerBooks
            .filter(b => (b.shelfName || 'General Shelf') === shelfName)
            .sort((a, b) => (a.readSeq || 999) - (b.readSeq || 999));

        peerBooks.forEach((b, i) => b.readSeq = i + 1);
        const curIdx = peerBooks.findIndex(b => b.id === bookId);
        const nextIdx = curIdx + delta;
        if (nextIdx < 0 || nextIdx >= peerBooks.length) return;

        const temp = peerBooks[curIdx].readSeq;
        peerBooks[curIdx].readSeq = peerBooks[nextIdx].readSeq;
        peerBooks[nextIdx].readSeq = temp;

        readerSettings.sortBy = 'sequence';
        const sel = document.getElementById('shelf-sort-select');
        if (sel) sel.value = 'sequence';
        saveReaderMeta();
        renderWoodenShelf();
        showToast(`🔢 "${target.title.slice(0, 24)}" moved to Reading Sequence #${peerBooks[curIdx].readSeq}!`);
    };

    window.promptBookExactSequence = function(bookId) {
        const target = readerBooks.find(b => b.id === bookId);
        if (!target) return;
        const shelfName = target.shelfName || 'General Shelf';
        const peerBooks = readerBooks
            .filter(b => (b.shelfName || 'General Shelf') === shelfName)
            .sort((a, b) => (a.readSeq || 999) - (b.readSeq || 999));

        const modal = document.getElementById('reader-suboptions-modal');
        const titleEl = document.getElementById('suboptions-modal-title');
        const bodyEl = document.getElementById('suboptions-modal-body');
        if (!modal || !titleEl || !bodyEl) return;

        titleEl.textContent = `🔢 Set Reading Sequence in "${shelfName}"`;
        bodyEl.innerHTML = `
            <p class="text-xs text-slate-400">Choose the exact reading order (<b class="text-amber-300">#1 to #${peerBooks.length}</b>) for <b class="text-white">${escapeHtml(target.title)}</b>:</p>
            <input type="number" id="book-seq-direct-inp" min="1" max="${peerBooks.length}" value="${target.readSeq || 1}" class="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-center font-mono text-base font-extrabold text-amber-300">
            <button type="button" id="book-seq-direct-save-btn" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 rounded-xl text-xs shadow">✅ Save Reading Sequence</button>
        `;
        modal.classList.remove('hidden');
        document.getElementById('book-seq-direct-save-btn').onclick = () => {
            const desiredPos = Math.max(1, Math.min(peerBooks.length, parseInt(document.getElementById('book-seq-direct-inp')?.value) || 1));
            const filteredPeers = peerBooks.filter(b => b.id !== bookId);
            filteredPeers.splice(desiredPos - 1, 0, target);
            filteredPeers.forEach((b, i) => { b.readSeq = i + 1; });
            readerSettings.sortBy = 'sequence';
            const sel = document.getElementById('shelf-sort-select');
            if (sel) sel.value = 'sequence';
            modal.classList.add('hidden');
            saveReaderMeta();
            renderWoodenShelf();
            showToast(`🔢 "${target.title.slice(0, 24)}" set to Sequence #${desiredPos}!`);
        };
    };

    window.scrollShelvesStripBy = function(deltaPx) {
        const track = document.getElementById('custom-shelves-scroll-track');
        if (track) track.scrollBy({ left: deltaPx, behavior: 'smooth' });
    };

    window.toggleShelfBarWrapMode = function() {
        readerSettings.shelfWrapMode = !readerSettings.shelfWrapMode;
        saveReaderMeta();
        renderCustomShelvesBar();
    };

    function renderCustomShelvesBar() {
        const bar = document.getElementById('custom-shelves-bar');
        if (!bar) return;

        const isWrap = Boolean(readerSettings.shelfWrapMode);

        const pills = customShelves.map((sh, idx) => {
            const cnt = readerBooks.filter(b => b.shelfName === sh.name).length;
            const act = activeCustomShelfFilter === sh.name;
            const safeShName = escapeJsStr(sh.name);
            return `
                <div class="shelf-pill-item shrink-0 inline-flex items-center rounded-xl border ${act ? 'bg-amber-600 border-amber-400 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-amber-200/95 hover:border-amber-500/50'}">
                    <button type="button" onclick="window.selectCustomShelfFilter('${safeShName}')" class="px-3 py-1.5 text-xs font-bold whitespace-nowrap flex items-center gap-1.5 shrink-0">
                        <span class="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">#${idx + 1}</span>
                        <span class="whitespace-nowrap">🪵 ${escapeHtml(sh.name)}</span>
                        <span class="text-[10px] font-mono px-1.5 rounded-full bg-black/40 shrink-0">${cnt}</span>
                    </button>
                    <button type="button" onclick="event.stopPropagation(); window.moveCustomShelfOrder(${idx}, -1)" class="px-1 py-1.5 text-[10px] hover:bg-slate-800 text-amber-300 shrink-0" title="Move Shelf Left / Up">◀</button>
                    <button type="button" onclick="event.stopPropagation(); window.moveCustomShelfOrder(${idx}, 1)" class="px-1 py-1.5 text-[10px] hover:bg-slate-800 text-amber-300 shrink-0" title="Move Shelf Right / Down">▶</button>
                    <button type="button" onclick="event.stopPropagation(); window.deleteGenreShelfByName('${safeShName}')" class="px-1.5 py-1.5 text-[10px] hover:bg-red-600 hover:text-white rounded-r-xl transition-all shrink-0" title="Delete this Genre Shelf">✕</button>
                </div>
            `;
        }).join('');

        bar.innerHTML = `
            <div class="flex items-center justify-between gap-2 w-full">
                ${!isWrap ? `<button type="button" onclick="window.scrollShelvesStripBy(-320)" class="bg-slate-950 hover:bg-amber-600 text-amber-300 hover:text-slate-950 border border-amber-500/40 w-8 h-8 rounded-xl font-extrabold text-xs shrink-0 flex items-center justify-center shadow" title="Slide Shelves Left">◀</button>` : ''}
                <div id="custom-shelves-scroll-track" class="${isWrap ? 'shelves-wrap-grid' : 'shelves-scroll-strip'} flex-1 min-w-0">
                    <button type="button" onclick="window.toggleShelfLayoutMode()" class="shelf-pill-item shrink-0 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap border ${shelfDisplayLayout === 'sections' && activeCustomShelfFilter === 'all' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-950 text-slate-300 border-slate-800'}">🏛️ ${shelfDisplayLayout === 'sections' ? 'Genre Sections' : 'Flat Grid'}</button>
                    <button type="button" onclick="window.selectCustomShelfFilter('all')" class="shelf-pill-item shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${activeCustomShelfFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'bg-slate-950 text-slate-400 border border-slate-800'}">All (${readerBooks.length})</button>
                    ${pills}
                </div>
                ${!isWrap ? `<button type="button" onclick="window.scrollShelvesStripBy(320)" class="bg-slate-950 hover:bg-amber-600 text-amber-300 hover:text-slate-950 border border-amber-500/40 w-8 h-8 rounded-xl font-extrabold text-xs shrink-0 flex items-center justify-center shadow" title="Slide Shelves Right">▶</button>` : ''}
                <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" onclick="window.toggleShelfBarWrapMode()" class="bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-xs font-extrabold px-2.5 py-1.5 rounded-xl shrink-0" title="Switch between Horizontal Slider and Multi-Row Wrapped Grid">${isWrap ? '↔️ Slide View' : '⊞ Wrap All'}</button>
                    <button type="button" onclick="window.openManageShelvesModal()" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow shrink-0">🔢 Manage</button>
                </div>
            </div>
        `;

        const trackEl = document.getElementById('custom-shelves-scroll-track');
        if (trackEl && !isWrap) {
            trackEl.addEventListener('wheel', (e) => {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.preventDefault();
                    trackEl.scrollLeft += e.deltaY * 1.35;
                }
            }, { passive: false });
        }
    }

    window.moveCustomShelfOrder = function(idx, dir) {
        const targetIdx = idx + dir;
        if (targetIdx < 0 || targetIdx >= customShelves.length) return;
        const temp = customShelves[idx];
        customShelves[idx] = customShelves[targetIdx];
        customShelves[targetIdx] = temp;
        saveReaderMeta();
        renderWoodenShelf();
    };

    window.setCustomShelfExactPosition = function(oldIdx, newPos1Based) {
        const targetIdx = Math.max(0, Math.min(customShelves.length - 1, (parseInt(newPos1Based) || 1) - 1));
        if (targetIdx === oldIdx) return;
        const [moved] = customShelves.splice(oldIdx, 1);
        customShelves.splice(targetIdx, 0, moved);
        saveReaderMeta();
        renderWoodenShelf();
        window.openManageShelvesModal();
        showToast(`🔢 "${moved.name}" set to Shelf #${targetIdx + 1}!`);
    };

    window.moveShelfByName = function(shelfName, dir) {
        let idx = customShelves.findIndex(s => s.name === shelfName);
        if (idx === -1) {
            customShelves.push({ id: 'sh_' + Date.now(), name: shelfName, category: 'study' });
            idx = customShelves.length - 1;
        }
        window.moveCustomShelfOrder(idx, dir);
    };

    window.pinShelfToTopByName = function(shelfName) {
        let idx = customShelves.findIndex(s => s.name === shelfName);
        if (idx === -1) {
            customShelves.unshift({ id: 'sh_' + Date.now(), name: shelfName, category: 'study' });
        } else if (idx > 0) {
            const [moved] = customShelves.splice(idx, 1);
            customShelves.unshift(moved);
        }
        saveReaderMeta();
        renderWoodenShelf();
        showToast(`🔝 "${shelfName}" pinned to #1 Top of Wooden Shelf!`);
    };

    window.selectCustomShelfFilter = function(name) { activeCustomShelfFilter = name; renderWoodenShelf(); };
    window.toggleShelfLayoutMode = function() { shelfDisplayLayout = shelfDisplayLayout === 'sections' ? 'grid' : 'sections'; activeCustomShelfFilter = 'all'; renderWoodenShelf(); };

    window.deleteGenreShelfByName = function(genreName) {
        window.customShelves = customShelves.filter(s => s.name !== genreName);
        readerBooks.forEach(b => { if (b.shelfName === genreName) b.shelfName = customShelves[0]?.name || 'General Shelf'; });
        if (activeCustomShelfFilter === genreName) activeCustomShelfFilter = 'all';
        saveReaderMeta();
        renderWoodenShelf();
        showToast(`🗑️ Genre "${genreName}" deleted (Books safely kept on shelf)`);
    };

    window.addBookDirectlyToGenre = function(genreName, cat = 'study') {
        pendingManualGenreChoice = { shelfName: genreName, category: cat, isManual: true };
        document.getElementById('reader-book-file-input').click();
    };

    window.renderWoodenShelf = function() {
        applyWoodThemeStyle();
        renderCustomShelvesBar();
        const rowsContainer = document.getElementById('wooden-bookshelf-rows');
        if (!rowsContainer) return;

        document.getElementById('shelf-count-all').textContent = readerBooks.length;
        document.getElementById('shelf-count-fav').textContent = readerBooks.filter(b => b.favorite).length;

        const searchQ = (document.getElementById('shelf-search-input')?.value || '').trim().toLowerCase();
        const sortMode = document.getElementById('shelf-sort-select')?.value || readerSettings.sortBy || 'sequence';

        let filtered = readerBooks.filter(b => {
            if (activeShelfFilter === 'fav' && !b.favorite) return false;
            if (activeShelfFilter === 'study' && b.category !== 'study') return false;
            if (activeShelfFilter === 'deen' && b.category !== 'deen') return false;
            if (activeShelfFilter === 'reading' && ((b.progressPct || 0) <= 0 || (b.progressPct || 0) >= 100)) return false;
            if (activeShelfFilter === 'completed' && (b.progressPct || 0) < 100) return false;
            if (activeCustomShelfFilter !== 'all' && (b.shelfName || 'General Shelf') !== activeCustomShelfFilter) return false;
            if (searchQ) {
                const hay = `${b.title} ${b.author} ${b.description} ${b.fileName} ${b.shelfName || 'General Shelf'}`.toLowerCase();
                if (!hay.includes(searchQ)) return false;
            }
            return true;
        });

        filtered.sort((a, b) => {
            if (sortMode === 'sequence') return (a.readSeq || 999) - (b.readSeq || 999);
            if (sortMode === 'title') return (a.title || '').localeCompare(b.title || '');
            if (sortMode === 'author') return (a.author || '').localeCompare(b.author || '');
            if (sortMode === 'storage') return ((a.sources && a.sources[0]) || '').localeCompare((b.sources && b.sources[0]) || '');
            if (sortMode === 'progress') return (b.progressPct || 0) - (a.progressPct || 0);
            return (b.lastOpened || 0) - (a.lastOpened || 0);
        });

        rowsContainer.innerHTML = '';
        if (!filtered.length) {
            rowsContainer.innerHTML = `<div class="wood-shelf-row py-12 text-center flex flex-col items-center justify-center gap-2"><span class="text-4xl">📚</span><p class="text-sm font-bold text-amber-200">No books in this genre view yet.</p><p class="text-xs text-amber-100/60">Click "➕ Import Books" above (or drag & drop any PDF/EPUB file onto this shelf) to add books!</p></div>`;
            return;
        }

        if ((shelfDisplayLayout === 'sections' && activeCustomShelfFilter === 'all') || searchQ) {
            const groups = {};
            filtered.forEach(b => {
                const s = b.shelfName || 'General Shelf';
                if (!groups[s]) groups[s] = [];
                groups[s].push(b);
            });

            const orderedGroupEntries = Object.entries(groups).sort(([nameA], [nameB]) => {
                const idxA = customShelves.findIndex(s => s.name === nameA);
                const idxB = customShelves.findIndex(s => s.name === nameB);
                return (idxA === -1 ? 9999 : idxA) - (idxB === -1 ? 9999 : idxB);
            });

            orderedGroupEntries.forEach(([shelfName, gBooks], sectionIdx) => {
                const shelfSeqNum = customShelves.findIndex(s => s.name === shelfName);
                const displayNum = shelfSeqNum !== -1 ? shelfSeqNum + 1 : sectionIdx + 1;
                const safeShelfName = escapeJsStr(shelfName);
                const safeFirstBookId = escapeJsStr(gBooks[0].id);

                const sec = document.createElement('div');
                sec.className = "mb-4";
                sec.innerHTML = `
                    <div class="shelf-genre-header">
                        <div class="flex items-center gap-2">
                            <span class="bg-amber-500 text-slate-950 font-mono font-extrabold text-xs px-2 py-0.5 rounded-lg shadow">#${displayNum}</span>
                            <span class="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-200">${escapeHtml(shelfName)}</span>
                            <span class="text-[10px] font-mono font-bold bg-black/40 text-amber-300 px-2 py-0.5 rounded-full">${gBooks.length}</span>
                        </div>
                        <div class="flex items-center gap-1.5 flex-wrap">
                            ${displayNum > 1 ? `<button type="button" onclick="window.pinShelfToTopByName('${safeShelfName}')" class="bg-amber-500/25 hover:bg-amber-500 text-amber-200 hover:text-slate-950 border border-amber-400/50 text-[10px] font-extrabold px-2 py-1 rounded-lg" title="Pin this Shelf to #1 Top">🔝 #1 Top</button>` : `<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-extrabold px-2 py-1 rounded-lg">⭐ TOP SHELF</span>`}
                            <button type="button" onclick="window.moveShelfByName('${safeShelfName}', -1)" class="bg-slate-950/80 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-1 rounded-lg" title="Move Shelf Up">⬆️</button>
                            <button type="button" onclick="window.moveShelfByName('${safeShelfName}', 1)" class="bg-slate-950/80 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-1 rounded-lg" title="Move Shelf Down">⬇️</button>
                            <button type="button" onclick="window.addBookDirectlyToGenre('${safeShelfName}')" class="bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-500/40 text-[10px] font-bold px-2.5 py-1 rounded-lg">➕ Add Book</button>
                            <button type="button" onclick="window.syncShelfToTodo('${safeShelfName}')" class="bg-blue-950/90 hover:bg-blue-800 text-blue-200 border border-blue-500/40 text-[10px] font-bold px-2.5 py-1 rounded-lg">☑️ Tasks</button>
                            <button type="button" onclick="window.startBookFocusSession('${safeFirstBookId}')" class="bg-emerald-950/90 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-1 rounded-lg">⏱️ Focus</button>
                            <button type="button" onclick="window.deleteGenreShelfByName('${safeShelfName}')" class="bg-red-950/80 hover:bg-red-700 text-red-300 hover:text-white border border-red-600/40 text-[10px] font-bold px-2 py-1 rounded-lg" title="Delete Genre Shelf">🗑️</button>
                        </div>
                    </div>
                `;
                rowsContainer.appendChild(sec);
                renderPlankCards(sec, gBooks);
            });
        } else {
            renderPlankCards(rowsContainer, filtered);
        }
    };

    function renderPlankCards(parentEl, list) {
        const perRow = window.innerWidth >= 900 ? 4 : 3;
        for (let i = 0; i < list.length; i += perRow) {
            const slice = list.slice(i, i + perRow);
            const rowEl = document.createElement('div');
            rowEl.className = "wood-shelf-row grid grid-cols-3 md:grid-cols-4 gap-5 px-2 pt-2";
            slice.forEach((book, idxInSlice) => {
                const seqNum = book.readSeq || (i + idxInSlice + 1);
                const curP = Math.max(1, book.currentPage || 1);
                const totP = Math.max(1, book.totalPages || 1);
                const pct = Math.min(100, Math.round((curP / totP) * 100));
                const catBadge = book.category === 'deen' ? '🕌' : (book.category === 'study' ? '🧠' : '🚀');
                const fmtLabel = book.format === 'pbook' ? '📖 BOOK-OS' : (book.format || 'pdf').toUpperCase();
                const coverUrl = coverMemoryCache[book.id] || book.coverDataUrl || '';
                const safeBookId = escapeJsStr(book.id);

                const card = document.createElement('div');
                card.className = "book-card-3d group";
                if (coverUrl) {
                    card.style.backgroundImage = `linear-gradient(180deg, rgba(2,6,23,0.28) 0%, rgba(2,6,23,0.95) 82%), url('${coverUrl}')`;
                    card.style.backgroundSize = 'cover';
                    card.style.backgroundPosition = 'center';
                }
                card.onclick = () => openBookInReader(book.id);
                card.innerHTML = `
                    <button class="book-corner-menu-btn" title="Book Details, Cover & PomoCloud Offload" onclick="event.stopPropagation(); window.openBookCornerModal('${safeBookId}')">⋮</button>
                    <div class="p-2.5 flex flex-col gap-1">
                        <div class="flex items-center gap-1 flex-wrap pr-7">
                            <div class="inline-flex items-center bg-slate-950/95 border border-amber-500/60 rounded-md overflow-hidden shadow">
                                <button type="button" onclick="event.stopPropagation(); window.moveBookInShelfSequence('${safeBookId}', -1)" class="px-1 py-0.5 text-[9px] text-amber-300 hover:bg-amber-600 hover:text-slate-950 font-bold" title="Move Book Earlier in Reading Sequence">◀</button>
                                <button type="button" onclick="event.stopPropagation(); window.promptBookExactSequence('${safeBookId}')" class="px-1.5 py-0.5 text-[9px] font-mono font-extrabold text-amber-300 hover:bg-slate-800" title="Click to set exact Reading Sequence #">#${seqNum}</button>
                                <button type="button" onclick="event.stopPropagation(); window.moveBookInShelfSequence('${safeBookId}', 1)" class="px-1 py-0.5 text-[9px] text-amber-300 hover:bg-amber-600 hover:text-slate-950 font-bold" title="Move Book Later in Reading Sequence">▶</button>
                            </div>
                            <span class="bg-slate-950/90 text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${book.format === 'pbook' ? 'border-emerald-400 text-emerald-300' : 'border-slate-700 text-white'}">${catBadge} ${fmtLabel}</span>
                            ${book.isOffloadedZeroStorage ? '<span class="bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[8px] font-mono px-1 rounded" title="0MB Local Cloud-Only Mode">☁️0MB</span>' : ''}
                            ${book.favorite ? '<span class="text-xs">❤️</span>' : ''}
                        </div>
                        <button type="button" onclick="event.stopPropagation(); window.openAssignShelfModal('${safeBookId}')" class="bg-amber-950/90 hover:bg-amber-700 text-amber-300 hover:text-white border border-amber-500/50 text-[9px] font-extrabold px-2 py-0.5 rounded-md w-fit max-w-full truncate flex items-center gap-1">
                            <span>🪵 ${escapeHtml(book.shelfName || 'General Shelf')}</span> <span>⇄</span>
                        </button>
                    </div>
                    <div class="p-2.5 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex flex-col gap-1">
                        <h4 class="text-xs font-extrabold text-white line-clamp-2 leading-snug">${escapeHtml(book.title)}</h4>
                        <p class="text-[10px] text-slate-300 truncate">${escapeHtml(book.author || 'Unknown Author')}</p>
                        <div class="flex items-center justify-between text-[10px] font-mono mt-0.5">
                            <span class="text-emerald-400 font-bold">${pct}%</span>
                            <span class="text-slate-400">p.${curP}/${totP}</span>
                        </div>
                        <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div class="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full" style="width: ${pct}%"></div>
                        </div>
                        <div class="grid grid-cols-4 gap-1 mt-1.5 pt-1 border-t border-slate-800/80">
                            <button type="button" onclick="event.stopPropagation(); window.startBookFocusSession('${safeBookId}')" class="bg-emerald-600/25 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[9px] font-bold py-1 rounded" title="Start Reading Focus Session">⏱️</button>
                            <button type="button" onclick="event.stopPropagation(); window.openILovePdfStudioModal && window.openILovePdfStudioModal('${safeBookId}')" class="bg-rose-600/25 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-[9px] font-bold py-1 rounded" title="PomoDoc Forge & True-Layout Book Converter">🛠️</button>
                            <button type="button" onclick="event.stopPropagation(); window.quickAddBookToTodo('${safeBookId}')" class="bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-[9px] font-bold py-1 rounded" title="Add Book to PomoTasks">☑️</button>
                            <button type="button" onclick="event.stopPropagation(); window.uploadBookBinaryToWirelessCloud('${safeBookId}')" class="bg-cyan-600/25 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 text-[9px] font-bold py-1 rounded" title="Push Book & Page-Index to PomoCloud / External Studio Bridge">☁️</button>
                        </div>
                    </div>
                `;
                rowEl.appendChild(card);
            });
            parentEl.appendChild(rowEl);
        }
    }

    document.querySelectorAll('.shelf-filter-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeShelfFilter = e.currentTarget.getAttribute('data-filter');
            document.querySelectorAll('.shelf-filter-tab').forEach(b => {
                b.className = "shelf-filter-tab bg-slate-950 text-slate-300 border border-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0";
            });
            e.currentTarget.className = "shelf-filter-tab bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow shrink-0";
            renderWoodenShelf();
        });
    });
    document.getElementById('shelf-search-input')?.addEventListener('input', renderWoodenShelf);
    document.getElementById('shelf-sort-select')?.addEventListener('change', (e) => {
        readerSettings.sortBy = e.target.value;
        saveReaderMeta();
        renderWoodenShelf();
    });

    window.openManageShelvesModal = function() {
        const modal = document.getElementById('reader-suboptions-modal');
        const titleEl = document.getElementById('suboptions-modal-title');
        const bodyEl = document.getElementById('suboptions-modal-body');
        titleEl.textContent = "🔢 Sequence & Manage Genres / Shelves";
        bodyEl.innerHTML = `
            <p class="text-[11px] text-slate-400">Type a sequence number (<b class="text-amber-300">1, 2, 3...</b>) or click <b class="text-amber-300">🔝 #1</b> to keep your primary study shelf at the top!</p>
            <div class="flex gap-2">
                <input type="text" id="new-shelf-inp" placeholder="New Genre / Shelf Name..." class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                <select id="new-shelf-cat" class="bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white font-bold">
                    <option value="study">🧠 Study</option><option value="deen">🕌 Deen</option><option value="side">🚀 Life</option>
                </select>
                <button type="button" id="create-shelf-btn" class="bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs">＋ Create</button>
            </div>
            <div class="flex flex-col gap-1.5 max-h-64 native-scroll mt-2">
                ${customShelves.map((sh, i) => {
                    const safeName = escapeJsStr(sh.name);
                    return `
                        <div class="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border ${i === 0 ? 'border-amber-500/60 bg-amber-950/15' : 'border-slate-800'} gap-2">
                            <div class="flex items-center gap-2 min-w-0 flex-1">
                                <input type="number" min="1" max="${customShelves.length}" value="${i + 1}" onchange="window.setCustomShelfExactPosition(${i}, this.value)" class="w-11 bg-slate-900 border border-amber-500/50 rounded-lg py-1 text-center font-mono text-xs font-extrabold text-amber-300">
                                <div class="truncate">
                                    <span class="text-xs font-bold text-amber-300">🪵 ${escapeHtml(sh.name)}</span>
                                    <span class="text-[10px] text-slate-500 ml-1">(${readerBooks.filter(b => b.shelfName === sh.name).length})</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-1 shrink-0">
                                ${i > 0 ? `<button type="button" onclick="window.setCustomShelfExactPosition(${i}, 1)" class="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-1 rounded font-extrabold">🔝 #1</button>` : `<span class="text-[9px] font-mono font-extrabold text-emerald-400 px-1.5">TOP</span>`}
                                <button type="button" onclick="window.moveCustomShelfOrder(${i}, -1); window.openManageShelvesModal();" class="text-xs bg-slate-900 border border-slate-800 px-1.5 py-1 rounded">⬆️</button>
                                <button type="button" onclick="window.moveCustomShelfOrder(${i}, 1); window.openManageShelvesModal();" class="text-xs bg-slate-900 border border-slate-800 px-1.5 py-1 rounded">⬇️</button>
                                <button type="button" onclick="document.getElementById('reader-suboptions-modal').classList.add('hidden'); window.addBookDirectlyToGenre('${safeName}', '${sh.category}')" class="text-[10px] bg-blue-950 text-blue-300 border border-blue-700/50 px-2 py-1 rounded font-bold">➕ Book</button>
                                <button type="button" onclick="window.deleteCustomShelf(${i})" class="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1 rounded bg-slate-900 border border-slate-800">🗑️</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        modal.classList.remove('hidden');
        document.getElementById('create-shelf-btn').onclick = () => {
            const name = (document.getElementById('new-shelf-inp').value || '').trim();
            const cat = document.getElementById('new-shelf-cat').value;
            if (name && !customShelves.some(s => s.name.toLowerCase() === name.toLowerCase())) {
                customShelves.push({ id: 'sh_' + Date.now(), name, category: cat });
                saveReaderMeta();
                renderWoodenShelf();
                window.openManageShelvesModal();
            }
        };
    };

    window.deleteCustomShelf = function(idx) {
        const removed = customShelves.splice(idx, 1)[0];
        if (removed) {
            readerBooks.forEach(b => { if (b.shelfName === removed.name) b.shelfName = customShelves[0]?.name || 'General Shelf'; });
            if (activeCustomShelfFilter === removed.name) activeCustomShelfFilter = 'all';
        }
        saveReaderMeta();
        renderWoodenShelf();
        window.openManageShelvesModal();
    };

    window.openAssignShelfModal = function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const safeBookId = escapeJsStr(b.id);
        const modal = document.getElementById('reader-suboptions-modal');
        const titleEl = document.getElementById('suboptions-modal-title');
        const bodyEl = document.getElementById('suboptions-modal-body');
        titleEl.textContent = `🪵 Move "${b.title}" to Genre / Shelf`;
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-1.5 max-h-60 native-scroll">
                ${customShelves.map(sh => `
                    <button type="button" onclick="window.assignBookToShelf('${safeBookId}', '${escapeJsStr(sh.name)}', '${sh.category}')" class="w-full p-3 rounded-xl border text-left text-xs font-bold flex justify-between ${b.shelfName === sh.name ? 'bg-amber-600 text-white border-amber-400' : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-amber-500/50'}">
                        <span>🪵 ${escapeHtml(sh.name)}</span><span>${b.shelfName === sh.name ? '✓ Current Shelf' : 'Move Here ➔'}</span>
                    </button>
                `).join('')}
            </div>
            <div class="flex gap-2 mt-2 pt-2 border-t border-slate-800">
                <input type="text" id="move-new-genre-inp" placeholder="Or type a new Genre to move into..." class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                <button type="button" id="move-new-genre-btn" class="bg-emerald-600 text-white font-bold px-3 py-2 rounded-xl text-xs">＋ Move</button>
            </div>
        `;
        modal.classList.remove('hidden');
        document.getElementById('move-new-genre-btn').onclick = () => {
            const newG = (document.getElementById('move-new-genre-inp').value || '').trim();
            if (newG) {
                if (!customShelves.some(s => s.name.toLowerCase() === newG.toLowerCase())) {
                    customShelves.push({ id: 'sh_' + Date.now(), name: newG, category: b.category || 'study' });
                }
                window.assignBookToShelf(b.id, newG, b.category || 'study');
            }
        };
    };

    window.assignBookToShelf = function(bookId, shelfName, cat) {
        const b = readerBooks.find(x => x.id === bookId);
        if (b) {
            b.shelfName = shelfName;
            if (cat) b.category = cat;
            b.manualGenreLock = true;
            b.lastModified = Date.now();
            saveReaderMeta();
            renderWoodenShelf();
            showToast(`📘 Moved "${b.title}" to "${shelfName}"`);
        }
        document.getElementById('reader-suboptions-modal').classList.add('hidden');
    };

    window.quickAddBookToTodo = function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const today = getLocalTodayString();
        todos.unshift({
            id: Date.now(),
            title: `📖 [${b.shelfName || 'Shelf'}] Read ${b.title} (p.${b.currentPage || 1})`,
            completed: false, important: true, myDayDate: today, dueDate: today,
            repeat: { type: 'none' }, steps: [], note: `Genre: ${b.shelfName || 'General'}`,
            listId: 'tasks', bookId: b.id, bookPage: b.currentPage || 1
        });
        saveTodos(); renderTodos();
        showToast(`☑️ "${b.title}" added to PomoTasks!`);
    };

    window.syncShelfToTodo = function(shelfName) {
        const books = readerBooks.filter(b => (b.shelfName || 'General Shelf') === shelfName);
        if (!books.length) return;
        let listObj = todoLists.find(l => l.name.toLowerCase() === shelfName.toLowerCase());
        if (!listObj) {
            listObj = { id: 'list_' + Date.now(), name: shelfName };
            todoLists.push(listObj);
        }
        const today = getLocalTodayString();
        books.forEach((b, i) => {
            if (!todos.some(t => t.bookId === b.id && !t.completed)) {
                todos.unshift({
                    id: Date.now() + i,
                    title: `📖 ${b.title} (p.${b.currentPage || 1}/${b.totalPages || 1})`,
                    completed: false, important: false, myDayDate: today, dueDate: today,
                    repeat: { type: 'none' }, steps: [], note: `Genre: ${shelfName}`,
                    listId: listObj.id, bookId: b.id, bookPage: b.currentPage || 1
                });
            }
        });
        saveTodos(); renderTodoListsBar(); renderTodos();
        showToast(`☑️ Synced Genre "${shelfName}" to PomoTasks!`);
    };

    window.startBookFocusSession = function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const durMins = b.dailyTargetMins || 45;
        schedule.splice(currentStepIndex, 0, {
            id: Date.now(), type: 'work',
            category: b.category === 'deen' ? 'deen' : 'study',
            title: `📖 ${b.title}`, duration: durMins * 60, bookId: b.id
        });
        safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
        loadStep(currentStepIndex, false);
        startTimer();
        openBookInReader(b.id, b.currentPage || 1);
    };

    window.openBookCornerModal = function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        activeCornerBookId = bookId;
        document.getElementById('corner-book-title-input').value = b.title || '';
        document.getElementById('corner-book-author-input').value = b.author || '';
        document.getElementById('corner-book-desc-input').value = b.description || '';
        document.getElementById('corner-book-category-select').value = b.category || 'study';
        document.getElementById('corner-book-source-select').value = (b.sources && b.sources[0]) || 'local';
        const pct = Math.min(100, Math.round(((b.currentPage || 1) / Math.max(1, b.totalPages || 1)) * 100));
        document.getElementById('corner-progress-label').textContent = `${pct}% (${b.currentPage} / ${b.totalPages} pages)`;
        document.getElementById('corner-progress-bar').style.width = `${pct}%`;

        const cov = document.getElementById('corner-modal-cover-preview');
        const cUrl = coverMemoryCache[b.id] || b.coverDataUrl || '';
        if (cUrl) { cov.style.backgroundImage = `url('${cUrl}')`; cov.textContent = ''; }
        else { cov.style.backgroundImage = 'none'; cov.textContent = b.title.slice(0, 18); }
        document.getElementById('corner-toggle-fav-btn').textContent = b.favorite ? '❤️ Favorited' : '🤍 Favorite';

        const cornerDelBtn = document.getElementById('corner-delete-book-btn');
        if (cornerDelBtn && !document.getElementById('corner-offload-zero-storage-btn')) {
            const offBtn = document.createElement('button');
            offBtn.type = 'button';
            offBtn.id = 'corner-offload-zero-storage-btn';
            offBtn.className = "bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold px-3 py-2 rounded-xl";
            offBtn.innerHTML = "☁️ 0MB Cloud-Only Mode";
            offBtn.title = "Free heavy local PDF storage while keeping Book Cover, Chapters, Progress, Highlights & Notes on Shelf";
            offBtn.onclick = () => {
                if (activeCornerBookId) window.offloadBookBinaryToSaveLocalSpace(activeCornerBookId);
            };
            cornerDelBtn.parentElement?.insertBefore(offBtn, cornerDelBtn);
        }

        document.getElementById('book-corner-modal').classList.remove('hidden');
    };

    document.getElementById('close-book-corner-modal-btn')?.addEventListener('click', () => document.getElementById('book-corner-modal').classList.add('hidden'));
    document.getElementById('corner-toggle-fav-btn')?.addEventListener('click', () => {
        const b = readerBooks.find(x => x.id === activeCornerBookId);
        if (!b) return;
        b.favorite = !b.favorite;
        b.lastModified = Date.now();
        document.getElementById('corner-toggle-fav-btn').textContent = b.favorite ? '❤️ Favorited' : '🤍 Favorite';
        saveReaderMeta(); renderWoodenShelf();
    });
    document.getElementById('corner-upload-cover-btn')?.addEventListener('click', () => document.getElementById('book-cover-file-input').click());
    document.getElementById('book-cover-file-input')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !activeCornerBookId) return;
        const r = new FileReader();
        r.onload = async () => {
            const b = readerBooks.find(x => x.id === activeCornerBookId);
            if (b) {
                coverMemoryCache[b.id] = r.result;
                await idbPut('bookCovers', { id: b.id, coverDataUrl: r.result });
                saveReaderMeta(); window.openBookCornerModal(b.id); renderWoodenShelf();
            }
        };
        r.readAsDataURL(file);
    });
    document.getElementById('corner-auto-cover-btn')?.addEventListener('click', async () => {
        const b = readerBooks.find(x => x.id === activeCornerBookId);
        if (!b) return;
        const stored = await idbGet('bookFiles', b.id);
        if (stored && stored.originalBytes && b.format === 'pdf') {
            const meta = await generatePdfCoverAndMeta(stored.originalBytes);
            if (meta.coverDataUrl) {
                coverMemoryCache[b.id] = meta.coverDataUrl;
                await idbPut('bookCovers', { id: b.id, coverDataUrl: meta.coverDataUrl });
                if (meta.outline?.length) b.outline = meta.outline;
                if (meta.pagesText?.length) {
                    stored.extractedPagesText = meta.pagesText;
                    await idbPut('bookFiles', stored);
                    window.PomoStudioBridge.syncBookPageIndexToCloud(b.id, meta.pagesText);
                }
                saveReaderMeta(); window.openBookCornerModal(b.id); renderWoodenShelf();
                showToast("⚡ Cover, Chapters & Studio Bridge Index auto-detected from PDF!");
            }
        }
    });
    document.getElementById('corner-save-meta-btn')?.addEventListener('click', () => {
        const b = readerBooks.find(x => x.id === activeCornerBookId);
        if (!b) return;
        b.title = document.getElementById('corner-book-title-input').value.trim() || b.title;
        b.author = document.getElementById('corner-book-author-input').value.trim() || 'Unknown Author';
        b.description = document.getElementById('corner-book-desc-input').value.trim();
        b.category = document.getElementById('corner-book-category-select').value;
        const src = document.getElementById('corner-book-source-select').value;
        if (!b.sources.includes(src)) b.sources.unshift(src);
        b.manualGenreLock = true;
        b.lastModified = Date.now();
        saveReaderMeta(); renderWoodenShelf();
        document.getElementById('book-corner-modal').classList.add('hidden');
        showToast("✅ Book details saved!");
    });
    document.getElementById('corner-open-book-now-btn')?.addEventListener('click', () => {
        document.getElementById('book-corner-modal').classList.add('hidden');
        if (activeCornerBookId) openBookInReader(activeCornerBookId);
    });
    document.getElementById('corner-delete-book-btn')?.addEventListener('click', async () => {
        if (!activeCornerBookId) return;
        window.readerBooks = readerBooks.filter(x => x.id !== activeCornerBookId);
        await idbDelete('bookFiles', activeCornerBookId);
        await idbDelete('bookCovers', activeCornerBookId);
        saveReaderMeta(); renderWoodenShelf();
        document.getElementById('book-corner-modal').classList.add('hidden');
        showToast("🗑️ Book deleted");
    });
    document.getElementById('corner-add-todo-btn')?.addEventListener('click', () => { if (activeCornerBookId) window.quickAddBookToTodo(activeCornerBookId); });
    document.getElementById('corner-add-plan-btn')?.addEventListener('click', () => { if (activeCornerBookId) window.startBookFocusSession(activeCornerBookId); });

    /* =========================================================================
       6. REAL PDF BINARY BAKING (pdf-lib), TELEGRAM FILE_ID CAPTURE & CLOUD SYNC
       ========================================================================= */
    function hexToRgb01(hex) {
        const clean = (hex || '#facc15').replace('#', '');
        const num = parseInt(clean, 16) || 0xfacc15;
        return { r: ((num >> 16) & 255) / 255, g: ((num >> 8) & 255) / 255, b: (num & 255) / 255 };
    }

    async function bakeAnnotationsIntoPdfBytes(book, originalBuffer) {
        if (typeof PDFLib === 'undefined' || book.format !== 'pdf' || !originalBuffer) return originalBuffer;
        try {
            const pdfDoc = await PDFLib.PDFDocument.load(originalBuffer, { ignoreEncryption: true });
            const pages = pdfDoc.getPages();
            for (const ann of (book.annotations || [])) {
                const pIdx = Math.max(0, Math.min(pages.length - 1, (ann.page || 1) - 1));
                const page = pages[pIdx];
                if (!page) continue;
                const { width, height } = page.getSize();
                const c = hexToRgb01(ann.color || '#facc15');
                const rgbColor = PDFLib.rgb(c.r, c.g, c.b);

                if (ann.type === 'highlight' || ann.type === 'note' || ann.type === 'bookmark' || ann.type === 'attachment') {
                    const rects = (Array.isArray(ann.rects) && ann.rects.length)
                        ? ann.rects
                        : [{ x: 0.08, y: ann.yNorm || 0.2, w: 0.84, h: 0.025 }];
                    rects.forEach(rc => {
                        page.drawRectangle({
                            x: rc.x * width,
                            y: (1 - rc.y - rc.h) * height,
                            width: rc.w * width,
                            height: rc.h * height,
                            color: rgbColor,
                            opacity: 0.35
                        });
                    });
                } else if (ann.type === 'drawing') {
                    const sw = ann.strokeWidth || 3;
                    const pts = ann.points || [];
                    if (ann.shapeType === 'pencil' && pts.length > 1) {
                        for (let i = 0; i < pts.length - 1; i++) {
                            page.drawLine({
                                start: { x: pts[i].x * width, y: (1 - pts[i].y) * height },
                                end: { x: pts[i + 1].x * width, y: (1 - pts[i + 1].y) * height },
                                thickness: sw, color: rgbColor
                            });
                        }
                    } else if ((ann.shapeType === 'line' || ann.shapeType === 'arrow') && pts.length >= 2) {
                        page.drawLine({
                            start: { x: pts[0].x * width, y: (1 - pts[0].y) * height },
                            end: { x: pts[1].x * width, y: (1 - pts[1].y) * height },
                            thickness: sw, color: rgbColor
                        });
                    } else if (ann.shapeType === 'rect' && pts.length >= 2) {
                        page.drawRectangle({
                            x: Math.min(pts[0].x, pts[1].x) * width,
                            y: (1 - Math.max(pts[0].y, pts[1].y)) * height,
                            width: Math.abs(pts[1].x - pts[0].x) * width,
                            height: Math.abs(pts[1].y - pts[0].y) * height,
                            borderColor: rgbColor, borderWidth: sw
                        });
                    } else if (ann.shapeType === 'circle' && pts.length >= 2) {
                        page.drawEllipse({
                            x: ((pts[0].x + pts[1].x) / 2) * width,
                            y: (1 - ((pts[0].y + pts[1].y) / 2)) * height,
                            xScale: (Math.abs(pts[1].x - pts[0].x) / 2) * width,
                            yScale: (Math.abs(pts[1].y - pts[0].y) / 2) * height,
                            borderColor: rgbColor, borderWidth: sw
                        });
                    }
                }
            }
            const savedUint8 = await pdfDoc.save();
            return savedUint8.buffer;
        } catch (e) { return originalBuffer; }
    }

    window.syncSingleBookToAllSources = async function(bookId, silent = false) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored) return;

        if (Array.isArray(stored.extractedPagesText) && stored.extractedPagesText.length > 0) {
            window.PomoStudioBridge.syncBookPageIndexToCloud(b.id, stored.extractedPagesText);
        }

        if (stored.originalBytes && b.format === 'pdf') {
            const bakedBuffer = await bakeAnnotationsIntoPdfBytes(b, stored.originalBytes);
            try {
                const fHandleObj = await idbGet('handles', 'file_' + b.id);
                if (fHandleObj && fHandleObj.handle) {
                    const wr = await fHandleObj.handle.createWritable();
                    await wr.write(bakedBuffer);
                    await wr.close();
                }
                for (const src of (b.sources || [])) {
                    const cDir = cloudDirectoryHandles[src];
                    if (cDir) {
                        const fh = await cDir.getFileHandle(b.fileName, { create: true });
                        const wr = await fh.createWritable();
                        await wr.write(bakedBuffer);
                        await wr.close();
                    }
                }
            } catch (e) {}

            if (navigator.onLine) {
                const tgToken = safeGet('pages_pomodoro_tg_token', '');
                const tgChat = safeGet('pages_pomodoro_tg_chatid', '');
                const customTdlibServer = (readerSettings.clouds?.telegram?.tdlibUrl || '').trim().replace(/\/+$/, '') || (HTTPS + 'api.telegram.org');
                if (tgToken && tgChat && (b.sources.includes('telegram') || readerSettings.clouds.telegram.connected)) {
                    try {
                        const maxBytes = customTdlibServer !== (HTTPS + 'api.telegram.org') ? 1950 * 1024 * 1024 : 48 * 1024 * 1024;
                        if (bakedBuffer.byteLength <= maxBytes) {
                            const formData = new FormData();
                            formData.append('chat_id', tgChat);
                            formData.append('caption', `📘 ${b.title} (Seq #${b.readSeq || 1} • Rev #${b.rev} • Page ${b.currentPage}/${b.totalPages} • ${(b.annotations || []).length} Annotations)`);
                            formData.append('document', new Blob([bakedBuffer], { type: 'application/pdf' }), b.fileName);
                            const tgRes = await fetch(`${customTdlibServer}/bot${tgToken}/sendDocument`, { method: 'POST', body: formData });
                            if (tgRes.ok) {
                                const tgJson = await tgRes.json();
                                const docFileId = tgJson?.result?.document?.file_id;
                                if (docFileId) {
                                    b.telegramFileId = docFileId;
                                    if (!b.sources.includes('telegram')) b.sources.push('telegram');
                                }
                            }
                        }
                    } catch (e) {}
                }
            }
        }
        b.pendingCloudSync = !navigator.onLine;
        b.lastModified = Date.now();
        saveReaderMeta();
        if (!silent) showToast(`✅ "${b.title}" saved into same book & synced to Studio Bridge!`);
    };

    document.getElementById('sync-all-clouds-now-btn')?.addEventListener('click', async () => {
        const pending = readerBooks.filter(b => b.pendingCloudSync);
        if (!pending.length) { showToast("All books are already synced!"); return; }
        for (const b of pending) await window.syncSingleBookToAllSources(b.id, true);
        showToast(`✅ Synced ${pending.length} book(s)!`);
    });
// ⬇️ PASTE 04-POMO-READER.JS PART 2 DIRECTLY BELOW THIS LINE ⬇️
