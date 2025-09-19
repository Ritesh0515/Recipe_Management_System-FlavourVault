// 1. Import required packages
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');

// 2. Create Express app
const app = express();
const PORT = 3000;

// 3. Middleware (helpers)
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 4. Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',          // MySQL username
  password: 'MYSQL@0515#_ritesh',  // MySQL password
  database: 'flavorvault'
});
db.connect((err) => {
  if (err) {
    console.log('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

// 5. Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // { userId, username }
    next();
  });
}

// 6. Test route (to check if server works)
app.get('/', (req, res) => {
  res.json({ message: 'FlavorVault Backend is running!' });
});

// 7. User Registration
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length > 0) return res.status(400).json({ error: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to create user' });
        res.json({ message: 'User registered successfully', userId: result.insertId });
      }
    );
  });
});

// 8. User Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(400).json({ error: 'User not found' });
    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) return res.status(400).json({ error: 'Invalid password' });
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      'your-secret-key',
      { expiresIn: '24h' }
    );
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  });
});

// 9. Recipe routes

// Create new recipe
app.post('/api/recipes', authenticateToken, (req, res) => {
  const { title, description, ingredients, instructions, category, prep_time, cook_time, servings, image_url, video_url } = req.body;
  const userId = req.user.userId;
  const sql = `
    INSERT INTO recipes 
      (user_id, title, description, ingredients, instructions, category, prep_time, cook_time, servings, image_url, video_url) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [userId, title, description, ingredients, instructions, category, prep_time, cook_time, servings, image_url, video_url], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Recipe created', recipeId: result.insertId });
  });
});

// Get all recipes
app.get('/api/recipes', (req, res) => {
  db.query('SELECT * FROM recipes', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// Get recipe details
app.get('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM recipes WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'Recipe not found' });
    res.json(results[0]);
  });
});

// Update recipe (only owner)
app.put('/api/recipes/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const { title, description, ingredients, instructions, category, prep_time, cook_time, servings, image_url, video_url } = req.body;
  db.query('SELECT user_id FROM recipes WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'Recipe not found' });
    if (results[0].user_id !== userId) return res.status(403).json({ error: 'Not authorized' });
    const sql = `
      UPDATE recipes SET 
        title=?, description=?, ingredients=?, instructions=?, category=?, prep_time=?, cook_time=?, servings=?, image_url=?, video_url=?
      WHERE id=?
    `;
    db.query(sql, [title, description, ingredients, instructions, category, prep_time, cook_time, servings, image_url, video_url, id], (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ message: 'Recipe updated' });
    });
  });
});

// Delete recipe (only owner)
app.delete('/api/recipes/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  db.query('SELECT user_id FROM recipes WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'Recipe not found' });
    if (results[0].user_id !== userId) return res.status(403).json({ error: 'Not authorized' });
    db.query('DELETE FROM recipes WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ message: 'Recipe deleted' });
    });
  });
});

// 10. Favorites routes
app.post('/api/favorites', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { recipeId } = req.body;
  const sql = 'INSERT INTO favorites (user_id, recipe_id) VALUES (?, ?)';
  db.query(sql, [userId, recipeId], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Already favorited' });
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Recipe added to favorites' });
  });
});

app.get('/api/favorites', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const sql = `
    SELECT r.* FROM recipes r
    JOIN favorites f ON r.id = f.recipe_id
    WHERE f.user_id = ?
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

app.delete('/api/favorites/:recipeId', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const recipeId = req.params.recipeId;
  const sql = 'DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?';
  db.query(sql, [userId, recipeId], (err) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Recipe removed from favorites' });
  });
});

// 11. Comments routes
app.post('/api/comments', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { recipeId, content } = req.body;
  const sql = 'INSERT INTO comments (user_id, recipe_id, content) VALUES (?, ?, ?)';
  db.query(sql, [userId, recipeId, content], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Comment added', commentId: result.insertId });
  });
});

app.get('/api/comments/:recipeId', (req, res) => {
  const recipeId = req.params.recipeId;
  const sql = `
    SELECT c.id, c.content, c.created_at, u.username
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.recipe_id = ?
    ORDER BY c.created_at DESC
  `;
  db.query(sql, [recipeId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// 12. Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
