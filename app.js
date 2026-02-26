/**
 * App Notas - V1 simple
 * HTML/CSS/JS vanilla + localStorage. Reglas: agent.md
 */

(function () {
  'use strict';

  var currentStorageKey = 'notes_app_guest';

  function generateId() {
    return 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  var NOTE_DOT_PALETTE = ['#D4A84A', '#5B8FC4', '#5BA85B', '#E89550', '#9B7BB8', '#D87B8B', '#5BB8B8', '#909090'];

  function getNoteDotColor(noteId) {
    if (!noteId || typeof noteId !== 'string') return NOTE_DOT_PALETTE[0];
    var hash = 0;
    for (var i = 0; i < noteId.length; i++) hash = (hash + noteId.charCodeAt(i)) | 0;
    var idx = Math.abs(hash) % NOTE_DOT_PALETTE.length;
    return NOTE_DOT_PALETTE[idx];
  }

  function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.setAttribute('role', 'alert');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }
  window.showToast = showToast;

  function createNote(overrides) {
    var now = new Date().toISOString();
    return Object.assign({
      id: generateId(),
      title: '',
      content: '',
      contentHtml: '',
      createdAt: now,
      updatedAt: now
    }, overrides || {});
  }

  function stripHtmlToText(html) {
    if (!html || typeof html !== 'string') return '';
    var div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').trim();
  }

  function loadNotes() {
    try {
      var raw = localStorage.getItem(currentStorageKey);
      if (!raw) return [];
      var data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data.map(function (n) {
        var now = new Date().toISOString();
        return {
          id: n.id || generateId(),
          title: (n.title != null ? n.title : '') + '',
          content: (n.content != null ? n.content : '') + '',
          contentHtml: (n.contentHtml != null ? n.contentHtml : '') + '',
          createdAt: n.createdAt || now,
          updatedAt: n.updatedAt || now
        };
      });
    } catch (e) {
      showToast('Error al cargar notas (datos corruptos o no válidos)', 'error');
      return [];
    }
  }

  function saveNotes(notes) {
    try {
      localStorage.setItem(currentStorageKey, JSON.stringify(notes));
      return true;
    } catch (e) {
      showToast('Error al guardar', 'error');
      return false;
    }
  }

  // --- Estado ---
  var notes = [];
  var selectedNoteId = null;

  var notesListEl = document.getElementById('notes-list');
  var emptyStateEl = document.getElementById('empty-state');
  var editorPlaceholder = document.getElementById('editor-placeholder');
  var detailView = document.getElementById('detail-view');
  var detailTitle = document.getElementById('detail-title');
  var detailUpdated = document.getElementById('detail-updated');
  var detailContent = document.getElementById('detail-content');
  var btnEditNote = document.getElementById('btn-edit-note');
  var btnDetailMenu = document.getElementById('btn-detail-menu');
  var btnNewNote = document.getElementById('btn-new-note');
  var modalOverlay = document.getElementById('modal-overlay');
  var noteModal = document.getElementById('note-modal');
  var modalHeading = document.getElementById('modal-heading');
  var modalTitleInput = document.getElementById('modal-title');
  var modalContentInput = document.getElementById('modal-content');
  var btnModalCancel = document.getElementById('btn-modal-cancel');
  var btnModalSubmit = document.getElementById('btn-modal-submit');
  var btnGlobalMenu = document.getElementById('btn-global-menu');
  var globalMenu = document.getElementById('global-menu');
  var noteMenu = document.getElementById('note-menu');
  var inputImportFile = document.getElementById('input-import-file');
  var linkPopupWrap = document.getElementById('link-popup-wrap');
  var linkUrlInput = document.getElementById('link-url-input');
  var linkPopupCancel = document.getElementById('link-popup-cancel');
  var linkPopupInsert = document.getElementById('link-popup-insert');

  var modalMode = 'create';
  var savedLinkRange = null;

  function openLinkPopup() {
    savedLinkRange = null;
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedLinkRange = sel.getRangeAt(0).cloneRange();
    if (linkPopupWrap) {
      linkPopupWrap.hidden = false;
      linkPopupWrap.setAttribute('aria-hidden', 'false');
    }
    if (linkUrlInput) {
      linkUrlInput.value = '';
      linkUrlInput.placeholder = 'https://';
      setTimeout(function () { if (linkUrlInput) linkUrlInput.focus(); }, 80);
    }
  }

  function closeLinkPopup() {
    savedLinkRange = null;
    if (linkPopupWrap) {
      linkPopupWrap.hidden = true;
      linkPopupWrap.setAttribute('aria-hidden', 'true');
    }
    if (modalContentInput) modalContentInput.focus();
  }

  function normalizeLinkUrl(url) {
    var u = (url || '').trim();
    if (!u) return '';
    if (u.indexOf('http://') !== 0 && u.indexOf('https://') !== 0) u = 'https://' + u;
    return u;
  }

  var modalNoteId = null;
  var modalPointerDownOnOverlay = false;

  function getSelectedNote() {
    if (!selectedNoteId) return null;
    return notes.find(function (n) { return n.id === selectedNoteId; }) || null;
  }

  function formatUpdatedAt(isoString) {
    if (!isoString) return '';
    var d = new Date(isoString);
    var day = d.getDate();
    var month = d.getMonth() + 1;
    var year = d.getFullYear();
    var h = d.getHours();
    var m = d.getMinutes();
    return 'Actualizado: ' + day + '/' + month + '/' + year + ' ' + (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderMarkdownToHtml(md) {
    if (!md || typeof md !== 'string') return '';
    var s = escapeHtml(md);
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/_([^_]+)_/g, '<em>$1</em>');
    var lines = s.split('\n');
    var out = [];
    var inList = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf('- ') === 0) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + line.slice(2) + '</li>');
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        out.push(line ? '<p>' + line + '</p>' : '<p><br></p>');
      }
    }
    if (inList) out.push('</ul>');
    return out.join('');
  }

  var TOOLBAR_STATE_COMMANDS = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'];
  var activeAlignment = null;

  function updateToolbarState() {
    if (!modalOverlay || modalOverlay.hidden || !noteModal || !modalContentInput) return;
    var editorHasFocus = document.activeElement === modalContentInput || modalContentInput.contains(document.activeElement);
    var buttons = noteModal.querySelectorAll('.btn-toolbar[data-command]');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var cmd = btn.getAttribute('data-command');
      if (cmd === 'justifyLeft' || cmd === 'justifyCenter' || cmd === 'justifyRight') {
        var alignValue = cmd === 'justifyLeft' ? 'left' : cmd === 'justifyCenter' ? 'center' : 'right';
        if (editorHasFocus && activeAlignment === alignValue) btn.classList.add('is-active');
        else btn.classList.remove('is-active');
        continue;
      }
      if (TOOLBAR_STATE_COMMANDS.indexOf(cmd) === -1) {
        btn.classList.remove('is-active');
        continue;
      }
      if (!editorHasFocus) {
        btn.classList.remove('is-active');
        continue;
      }
      try {
        var active = document.queryCommandState(cmd);
        if (active) btn.classList.add('is-active');
        else btn.classList.remove('is-active');
      } catch (e) {
        btn.classList.remove('is-active');
      }
    }
  }

  function execEditorCommand(cmd, value) {
    if (!modalContentInput) return;
    modalContentInput.focus();
    document.execCommand(cmd, false, value != null ? value : null);
    modalContentInput.focus();
    updateToolbarState();
  }

  function renderDetailView() {
    var note = getSelectedNote();
    if (!detailTitle || !detailUpdated || !detailContent) return;
    if (!note) return;
    detailTitle.textContent = note.title || 'Sin título';
    detailUpdated.textContent = formatUpdatedAt(note.updatedAt);
    var hasHtml = (note.contentHtml || '').trim().length > 0;
    var contentPlain = (note.content || '').trim();
    detailContent.classList.toggle('is-empty', !hasHtml && !contentPlain);
    detailContent.classList.add('markdown-body');
    if (hasHtml) {
      detailContent.innerHTML = note.contentHtml;
    } else if (contentPlain) {
      detailContent.innerHTML = renderMarkdownToHtml(contentPlain);
    } else {
      detailContent.textContent = 'Esta nota está vacía';
    }
  }

  function selectNote(id) {
    selectedNoteId = id || null;
    renderList();
    if (!id) {
      if (editorPlaceholder) editorPlaceholder.hidden = false;
      if (detailView) detailView.hidden = true;
      return;
    }
    var note = getSelectedNote();
    if (!note) return;
    if (editorPlaceholder) editorPlaceholder.hidden = true;
    if (detailView) detailView.hidden = false;
    renderDetailView();
  }

  function openModal(mode, noteId) {
    modalMode = mode || 'create';
    modalNoteId = noteId || null;
    activeAlignment = null;
    if (modalHeading) modalHeading.textContent = modalMode === 'create' ? 'Nueva nota' : 'Editar nota';
    if (btnModalSubmit) btnModalSubmit.textContent = modalMode === 'create' ? 'Crear nota' : 'Guardar cambios';
    if (modalTitleInput) modalTitleInput.value = '';
    if (modalContentInput) {
      if (modalMode === 'edit' && modalNoteId) {
        var note = notes.find(function (n) { return n.id === modalNoteId; });
        if (note) {
          modalTitleInput.value = note.title || '';
          modalContentInput.innerHTML = (note.contentHtml && note.contentHtml.trim()) ? note.contentHtml : renderMarkdownToHtml(note.content || '');
        } else {
          modalContentInput.innerHTML = '';
        }
      } else {
        modalContentInput.innerHTML = '';
      }
    }
    if (modalOverlay) {
      modalOverlay.hidden = false;
      modalOverlay.setAttribute('aria-hidden', 'false');
    }
    setTimeout(function () { if (modalTitleInput) modalTitleInput.focus(); }, 100);
  }

  function closeModal() {
    if (modalOverlay) {
      modalOverlay.hidden = true;
      modalOverlay.setAttribute('aria-hidden', 'true');
    }
    modalNoteId = null;
  }

  function saveFromModal() {
    var title = (modalTitleInput && modalTitleInput.value ? modalTitleInput.value : '').trim() || 'Sin título';
    var contentHtml = modalContentInput ? (modalContentInput.innerHTML || '').trim() : '';
    var content = stripHtmlToText(contentHtml);
    if (modalMode === 'create') {
      var newNote = createNote({ title: title, content: content, contentHtml: contentHtml });
      notes.push(newNote);
      if (!saveNotes(notes)) return;
      renderList();
      selectNote(newNote.id);
      closeModal();
      showToast('Nota creada', 'success');
    } else if (modalMode === 'edit' && modalNoteId) {
      var note = notes.find(function (n) { return n.id === modalNoteId; });
      if (note) {
        note.title = title;
        note.content = content;
        note.contentHtml = contentHtml;
        note.updatedAt = new Date().toISOString();
        if (!saveNotes(notes)) return;
        renderList();
        renderDetailView();
        closeModal();
        showToast('Guardado', 'success');
      }
    }
  }

  function renderList() {
    if (!notesListEl) return;
    notesListEl.innerHTML = '';
    if (emptyStateEl) emptyStateEl.hidden = notes.length > 0;

    notes.forEach(function (note) {
      var li = document.createElement('li');
      li.className = 'note-item' + (note.id === selectedNoteId ? ' active' : '');
      li.setAttribute('data-note-id', note.id);

      var dotSpan = document.createElement('span');
      dotSpan.className = 'note-item-dot';
      dotSpan.setAttribute('aria-hidden', 'true');
      dotSpan.style.backgroundColor = getNoteDotColor(note.id);

      var nameSpan = document.createElement('span');
      nameSpan.className = 'note-item-name';
      nameSpan.textContent = note.title || 'Sin título';

      var menuBtn = document.createElement('button');
      menuBtn.type = 'button';
      menuBtn.className = 'btn btn-icon btn-note-menu';
      menuBtn.setAttribute('aria-label', 'Opciones');
      menuBtn.textContent = '⋮';
      menuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openNoteMenu(note.id, menuBtn);
      });

      li.appendChild(dotSpan);
      li.appendChild(nameSpan);
      li.appendChild(menuBtn);
      li.addEventListener('click', function (e) {
        if (e.target.closest('.btn-note-menu')) return;
        selectNote(note.id);
      });
      notesListEl.appendChild(li);
    });
  }

  function openNoteMenu(noteId, anchor) {
    if (noteMenu && !noteMenu.hidden && noteMenu.dataset.noteId === noteId) {
      closeAllMenus();
      return;
    }
    closeAllMenus();
    noteMenu.hidden = false;
    noteMenu.dataset.noteId = noteId;
    positionMenu(noteMenu, anchor);
  }

  function openGlobalMenu() {
    closeAllMenus();
    globalMenu.hidden = false;
    btnGlobalMenu.setAttribute('aria-expanded', 'true');
    positionMenu(globalMenu, btnGlobalMenu);
  }

  function positionMenu(menu, anchor) {
    var rect = anchor.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 4) + 'px';
    if (noteMenu && menu === noteMenu && anchor.closest && anchor.closest('.note-item')) {
      var item = anchor.closest('.note-item');
      var itemRect = item.getBoundingClientRect();
      menu.style.left = itemRect.left + 'px';
      menu.style.width = itemRect.width + 'px';
      menu.style.right = 'auto';
    } else {
      menu.style.right = (window.innerWidth - rect.right) + 'px';
      menu.style.left = 'auto';
    }
  }

  function closeAllMenus() {
    if (globalMenu) globalMenu.hidden = true;
    if (noteMenu) noteMenu.hidden = true;
    if (btnGlobalMenu) btnGlobalMenu.setAttribute('aria-expanded', 'false');
  }

  function runNoteAction(action, noteId) {
    var note = notes.find(function (n) { return n.id === noteId; });
    if (!note && action !== 'delete') return;

    if (action === 'edit') {
      openModal('edit', noteId);
      closeAllMenus();
      return;
    }
    if (action === 'rename') {
      openModal('edit', noteId);
      closeAllMenus();
      return;
    }
    if (action === 'delete') {
      if (!confirm('¿Eliminar esta nota?')) return;
      notes = notes.filter(function (n) { return n.id !== noteId; });
      saveNotes(notes);
      if (selectedNoteId === noteId) selectNote(null);
      renderList();
      showToast('Nota eliminada', 'success');
    } else if (action === 'duplicate') {
      var copy = createNote({
        title: (note.title || '') + ' (copia)',
        content: note.content || '',
        contentHtml: note.contentHtml || ''
      });
      notes.push(copy);
      saveNotes(notes);
      renderList();
      selectNote(copy.id);
      showToast('Nota duplicada', 'success');
    } else if (action === 'export-json') {
      try {
        var json = JSON.stringify(note, null, 2);
        downloadFile(json, (note.title || 'nota').replace(/[^\w\s-]/g, '') + '.json', 'application/json');
        showToast('Exportado (JSON)', 'success');
      } catch (e) {
        showToast('Error al exportar', 'error');
      }
    } else if (action === 'export-txt') {
      try {
        var txt = (note.title || '') + '\n\n' + (note.content || '');
        downloadFile(txt, (note.title || 'nota').replace(/[^\w\s-]/g, '') + '.txt', 'text/plain');
        showToast('Exportado (TXT)', 'success');
      } catch (e) {
        showToast('Error al exportar', 'error');
      }
    } else if (action === 'import-content') {
      inputImportFile.accept = '.txt,text/plain';
      inputImportFile.dataset.mode = 'content';
      inputImportFile.dataset.noteId = noteId;
      inputImportFile.click();
    }
  }

  function downloadFile(content, filename, mime) {
    var blob = new Blob([content], { type: mime });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function runGlobalAction(action) {
    if (action === 'export-all') {
      try {
        var json = JSON.stringify(notes, null, 2);
        downloadFile(json, 'notas_' + new Date().toISOString().slice(0, 10) + '.json', 'application/json');
        showToast('Exportado todo (JSON)', 'success');
      } catch (e) {
        showToast('Error al exportar', 'error');
      }
    } else if (action === 'import-all') {
      inputImportFile.accept = '.json,application/json';
      inputImportFile.dataset.mode = 'all';
      inputImportFile.removeAttribute('data-note-id');
      inputImportFile.click();
    } else if (action === 'logout') {
      if (window.firebaseAuth && typeof window.firebaseAuth.signOut === 'function') {
        window.firebaseAuth.signOut();
      }
      closeAllMenus();
    }
  }

  function handleImportFile() {
    var file = inputImportFile.files[0];
    if (!file) return;
    var mode = inputImportFile.dataset.mode;
    var noteId = inputImportFile.dataset.noteId;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        if (mode === 'content') {
          var note = notes.find(function (n) { return n.id === noteId; });
          if (note) {
            var imported = (reader.result || '').trim();
            note.content = imported;
            note.contentHtml = imported.indexOf('<') !== -1 ? imported : '';
            if (!note.contentHtml) note.contentHtml = renderMarkdownToHtml(imported);
            note.updatedAt = new Date().toISOString();
            saveNotes(notes);
            if (selectedNoteId === noteId) renderDetailView();
            showToast('Contenido importado', 'success');
          }
        } else {
          var text = reader.result;
          var data = JSON.parse(text);
          var arr = Array.isArray(data) ? data : [data];
          var now = new Date().toISOString();
          arr.forEach(function (n) {
            notes.push({
              id: n.id || generateId(),
              title: (n.title != null ? n.title : '') + '',
              content: (n.content != null ? n.content : '') + '',
              contentHtml: (n.contentHtml != null ? n.contentHtml : '') + '',
              createdAt: n.createdAt || now,
              updatedAt: n.updatedAt || now
            });
          });
          saveNotes(notes);
          renderList();
          showToast('Notas importadas', 'success');
        }
      } catch (e) {
        showToast('Error al importar', 'error');
      }
      inputImportFile.value = '';
    };
    if (mode === 'content') reader.readAsText(file);
    else reader.readAsText(file);
  }

  // --- Eventos ---
  if (btnNewNote) btnNewNote.addEventListener('click', function () { openModal('create'); });

  if (btnModalCancel) btnModalCancel.addEventListener('click', closeModal);
  if (btnModalSubmit) btnModalSubmit.addEventListener('click', function () {
    if (modalTitleInput && !modalTitleInput.value.trim()) {
      modalTitleInput.focus();
      return;
    }
    saveFromModal();
  });
  if (modalOverlay) {
    modalOverlay.addEventListener('pointerdown', function (e) {
      modalPointerDownOnOverlay = (e.target === modalOverlay);
    });
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay && modalPointerDownOnOverlay) closeModal();
    });
  }
  document.addEventListener('pointerdown', function (e) {
    if (!noteModal) return;
    if (noteModal.contains(e.target)) modalPointerDownOnOverlay = false;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (linkPopupWrap && !linkPopupWrap.hidden) {
      closeLinkPopup();
      e.preventDefault();
      return;
    }
    if (modalOverlay && !modalOverlay.hidden) closeModal();
    else closeAllMenus();
  });
  if (noteModal) noteModal.addEventListener('click', function (e) {
    e.stopPropagation();
    var toolbarBtn = e.target.closest('.btn-toolbar[data-command]');
    if (toolbarBtn && modalContentInput) {
      e.preventDefault();
      var cmd = toolbarBtn.getAttribute('data-command');
      if (cmd === 'createLink') {
        openLinkPopup();
      } else if (cmd === 'justifyLeft' || cmd === 'justifyCenter' || cmd === 'justifyRight') {
        activeAlignment = cmd === 'justifyLeft' ? 'left' : cmd === 'justifyCenter' ? 'center' : 'right';
        execEditorCommand(cmd);
      } else {
        execEditorCommand(cmd);
      }
    }
  });
  if (linkPopupWrap) {
    linkPopupWrap.addEventListener('click', function (e) {
      if (e.target === linkPopupWrap) closeLinkPopup();
    });
  }
  if (linkPopupCancel) linkPopupCancel.addEventListener('click', closeLinkPopup);
  if (linkPopupInsert) linkPopupInsert.addEventListener('click', function () {
    var url = linkUrlInput ? linkUrlInput.value : '';
    var normalized = normalizeLinkUrl(url);
    if (!normalized) {
      showToast('Escribe una URL', 'info');
      if (linkUrlInput) linkUrlInput.focus();
      return;
    }
    if (modalContentInput) {
      modalContentInput.focus();
      var sel = window.getSelection();
      if (sel && savedLinkRange) {
        sel.removeAllRanges();
        sel.addRange(savedLinkRange);
      }
      document.execCommand('createLink', false, normalized);
      modalContentInput.focus();
      updateToolbarState();
    }
    closeLinkPopup();
  });
  if (linkUrlInput) {
    linkUrlInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (linkPopupInsert) linkPopupInsert.click();
      }
    });
  }
  if (modalContentInput) {
    modalContentInput.addEventListener('keyup', updateToolbarState);
    modalContentInput.addEventListener('mouseup', updateToolbarState);
    modalContentInput.addEventListener('focus', updateToolbarState);
  }
  document.addEventListener('selectionchange', function () {
    if (!modalOverlay || modalOverlay.hidden || !modalContentInput) return;
    var sel = window.getSelection();
    if (!sel || !sel.anchorNode) return;
    if (modalContentInput.contains(sel.anchorNode)) updateToolbarState();
  });

  if (btnGlobalMenu) btnGlobalMenu.addEventListener('click', function (e) { e.stopPropagation(); openGlobalMenu(); });
  if (globalMenu) {
    globalMenu.addEventListener('click', function (e) {
      var item = e.target.closest('.dropdown-item');
      if (!item) return;
      runGlobalAction(item.dataset.action);
      closeAllMenus();
    });
  }

  if (noteMenu) {
    noteMenu.addEventListener('click', function (e) {
      var item = e.target.closest('.dropdown-item');
      if (!item) return;
      var noteId = noteMenu.dataset.noteId;
      runNoteAction(item.dataset.action, noteId);
      closeAllMenus();
    });
  }

  document.addEventListener('click', function () { closeAllMenus(); });
  if (globalMenu) globalMenu.addEventListener('click', function (e) { e.stopPropagation(); });
  if (noteMenu) noteMenu.addEventListener('click', function (e) { e.stopPropagation(); });

  if (inputImportFile) inputImportFile.addEventListener('change', handleImportFile);

  // --- Inicio ---
  notes = loadNotes();
  renderList();
  selectNote(null);

  function initAuthSync() {
    if (window.firebaseAuth) {
      window.firebaseAuth.onAuthStateChanged(function (user) {
        currentStorageKey = user ? 'notes_app_' + user.uid : 'notes_app_guest';
        notes = loadNotes();
        renderList();
        selectNote(null);
      });
      return;
    }
    setTimeout(initAuthSync, 50);
  }
  initAuthSync();
})();
