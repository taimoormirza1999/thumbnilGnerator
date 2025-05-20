const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const titleRoutes = require('./routes/titles');
const thumbnailRoutes = require('./routes/thumbnails');
const referenceRoutes = require('./routes/references');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/titles', titleRoutes);
app.use('/api/thumbnails', thumbnailRoutes);
app.use('/api/references', referenceRoutes);

// Root route
app.get('/api', (req, res) => {
  res.json({ message: 'AI Thumbnail Generator API' });
});
app.use(express.static(path.join(__dirname, "frontend")));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Initialize database and start server

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  }); 