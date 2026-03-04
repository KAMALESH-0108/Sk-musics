import express from 'express';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3000;

app.use(cookieParser());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

// Mock user database
const users = new Map();

// Signup
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (users.has(email)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now().toString(),
    name,
    email,
    password: hashedPassword,
    picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
  };
  
  users.set(email, user);

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, picture: user.picture }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('auth_token', token, {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ user: { id: user.id, name: user.name, email: user.email, picture: user.picture } });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = users.get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, picture: user.picture }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('auth_token', token, {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ user: { id: user.id, name: user.name, email: user.email, picture: user.picture } });
});

// Generate Google OAuth URL
app.get('/api/auth/url', (req, res) => {
  const redirectUri = `${req.headers.origin || process.env.APP_URL}/api/auth/callback`;
  
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || 'mock-client-id',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'email profile',
    access_type: 'offline',
    prompt: 'consent'
  });

  // If no real client ID is provided, we'll mock the flow
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.json({ url: `/api/auth/mock-google-login?redirect_uri=${encodeURIComponent(redirectUri)}` });
    return;
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl });
});

// Mock Google Login Page (for when no real credentials are provided)
app.get('/api/auth/mock-google-login', (req, res) => {
  const { redirect_uri } = req.query;
  res.send(`
    <html>
      <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f0f0f0;">
        <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
          <h2>Mock Google Login</h2>
          <p>Since GOOGLE_CLIENT_ID is not set, this is a mock login.</p>
          <button onclick="window.location.href='${redirect_uri}?code=mock_auth_code'" style="background: #4285F4; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 16px;">
            Sign in with Google (Mock)
          </button>
        </div>
      </body>
    </html>
  `);
});

// OAuth Callback
app.get(['/api/auth/callback', '/api/auth/callback/'], async (req, res) => {
  const { code } = req.query;
  
  let userInfo = {
    id: '123',
    email: 'user@example.com',
    name: 'Test User',
    picture: 'https://ui-avatars.com/api/?name=Test+User&background=random'
  };

  // If real credentials are provided, exchange code for tokens
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && code !== 'mock_auth_code') {
    try {
      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/callback`;
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.access_token) {
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        userInfo = await userResponse.json();
      }
    } catch (error) {
      console.error('OAuth error:', error);
    }
  }

  // Create session token
  const token = jwt.sign(userInfo, JWT_SECRET, { expiresIn: '7d' });
  
  // Set cookie for iframe context
  res.cookie('auth_token', token, {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.send(`
    <html>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        </script>
        <p>Authentication successful. This window should close automatically.</p>
      </body>
    </html>
  `);
});

// Get current user
app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token', {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
  });
  res.json({ success: true });
});

// Jam session state
const jamSessions = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-jam', ({ jamId, user }) => {
    socket.join(jamId);
    if (!jamSessions.has(jamId)) {
      jamSessions.set(jamId, { users: [], currentSong: null, isPlaying: false, currentTime: 0 });
    }
    const session = jamSessions.get(jamId);
    session.users.push({ id: socket.id, ...user });
    io.to(jamId).emit('jam-updated', session);
  });

  socket.on('leave-jam', ({ jamId }) => {
    socket.leave(jamId);
    const session = jamSessions.get(jamId);
    if (session) {
      session.users = session.users.filter((u: any) => u.id !== socket.id);
      if (session.users.length === 0) {
        jamSessions.delete(jamId);
      } else {
        io.to(jamId).emit('jam-updated', session);
      }
    }
  });

  socket.on('jam-sync', ({ jamId, state }) => {
    const session = jamSessions.get(jamId);
    if (session) {
      session.currentSong = state.currentSong;
      session.isPlaying = state.isPlaying;
      session.currentTime = state.currentTime;
      socket.to(jamId).emit('jam-sync-update', state);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up user from any sessions
    jamSessions.forEach((session, jamId) => {
      session.users = session.users.filter((u: any) => u.id !== socket.id);
      if (session.users.length === 0) {
        jamSessions.delete(jamId);
      } else {
        io.to(jamId).emit('jam-updated', session);
      }
    });
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
