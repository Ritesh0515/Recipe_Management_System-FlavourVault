// Import required packages
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');

// Create Express app
const app = express();
const PORT = 3000;

// Middleware (helpers)
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',        //  MySQL username
    password: 'MYSQL@0515#_ritesh',        //  MySQL password 
    database: 'flavorvault'
});

// Connect to database
db.connect((err) => {
    if (err) {
        console.log('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Test route (to check if server works)
app.get('/', (req, res) => {
    res.json({ message: 'FlavorVault Backend is running!' });
});


// User Registration
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert new user
        db.query(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hashedPassword],
            (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to create user' });
                }
                res.json({ message: 'User registered successfully', userId: result.insertId });
            }
        );
    });
});


// User Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // Find user by email
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }
        
        const user = results[0];
        
        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid password' });
        }
        
        // Create token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            'your-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    });
});


// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
