const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Store user sessions (in-memory for demo, use DB in production)
const userSessions = new Map();

// Create user-specific uploads directory
const uploadsBaseDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsBaseDir)) {
  fs.mkdirSync(uploadsBaseDir, { recursive: true });
}

function toSafeDirectoryName(username) {
  return `user-${Buffer.from(username, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')}`;
}

function getUserDirectory(username) {
  return path.join(uploadsBaseDir, toSafeDirectoryName(username));
}

function isValidUsername(username) {
  return typeof username === 'string'
    && username.trim().length > 0
    && username.trim().length <= 50
    && !/[\x00-\x1F\x7F]/.test(username.trim());
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const username = req.userSession?.username;
    if (!username) {
      return cb(new Error('Not authenticated'));
    }
    const userDir = getUserDirectory(username);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // Save file with unique name to avoid conflicts within user folder
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 500 * 1024 * 1024, // 500MB per file
    files: 20 // Maximum 20 files per upload
  }
});

// Middleware to check session
const checkSession = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token && userSessions.has(token)) {
    req.userSession = userSessions.get(token);
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
};

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Custom error handler for multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large. Maximum 500MB per file.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum 20 files per upload.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file provided.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  
  if (err instanceof Error && err.message === 'Not authenticated') {
    return res.status(401).json({ error: 'You must be logged in to upload files' });
  }
  
  if (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
  
  next();
});

// POST /login - Login with username (no password)
app.post('/login', (req, res) => {
  try {
    const rawUsername = typeof req.body.username === 'string' ? req.body.username : '';
    const username = rawUsername.trim();
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Allow special characters, but reject control characters so usernames stay safe in the UI.
    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'Username must be 1-50 characters and cannot include control characters' });
    }

    // Generate simple session token
    const token = uuidv4();
    userSessions.set(token, { username, loginTime: Date.now() });

    res.json({
      success: true,
      token: token,
      username: username
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /upload - Handle file upload
app.post('/upload', checkSession, upload.array('files', 20), async (req, res) => {
  try {
    console.log(`Upload request from ${req.userSession.username}, files received:`, req.files?.length || 0);
    
    if (!req.files || req.files.length === 0) {
      console.log('No files in request');
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = [];
    const username = req.userSession.username;
  const userDir = getUserDirectory(username);
    
    // Store file metadata (for custom names)
    const metadataFile = path.join(userDir, '.files-metadata.json');
    let metadata = {};
    
    if (fs.existsSync(metadataFile)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
      } catch (e) {
        metadata = {};
      }
    }

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      let displayName = file.originalname;

      // Check if custom name was provided
      const customNameKey = `customNames[${i}]`;
      if (req.body[customNameKey]) {
        displayName = req.body[customNameKey];
        console.log(`Using custom name for file ${i}: ${displayName}`);
      }

      // Store metadata with UUID as key and display name as value
      metadata[file.filename] = {
        displayName: displayName,
        originalName: file.originalname,
        type: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };

      console.log(`File uploaded: ${file.originalname} (${file.size} bytes) to ${file.path}`);

      uploadedFiles.push({
        name: displayName,
        originalName: file.originalname,
        size: file.size,
        mime: file.mimetype,
        uploadedAt: new Date().toISOString()
      });
    }

    // Save metadata file
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

    console.log(`Successfully uploaded ${uploadedFiles.length} file(s) for user ${username}`);

    res.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// GET /files - Get list of files for logged-in user
app.get('/files', checkSession, (req, res) => {
  try {
    const username = req.userSession.username;
    const userDir = getUserDirectory(username);

    if (!fs.existsSync(userDir)) {
      return res.json({ files: [] });
    }

    // Load metadata file if it exists
    const metadataFile = path.join(userDir, '.files-metadata.json');
    let metadata = {};
    
    if (fs.existsSync(metadataFile)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
      } catch (e) {
        console.error('Error reading metadata file:', e);
        metadata = {};
      }
    }

    const files = fs.readdirSync(userDir)
      .filter(filename => !filename.startsWith('.')) // Exclude hidden files
      .map(filename => {
        const filePath = path.join(userDir, filename);
        const stats = fs.statSync(filePath);
        
        // Get display name from metadata or fallback to original
        let displayName = filename.split('-').slice(1).join('-'); // Original name
        if (metadata[filename] && metadata[filename].displayName) {
          displayName = metadata[filename].displayName;
        }
        
        return {
          id: filename,
          name: displayName,
          size: stats.size,
          uploadTime: stats.birthtimeMs,
          uploadedAt: new Date(stats.birthtimeMs).toISOString(),
          mime: metadata[filename]?.type || 'application/octet-stream'
        };
      });

    res.json({ 
      success: true,
      username: username,
      files: files.sort((a, b) => b.uploadTime - a.uploadTime) 
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// GET /download/:filename - Download file
app.get('/download/:filename', checkSession, (req, res) => {
  try {
    const username = req.userSession.username;
    const filename = req.params.filename;
    const userDir = getUserDirectory(username);
    const filePath = path.join(userDir, filename);

    // Security check - ensure file is within user's directory
    if (!filePath.startsWith(userDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Load metadata to get custom name if available
    const metadataFile = path.join(userDir, '.files-metadata.json');
    let downloadName = filename.split('-').slice(1).join('-'); // Default to original name
    
    if (fs.existsSync(metadataFile)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
        if (metadata[filename] && metadata[filename].displayName) {
          downloadName = metadata[filename].displayName;
        }
      } catch (e) {
        console.error('Error reading metadata:', e);
      }
    }
    
    res.download(filePath, downloadName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// DELETE /file/:filename - Delete file
app.delete('/file/:filename', checkSession, (req, res) => {
  try {
    const username = req.userSession.username;
    const filename = req.params.filename;
    const userDir = getUserDirectory(username);
    const filePath = path.join(userDir, filename);

    // Security check
    if (!filePath.startsWith(userDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    
    res.json({ 
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// GET /verify-session - Verify if token is still valid
app.get('/verify-session', checkSession, (req, res) => {
  res.json({
    success: true,
    username: req.userSession.username
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✨ File Drop server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads folder: ${uploadsBaseDir}`);
  console.log(`🔐 Username-based file sharing system ready`);
});
