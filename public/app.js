(() => {
  const paintCanvas = document.getElementById('paint-layer');
  const lineCanvas = document.getElementById('lineart-layer');
  const canvasInner = document.getElementById('canvas-inner');
  const characterListEl = document.getElementById('character-list');
  const paletteEl = document.getElementById('palette');
  const brushSizeInput = document.getElementById('brush-size');
  const clearBtn = document.getElementById('clear-btn');
  const saveBtn = document.getElementById('save-btn');
  const currentCharacterLabel = document.getElementById('current-character-label');
  const toolBrushBtn = document.getElementById('tool-brush');
  const toolFillBtn = document.getElementById('tool-fill');
  const toolEraserBtn = document.getElementById('tool-eraser');
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomLabel = document.getElementById('zoom-label');
  const galleryGrid = document.getElementById('gallery-grid');
  const lightboxEl = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-image');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxDate = document.getElementById('lightbox-date');
  const lightboxCloseBtn = document.getElementById('lightbox-close');

  const paintCtx = paintCanvas.getContext('2d');
  const lineCtx = lineCanvas.getContext('2d');

  const paletteColors = [
    '#ffffff',
    '#000000',
    '#f97316',
    '#facc15',
    '#22c55e',
    '#0ea5e9',
    '#6366f1',
    '#ec4899',
    '#f43f5e',
    '#a855f7',
    '#14b8a6',
    '#e5e7eb'
  ];

  let characters = [];
  let currentCharacterId = null;
  let currentColor = '#f97316';
  let currentTool = 'brush'; // 'brush' | 'fill' | 'eraser'
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let zoomLevel = 1;
  let panX = 0;
  let panY = 0;
  let gallery = [];
  let isLightboxOpen = false;

  function openLightboxFromId(id) {
    if (!lightboxEl || !lightboxImg || !lightboxTitle || !lightboxDate) return;
    const item = gallery.find((g) => g.id === id);
    if (!item) return;

    lightboxImg.src = item.dataUrl;
    lightboxTitle.textContent = item.characterName;
    const date = new Date(item.createdAt);
    lightboxDate.textContent = date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    lightboxEl.classList.add('open');
    lightboxEl.setAttribute('aria-hidden', 'false');
    isLightboxOpen = true;
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.classList.remove('open');
    lightboxEl.setAttribute('aria-hidden', 'true');
    isLightboxOpen = false;
  }

  function resizeCanvasesToImage(image) {
    const parent = lineCanvas.parentElement;
    const rect = parent.getBoundingClientRect();

    const width = rect.width || 800;
    const height = rect.height || 600;

    // Bottom canvas: background + character image
    paintCanvas.width = width;
    paintCanvas.height = height;
    paintCtx.clearRect(0, 0, width, height);
    paintCtx.fillStyle = '#ffffff';
    paintCtx.fillRect(0, 0, width, height);

    // Top canvas: user painting (clear only, keep separate from image)
    lineCanvas.width = width;
    lineCanvas.height = height;
    lineCtx.clearRect(0, 0, width, height);

    // Scale the character image as large as possible while preserving aspect ratio
    const scale = Math.min(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const offsetX = (width - drawWidth) / 2;
    const offsetY = (height - drawHeight) / 2;

    paintCtx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

    applyZoom();
  }

  function setCurrentColor(color) {
    currentColor = color;
    document.querySelectorAll('.swatch').forEach((el) => {
      el.classList.toggle('selected', el.dataset.color === color);
    });
  }

  function applyZoom() {
    const clamped = Math.max(0.5, Math.min(3, zoomLevel));
    zoomLevel = clamped;
    if (canvasInner) {
      canvasInner.style.transformOrigin = 'center center';
      canvasInner.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    }
    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(zoomLevel * 100)}%`;
    }
  }

  function handlePointerDown(x, y) {
    if (currentTool === 'fill') {
      floodFillAt(x, y, currentColor);
      return;
    }
    isDrawing = true;
    lastX = x;
    lastY = y;
    drawStroke(x, y, x, y);
  }

  function handlePointerMove(x, y) {
    if (!isDrawing || (currentTool !== 'brush' && currentTool !== 'eraser')) return;
    drawStroke(lastX, lastY, x, y);
    lastX = x;
    lastY = y;
  }

  function handlePointerUp() {
    isDrawing = false;
  }

  function canvasCoordsFromEvent(evt) {
    const rect = lineCanvas.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    const x = ((clientX - rect.left) / rect.width) * lineCanvas.width;
    const y = ((clientY - rect.top) / rect.height) * lineCanvas.height;
    return { x, y };
  }

  function drawStroke(x1, y1, x2, y2) {
    const size = Number(brushSizeInput.value || 12);
    const isEraser = currentTool === 'eraser';

    if (isEraser) {
      lineCtx.save();
      lineCtx.globalCompositeOperation = 'destination-out';
      lineCtx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      lineCtx.strokeStyle = currentColor;
    }

    lineCtx.lineWidth = size;
    lineCtx.lineCap = 'round';
    lineCtx.lineJoin = 'round';

    lineCtx.beginPath();
    lineCtx.moveTo(x1, y1);
    lineCtx.lineTo(x2, y2);
    lineCtx.stroke();

    if (isEraser) {
      lineCtx.restore();
    }
  }

  function clearCanvas() {
    lineCtx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
  }

  function saveCurrentPainting() {
    if (!paintCanvas.width || !paintCanvas.height) {
      return;
    }

    // Composite the character image and the painting layer into a single snapshot.
    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = paintCanvas.width;
    snapshotCanvas.height = paintCanvas.height;
    const snapshotCtx = snapshotCanvas.getContext('2d');
    snapshotCtx.drawImage(paintCanvas, 0, 0);
    snapshotCtx.drawImage(lineCanvas, 0, 0);

    const dataUrl = snapshotCanvas.toDataURL('image/png');
    const character = characters.find((c) => c.id === currentCharacterId);

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      characterName: character ? character.name : 'Unknown hero',
      createdAt: new Date().toISOString(),
      dataUrl
    };

    gallery.unshift(entry);
    try {
      localStorage.setItem('heroPainterGallery', JSON.stringify(gallery));
    } catch (e) {
      console.warn('Could not persist gallery to localStorage', e);
    }
    renderGallery();
  }

  function renderGallery() {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '';

    if (!gallery.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Save a painting to start your gallery.';
      empty.style.fontSize = '0.8rem';
      empty.style.color = '#6b7280';
      galleryGrid.appendChild(empty);
      return;
    }

    gallery.forEach((item) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'gallery-item';
      wrapper.dataset.id = item.id;

      const img = document.createElement('img');
      img.src = item.dataUrl;
      img.alt = `Painting of ${item.characterName}`;
      img.dataset.id = item.id;

      const meta = document.createElement('div');
      meta.className = 'gallery-item-meta';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.characterName;

      const dateSpan = document.createElement('span');
      const date = new Date(item.createdAt);
      dateSpan.textContent = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'gallery-delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.dataset.id = item.id;

      meta.appendChild(nameSpan);
      meta.appendChild(dateSpan);
      meta.appendChild(deleteBtn);

      wrapper.appendChild(img);
      wrapper.appendChild(meta);
      galleryGrid.appendChild(wrapper);
    });
  }

  function floodFillAt(x, y, fillColor) {
    const width = paintCanvas.width;
    const height = paintCanvas.height;
    if (width === 0 || height === 0) return;

    // Use the character image (bottom canvas) as the map so black lines act as walls.
    const baseImageData = paintCtx.getImageData(0, 0, width, height);
    const base = baseImageData.data;

    // Apply the fill onto the top painting layer.
    const paintImageData = lineCtx.getImageData(0, 0, width, height);
    const paintData = paintImageData.data;

    const startX = Math.floor(x);
    const startY = Math.floor(y);
    const startIndex = (startY * width + startX) * 4;

    const targetR = base[startIndex];
    const targetG = base[startIndex + 1];
    const targetB = base[startIndex + 2];
    const targetA = base[startIndex + 3];

    const [fillR, fillG, fillB] = hexToRgb(fillColor);

    const stack = [[startX, startY]];
    const visited = new Uint8Array(width * height);
    const tolerance = 20;

    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
      const idx = cy * width + cx;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const di = idx * 4;
      const r = base[di];
      const g = base[di + 1];
      const b = base[di + 2];
      const a = base[di + 3];

      // Treat very dark pixels as outline lines that should not be crossed.
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      if (brightness < 40) {
        continue;
      }

      if (!colorsMatch(r, g, b, a, targetR, targetG, targetB, targetA, tolerance)) {
        continue;
      }

      paintData[di] = fillR;
      paintData[di + 1] = fillG;
      paintData[di + 2] = fillB;
      paintData[di + 3] = 255;

      stack.push([cx + 1, cy]);
      stack.push([cx - 1, cy]);
      stack.push([cx, cy + 1]);
      stack.push([cx, cy - 1]);
    }

    lineCtx.putImageData(paintImageData, 0, 0);
  }

  function hexToRgb(hex) {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  function colorsMatch(r1, g1, b1, a1, r2, g2, b2, a2, tolerance) {
    return (
      Math.abs(r1 - r2) <= tolerance &&
      Math.abs(g1 - g2) <= tolerance &&
      Math.abs(b1 - b2) <= tolerance &&
      Math.abs(a1 - a2) <= tolerance
    );
  }

  function renderCharacters() {
    characterListEl.innerHTML = '';
    characters.forEach((character) => {
      const btn = document.createElement('button');
      btn.className = 'character-btn';
      btn.textContent = character.name;
      btn.dataset.id = character.id;
      if (character.id === currentCharacterId) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => selectCharacter(character.id));
      characterListEl.appendChild(btn);
    });
  }

  function renderPalette() {
    paletteEl.innerHTML = '';
    paletteColors.forEach((color) => {
      const swatch = document.createElement('button');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      swatch.addEventListener('click', () => setCurrentColor(color));
      paletteEl.appendChild(swatch);
    });
    setCurrentColor(currentColor);
  }

  function selectCharacter(id) {
    const character = characters.find((c) => c.id === id);
    if (!character) return;
    currentCharacterId = id;
    currentCharacterLabel.textContent = `Painting: ${character.name}`;
    renderCharacters();

    const img = new Image();
    img.onload = () => resizeCanvasesToImage(img);
    img.onerror = () => {
      // If image missing, just resize to a default size with blank background
      const defaultWidth = 800;
      const defaultHeight = 600;
      paintCanvas.width = defaultWidth;
      paintCanvas.height = defaultHeight;
      paintCtx.clearRect(0, 0, defaultWidth, defaultHeight);
      paintCtx.fillStyle = '#ffffff';
      paintCtx.fillRect(0, 0, defaultWidth, defaultHeight);

      lineCanvas.width = defaultWidth;
      lineCanvas.height = defaultHeight;
      lineCtx.clearRect(0, 0, defaultWidth, defaultHeight);
      lineCtx.fillStyle = '#9ca3af';
      lineCtx.font = '20px system-ui, sans-serif';
      lineCtx.textAlign = 'center';
      lineCtx.fillText('Add your own line-art image here.', defaultWidth / 2, defaultHeight / 2 - 12);

      // Extra helper text specifically for the Original Hero template
      if (character.id === 'original-hero') {
        lineCtx.fillText('Clear canvas to start.', defaultWidth / 2, defaultHeight / 2 + 16);
      }
    };
    img.src = character.imageUrl;
  }

  async function loadCharacters() {
    try {
      const res = await fetch('/api/characters');
      characters = await res.json();
      renderCharacters();
      if (characters.length > 0) {
        selectCharacter(characters[0].id);
      }
    } catch (err) {
      console.error('Failed to load characters', err);
      currentCharacterLabel.textContent = 'Could not load characters from the server.';
    }
  }

  function attachCanvasEvents() {
    lineCanvas.addEventListener('mousedown', (evt) => {
      const { x, y } = canvasCoordsFromEvent(evt);
      handlePointerDown(x, y);
    });
    window.addEventListener('mousemove', (evt) => {
      const { x, y } = canvasCoordsFromEvent(evt);
      handlePointerMove(x, y);
    });
    window.addEventListener('mouseup', handlePointerUp);

    lineCanvas.addEventListener('touchstart', (evt) => {
      evt.preventDefault();
      const { x, y } = canvasCoordsFromEvent(evt);
      handlePointerDown(x, y);
    });
    window.addEventListener('touchmove', (evt) => {
      if (!isDrawing) return;
      const { x, y } = canvasCoordsFromEvent(evt);
      handlePointerMove(x, y);
    }, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
  }

  function init() {
    paintCanvas.width = 800;
    paintCanvas.height = 600;
    lineCanvas.width = 800;
    lineCanvas.height = 600;
    paintCtx.fillStyle = '#ffffff';
    paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
    lineCtx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
    renderPalette();
    // Load any previously saved gallery items from this browser.
    try {
      const stored = localStorage.getItem('heroPainterGallery');
      if (stored) {
        gallery = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read gallery from localStorage', e);
    }
    renderGallery();
    attachCanvasEvents();
    clearBtn.addEventListener('click', clearCanvas);
    if (saveBtn) {
      saveBtn.addEventListener('click', saveCurrentPainting);
    }
    if (galleryGrid) {
      galleryGrid.addEventListener('click', (evt) => {
        const target = evt.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.classList.contains('gallery-delete-btn')) {
          const id = target.dataset.id;
          if (!id) return;

          gallery = gallery.filter((item) => item.id !== id);
          try {
            localStorage.setItem('heroPainterGallery', JSON.stringify(gallery));
          } catch (e) {
            console.warn('Could not persist updated gallery', e);
          }
          renderGallery();
          return;
        }

        const wrapper = target.closest('.gallery-item');
        if (!wrapper || !(wrapper instanceof HTMLElement)) return;
        const id = wrapper.dataset.id || target.dataset.id;
        if (!id) return;
        openLightboxFromId(id);
      });
    }
    if (lightboxCloseBtn) {
      lightboxCloseBtn.addEventListener('click', closeLightbox);
    }
    if (lightboxEl) {
      const backdrop = lightboxEl.querySelector('.lightbox-backdrop');
      if (backdrop instanceof HTMLElement) {
        backdrop.addEventListener('click', closeLightbox);
      }
    }
    window.addEventListener('keydown', (evt) => {
      if (!isLightboxOpen) return;
      if (evt.key === 'Escape') {
        closeLightbox();
      }
    });
    toolBrushBtn.addEventListener('click', () => {
      currentTool = 'brush';
      toolBrushBtn.classList.add('active');
      toolFillBtn.classList.remove('active');
      toolEraserBtn.classList.remove('active');
    });
    toolFillBtn.addEventListener('click', () => {
      currentTool = 'fill';
      toolFillBtn.classList.add('active');
      toolBrushBtn.classList.remove('active');
      toolEraserBtn.classList.remove('active');
    });
    toolEraserBtn.addEventListener('click', () => {
      currentTool = 'eraser';
      toolEraserBtn.classList.add('active');
      toolBrushBtn.classList.remove('active');
      toolFillBtn.classList.remove('active');
    });
    if (zoomInBtn && zoomOutBtn) {
      zoomInBtn.addEventListener('click', () => {
        zoomLevel += 0.25;
        applyZoom();
      });
      zoomOutBtn.addEventListener('click', () => {
        zoomLevel -= 0.25;
        applyZoom();
      });
      applyZoom();
    }
    const wrapper = document.querySelector('.canvas-wrapper');
    if (wrapper) {
      wrapper.addEventListener(
        'wheel',
        (evt) => {
          // Only pan/scroll within canvas when zoomed in
          if (zoomLevel <= 1) return;
          evt.preventDefault();
          panY -= evt.deltaY * 0.25;
          applyZoom();
        },
        { passive: false }
      );
    }
    loadCharacters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

