# 📤 File Drop - Username-Based File Storage

A simple, secure Node.js web app for storing and sharing files with a username-based system. No password needed - just pick a username and upload your files!

## ✨ Features

- **Username-Based Access** - No login credentials needed, just choose any username
- **Instant File Upload** - Upload files with drag and drop support
- **File Management** - View, download, and delete your files anytime
- **Multi-Device Access** - Login from any device with the same username
- **Progress Tracking** - Visual upload progress bar
- **Mobile Friendly** - Fully responsive design works on all devices
- **Session Management** - Your login persists across browser sessions
- **Large File Support** - Upload files up to 500MB
- **Secure Storage** - Files stored in user-specific directories

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express
- Multer (file uploads)
- UUID (session tokens)

**Frontend:**
- HTML5
- CSS3 (with animations)
- Vanilla JavaScript (no frameworks)

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd "path/to/file-drop"
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will run on `http://localhost:3000`

### 3. Open in Browser

```
http://localhost:3000
```

## 📖 How It Works

1. **Login** - Enter any username up to 50 characters; special characters are allowed and no password is needed
2. **Upload** - Drag & drop or click to upload files (up to 500MB)
3. **Access** - See all your uploaded files with size and upload date
4. **Download** - Download your files anytime
5. **Delete** - Remove files you no longer need
6. **Multi-Device** - Login from another device with the same username to access your files

## 🔌 API Endpoints

### POST /login
Login with username only
```json
{
  "username": "john_doe"
}
```

Response:
```json
{
  "success": true,
  "token": "uuid-token",
  "username": "john_doe"
}
```

### POST /upload
Upload a file (requires authentication)
- Form data with file
- Header: `Authorization: Bearer {token}`

### GET /files
Get list of user's files (requires authentication)
- Header: `Authorization: Bearer {token}`

### GET /download/:filename
Download a specific file (requires authentication)
- Header: `Authorization: Bearer {token}`

### DELETE /file/:filename
Delete a specific file (requires authentication)
- Header: `Authorization: Bearer {token}`

### GET /verify-session
Verify if session token is valid

## 🔒 Security Notes

- Files are stored in user-specific directories
- Each user can only access their own files
- Session tokens are cryptographically random UUIDs
- No passwords stored (no password complexity needed)
- Sessions persist in localStorage until logout
- Files cannot be accessed without valid authentication

## 💾 File Storage

Files are organized by username:
```
uploads/
├── username1/
│   ├── file1.pdf
│   └── file2.txt
├── username2/
│   └── document.docx
```

## ⚙️ Configuration

### File Size Limit
Edit `server.js` in multer configuration:
```javascript
limits: { fileSize: 500 * 1024 * 1024 } // Change 500 to desired MB
```

### Server Port
Edit `server.js`:
```javascript
const PORT = 3000; // Change to desired port
```

### Username Validation
Usernames can include special characters, but control characters are rejected and the length limit is 50 characters.

## 🌐 Deployment

### For Production

1. Update server.js to use environment variables:
```javascript
const PORT = process.env.PORT || 3000;
```

2. Make sure uploads directory has proper permissions

3. Consider adding:
   - HTTPS/SSL certificate
   - Rate limiting
   - CORS configuration
   - Database for persistent storage
   - Backup strategy for uploaded files

### Using Heroku

```bash
heroku login
heroku create your-app-name
npm install express
git push heroku main
```

## 🚀 Performance Tips

- For production, use a reverse proxy (nginx)
- Consider cloud storage (AWS S3, Azure Blob) for files
- Add rate limiting to prevent abuse
- Use PM2 for process management
- Implement database for permanent user data

## 🐛 Troubleshooting

**Port Already in Use:**
```bash
# Use a different port
set PORT=3001
npm start
```

**Files Not Uploading:**
- Check `/uploads` folder exists and has write permissions
- Verify network connection
- Check browser console for errors
- Ensure file size is under 500MB

**Cannot Login:**
- Username must be 1-50 characters
- Special characters are allowed, but control characters are not
- Check browser console for error messages

**Session Not Persisting:**
- Clear browser cache
- Enable localStorage in browser settings
- Try a different browser

## 📝 License

MIT - Feel free to use this project for personal or commercial use

## 👨‍💻 Contributing

Feel free to fork, modify, and improve!

## 🤝 Support

For issues or questions, check the troubleshooting section.

---

**Made with ❤️ for simple, username-based file sharing**
