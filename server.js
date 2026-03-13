const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory character list; image files should be placed in public/assets
const characters = [
  {
    id: 'ironman',
    name: 'Iron Man',
    imageUrl: '/assets/ironman-lineart.png'
  },
  {
    id: 'flash',
    name: 'The Flash',
    imageUrl: '/assets/flash-lineart.png'
  },
  {
    id: 'daredevil',
    name: 'Daredevil',
    imageUrl: '/assets/daredevil-lineart.png'
  },
  {
    id: 'tmnt',
    name: 'Ninja Turtle',
    imageUrl: '/assets/tmnt-lineart.png'
  },
  {
    id: 'lego-batman',
    name: 'Lego Batman',
    imageUrl: '/assets/lego-batman-lineart.png'
  },
  {
    id: 'original-hero',
    name: 'Original Hero',
    imageUrl: '/assets/original-hero-lineart.png'
  }
];

// API route to get characters
app.get('/api/characters', (req, res) => {
  res.json(characters);
});

// Serve static frontend
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Fallback to index.html for root
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

