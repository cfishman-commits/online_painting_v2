(() => {
  const paintCanvas = document.getElementById('paint-layer');
  const lineCanvas = document.getElementById('lineart-layer');
  const characterListEl = document.getElementById('character-list');
  const paletteEl = document.getElementById('palette');
  const brushSizeInput = document.getElementById('brush-size');
  const clearBtn = document.getElementById('clear-btn');
  const currentCharacterLabel = document.getElementById('current-character-label');
  const toolBrushBtn = document.getElementById('tool-brush');
  const toolFillBtn = document.getElementById('tool-fill');

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
    '#22c55e',
    '#e5e7eb'
  ];

  let characters = [];
  let currentCharacterId = null;
  let currentColor = '#f97316';
  let currentTool = 'brush'; // 'brush' | 'fill'
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  function resizeCanvasesToImage(image) {
    const maxWidth = lineCanvas.parentElement.clientWidth;
    const scale = image.width > maxWidth ? maxWidth / image.width : 1;
    const width = image.width * scale;
    const height = image.height * scale;

    paintCanvas.width = width;
    paintCanvas.height = height;
    lineCanvas.width = width;
    lineCanvas.height = height;

    // Clear painting surface and redraw background
    paintCtx.clearRect(0, 0, width, height);
    paintCtx.fillStyle = '#ffffff';
    paintCtx.fillRect(0, 0, width, height);

    // Draw line art scaled to fit
    lineCtx.clearRect(0, 0, width, height);
    lineCtx.drawImage(image, 0, 0, width, height);
  }

  function setCurrentColor(color) {
    currentColor = color;
    document.querySelectorAll('.swatch').forEach((el) => {
      el.classList.toggle('selected', el.dataset.color === color);
    });
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
    if (!isDrawing || currentTool !== 'brush') return;
    drawStroke(lastX, lastY, x, y);
    lastX = x;
    lastY = y;
  }

  function handlePointerUp() {
    isDrawing = false;
  }

  function canvasCoordsFromEvent(evt) {
    const rect = paintCanvas.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    const x = ((clientX - rect.left) / rect.width) * paintCanvas.width;
    const y = ((clientY - rect.top) / rect.height) * paintCanvas.height;
    return { x, y };
  }

  function drawStroke(x1, y1, x2, y2) {
    const size = Number(brushSizeInput.value || 12);
    paintCtx.strokeStyle = currentColor;
    paintCtx.lineWidth = size;
    paintCtx.lineCap = 'round';
    paintCtx.lineJoin = 'round';

    paintCtx.beginPath();
    paintCtx.moveTo(x1, y1);
    paintCtx.lineTo(x2, y2);
    paintCtx.stroke();
  }

  function clearCanvas() {
    paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
    paintCtx.fillStyle = '#ffffff';
    paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
  }

  function floodFillAt(x, y, fillColor) {
    const width = paintCanvas.width;
    const height = paintCanvas.height;
    if (width === 0 || height === 0) return;

    const imageData = paintCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const startX = Math.floor(x);
    const startY = Math.floor(y);
    const startIndex = (startY * width + startX) * 4;

    const targetR = data[startIndex];
    const targetG = data[startIndex + 1];
    const targetB = data[startIndex + 2];
    const targetA = data[startIndex + 3];

    const [fillR, fillG, fillB] = hexToRgb(fillColor);

    // If the clicked color is already (approximately) the fill color, do nothing.
    if (colorsMatch(targetR, targetG, targetB, targetA, fillR, fillG, fillB, 255)) {
      return;
    }

    const stack = [[startX, startY]];
    const visited = new Uint8Array(width * height);
    const tolerance = 24;

    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
      const idx = cy * width + cx;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const di = idx * 4;
      const r = data[di];
      const g = data[di + 1];
      const b = data[di + 2];
      const a = data[di + 3];

      if (!colorsMatch(r, g, b, a, targetR, targetG, targetB, targetA, tolerance)) {
        continue;
      }

      data[di] = fillR;
      data[di + 1] = fillG;
      data[di + 2] = fillB;
      data[di + 3] = 255;

      stack.push([cx + 1, cy]);
      stack.push([cx - 1, cy]);
      stack.push([cx, cy + 1]);
      stack.push([cx, cy - 1]);
    }

    paintCtx.putImageData(imageData, 0, 0);
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
      lineCanvas.width = defaultWidth;
      lineCanvas.height = defaultHeight;
      clearCanvas();
      lineCtx.clearRect(0, 0, defaultWidth, defaultHeight);
      lineCtx.fillStyle = '#9ca3af';
      lineCtx.font = '20px system-ui, sans-serif';
      lineCtx.textAlign = 'center';
      lineCtx.fillText('Add your own line-art image here.', defaultWidth / 2, defaultHeight / 2);
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
    paintCanvas.addEventListener('mousedown', (evt) => {
      const { x, y } = canvasCoordsFromEvent(evt);
      handlePointerDown(x, y);
    });
    window.addEventListener('mousemove', (evt) => {
      const { x, y } = canvasCoordsFromEvent(evt);
      handlePointerMove(x, y);
    });
    window.addEventListener('mouseup', handlePointerUp);

    paintCanvas.addEventListener('touchstart', (evt) => {
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
    clearCanvas();
    renderPalette();
    attachCanvasEvents();
    clearBtn.addEventListener('click', clearCanvas);
    toolBrushBtn.addEventListener('click', () => {
      currentTool = 'brush';
      toolBrushBtn.classList.add('active');
      toolFillBtn.classList.remove('active');
    });
    toolFillBtn.addEventListener('click', () => {
      currentTool = 'fill';
      toolFillBtn.classList.add('active');
      toolBrushBtn.classList.remove('active');
    });
    loadCharacters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

