// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const usernameInput = document.getElementById('usernameInput');
const loginError = document.getElementById('loginError');
const usernameDisplay = document.getElementById('usernameDisplay');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const filesInfo = document.getElementById('filesInfo');
const filesCount = document.getElementById('filesCount');
const filesListUpload = document.getElementById('filesListUpload');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const uploadStatus = document.getElementById('uploadStatus');
const errorMessage = document.getElementById('errorMessage');
const filesListDisplay = document.getElementById('filesListDisplay');

let selectedFiles = [];
let authToken = null;
let currentUsername = null;

// File type icons mapping
const fileIcons = {
  'pdf': '📄',
  'image': '🖼️',
  'video': '🎥',
  'audio': '🎵',
  'document': '📝',
  'spreadsheet': '📊',
  'archive': '📦',
  'code': '💻',
  'default': '📁'
};

// Get file icon based on mime type or extension
function getFileIcon(filename, mimetype = '') {
  const ext = filename.split('.').pop().toLowerCase();
  const mime = mimetype.toLowerCase();

  if (mime.includes('pdf') || ext === 'pdf') return fileIcons.pdf;
  if (mime.includes('image')) return fileIcons.image;
  if (mime.includes('video')) return fileIcons.video;
  if (mime.includes('audio')) return fileIcons.audio;
  if (mime.includes('word') || ext === 'docx' || ext === 'doc') return fileIcons.document;
  if (mime.includes('excel') || ext === 'xlsx' || ext === 'xls') return fileIcons.spreadsheet;
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z')) return fileIcons.archive;
  if (ext === 'txt' || ext === 'json' || ext === 'csv') return fileIcons.document;
  if (ext === 'js' || ext === 'html' || ext === 'css' || ext === 'py' || ext === 'java') return fileIcons.code;
  
  return fileIcons.default;
}

// Load session from localStorage on page load
window.addEventListener('load', () => {
  const savedToken = localStorage.getItem('authToken');
  const savedUsername = localStorage.getItem('username');
  
  if (savedToken && savedUsername) {
    verifySession(savedToken, savedUsername);
  }
});

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Format date
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Verify session is still valid
function verifySession(token, username) {
  fetch('/verify-session', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      authToken = token;
      currentUsername = username;
      showDashboard();
      loadFiles();
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem('username');
      showLoginPage();
    }
  })
  .catch(err => {
    console.error('Session verification failed:', err);
    showLoginPage();
  });
}

// Handle login
function handleLogin() {
  const username = usernameInput.value.trim();
  
  if (!username) {
    showLoginError('Please enter a username');
    return;
  }

  if (username.length > 50) {
    showLoginError('Username must be 50 characters or fewer');
    return;
  }

  if (/[\x00-\x1F\x7F]/.test(username)) {
    showLoginError('Username cannot contain control characters');
    return;
  }

  // Send login request
  fetch('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      authToken = data.token;
      currentUsername = data.username;
      
      // Save to localStorage
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('username', currentUsername);
      
      showDashboard();
      loadFiles();
    } else {
      showLoginError(data.error || 'Login failed');
    }
  })
  .catch(err => {
    console.error('Login error:', err);
    showLoginError('Login failed. Please try again.');
  });
}

// Show login page
function showLoginPage() {
  loginSection.classList.add('active');
  dashboardSection.classList.remove('active');
  usernameInput.focus();
}

// Show dashboard
function showDashboard() {
  loginSection.classList.remove('active');
  dashboardSection.classList.add('active');
  usernameDisplay.textContent = currentUsername;
  resetUpload();
}

// Show login error
function showLoginError(message) {
  loginError.textContent = message;
  loginError.classList.remove('hidden');
}

// Show upload error
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
  setTimeout(() => {
    hideError();
  }, 5000);
}

// Hide error message
function hideError() {
  errorMessage.classList.add('hidden');
  errorMessage.textContent = '';
}

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    selectedFiles = Array.from(files);
    handleFileSelection();
  }
});

// File input change handler
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    selectedFiles = Array.from(e.target.files);
    handleFileSelection();
  }
});

// Allow selecting the same file again by resetting input
// This is important for the change event to fire
fileInput.addEventListener('click', (e) => {
  e.target.value = '';
});

// Handle file selection
function handleFileSelection() {
  if (!selectedFiles || selectedFiles.length === 0) {
    console.log('No files selected');
    return;
  }

  console.log(`Files selected: ${selectedFiles.length}`);
  hideError();

  // Check file count
  if (selectedFiles.length > 20) {
    showError('Maximum 20 files per upload. Please select fewer files.');
    selectedFiles = [];
    return;
  }

  // Check individual file sizes
  for (const file of selectedFiles) {
    if (file.size > 500 * 1024 * 1024) {
      showError(`File "${file.name}" exceeds 500MB limit`);
      selectedFiles = [];
      return;
    }
  }

  // Show files info
  filesCount.textContent = `${selectedFiles.length} file(s)`;
  const itemsHtml = selectedFiles.map((file, index) => `
    <div class="file-item-upload">
      <span class="file-icon">${getFileIcon(file.name, file.type)}</span>
      <div class="file-name">${escapeHtml(file.name)}</div>
      <div class="file-size">${formatFileSize(file.size)}</div>
      <button class="file-remove-btn" onclick="removeFile(${index})" type="button">Remove</button>
    </div>
  `).join('');
  
  filesListUpload.innerHTML = itemsHtml;
  filesInfo.classList.remove('hidden');

  // Show custom naming section
  showFileNamingSection();

  // Auto-upload after a short delay
  console.log('Starting upload in 500ms...');
  setTimeout(() => {
    console.log('uploadFiles called');
    uploadFiles();
  }, 500);
}

// Show file naming section with input fields
function showFileNamingSection() {
  const fileNamingSection = document.getElementById('fileNamingSection');
  const fileNamingInputs = document.getElementById('fileNamingInputs');
  
  const namingHtml = selectedFiles.map((file, index) => `
    <div class="file-naming-item">
      <span class="file-icon-small">${getFileIcon(file.name, file.type)}</span>
      <div>
        <div class="original-name">Original: ${escapeHtml(file.name)}</div>
        <input 
          type="text" 
          class="custom-file-name" 
          data-index="${index}" 
          placeholder="Enter custom name (optional)"
          value="${getFileNameWithoutExtension(file.name)}"
        >
        <div class="naming-help-text">Tip: Leave blank to keep original name</div>
      </div>
    </div>
  `).join('');
  
  fileNamingInputs.innerHTML = namingHtml;
  fileNamingSection.classList.remove('hidden');
}

// Get file name without extension
function getFileNameWithoutExtension(filename) {
  return filename.substring(0, filename.lastIndexOf('.')) || filename;
}

// Get file extension
function getFileExtension(filename) {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(lastDot) : '';
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Remove file from selection
function removeFile(index) {
  selectedFiles.splice(index, 1);
  if (selectedFiles.length === 0) {
    filesInfo.classList.add('hidden');
    resetUpload();
  } else {
    handleFileSelection();
  }
}

// Upload files
function uploadFiles() {
  if (!selectedFiles || selectedFiles.length === 0) {
    console.log('No files to upload');
    showError('No files selected');
    return;
  }

  console.log(`uploadFiles() called with ${selectedFiles.length} files`);

  // Show progress
  progressContainer.classList.remove('hidden');
  uploadStatus.textContent = `Uploading ${selectedFiles.length} file(s)...`;
  progressFill.style.width = '0%';
  progressText.textContent = '0%';

  // Create FormData with files and custom names
  const formData = new FormData();
  
  // Get custom names from input fields
  const customNameInputs = document.querySelectorAll('.custom-file-name');
  const customNames = {};
  
  customNameInputs.forEach(input => {
    const index = input.getAttribute('data-index');
    const customName = input.value.trim();
    if (customName) {
      const extension = getFileExtension(selectedFiles[index].name);
      customNames[index] = customName + extension;
    }
  });
  
  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    console.log(`Adding file ${i + 1}: ${file.name} (${file.size} bytes)`);
    formData.append('files', file);
    
    // Add custom name if provided
    if (customNames[i]) {
      formData.append(`customNames[${i}]`, customNames[i]);
    }
  }

  // Upload using XMLHttpRequest for progress tracking
  const xhr = new XMLHttpRequest();

  // Track upload progress
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percentComplete = (e.loaded / e.total) * 100;
      progressFill.style.width = percentComplete + '%';
      progressText.textContent = Math.round(percentComplete) + '%';
      console.log(`Upload progress: ${Math.round(percentComplete)}%`);
    }
  });

  // Handle successful upload
  xhr.addEventListener('load', () => {
    console.log(`XHR load event, status: ${xhr.status}`);
    
    if (xhr.status === 200) {
      try {
        const response = JSON.parse(xhr.responseText);
        console.log('Upload response:', response);
        
        if (response.success) {
          uploadStatus.textContent = `✅ ${response.message}`;
          console.log('Upload successful');
          
          // Wait a moment before cleaning up
          setTimeout(() => {
            progressContainer.classList.add('hidden');
            progressFill.style.width = '0%';
            progressText.textContent = '0%';
            resetUpload();
            loadFiles();
          }, 1500);
        } else {
          showError(response.error || 'Upload failed');
          resetUpload();
        }
      } catch (e) {
        console.error('Error parsing response:', e, xhr.responseText);
        showError('Invalid server response');
        resetUpload();
      }
    } else {
      try {
        const response = JSON.parse(xhr.responseText);
        console.error('Upload failed with status', xhr.status, response);
        showError(response.error || `Upload failed (${xhr.status})`);
      } catch (e) {
        console.error('Error parsing error response:', xhr.responseText);
        showError(`Upload failed (${xhr.status})`);
      }
      resetUpload();
    }
  });

  // Handle errors
  xhr.addEventListener('error', () => {
    console.error('XHR error event');
    showError('Network error. Please check your connection and try again.');
    resetUpload();
  });

  // Handle abort
  xhr.addEventListener('abort', () => {
    console.log('XHR abort event');
    showError('Upload cancelled.');
    resetUpload();
  });

  // Handle timeout
  xhr.addEventListener('timeout', () => {
    console.error('XHR timeout event');
    showError('Upload timed out. Try again with fewer or smaller files.');
    resetUpload();
  });

  // Send the request
  try {
    console.log('Sending upload request to /upload');
    xhr.open('POST', '/upload', true);
    xhr.timeout = 300000; // 5 minute timeout
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.send(formData);
  } catch (err) {
    console.error('Error sending XHR:', err);
    showError('Failed to start upload: ' + err.message);
    resetUpload();
  }
}

// Load and display files
function loadFiles() {
  fetch('/files', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      displayFiles(data.files);
    } else {
      filesListDisplay.innerHTML = '<p class="no-files">Failed to load files</p>';
    }
  })
  .catch(err => {
    console.error('Load files error:', err);
    filesListDisplay.innerHTML = '<p class="no-files">Error loading files</p>';
  });
}

// Display files in the list
function displayFiles(files) {
  if (files.length === 0) {
    filesListDisplay.innerHTML = '<p class="no-files">No files uploaded yet</p>';
    return;
  }

  filesListDisplay.innerHTML = files.map(file => `
    <div class="file-item">
      <div class="file-item-icon">${getFileIcon(file.name, file.mime || '')}</div>
      <div class="file-details">
        <div class="file-name">${escapeHtml(file.name)}</div>
        <div class="file-meta">
          ${formatFileSize(file.size)} • ${formatDate(file.uploadTime)}
        </div>
      </div>
      <div class="file-actions">
        <button class="btn btn-download" onclick="downloadFile('${file.id}', '${escapeHtml(file.name)}')">
          ⬇️ Download
        </button>
        <button class="btn btn-delete" onclick="deleteFile('${file.id}')">
          🗑️ Delete
        </button>
      </div>
    </div>
  `).join('');
}

// Download file
function downloadFile(fileId, fileName) {
  fetch(`/download/${fileId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(res => res.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  })
  .catch(err => {
    console.error('Download error:', err);
    showError('Download failed');
  });
}

// Delete file
function deleteFile(fileId) {
  if (!confirm('Are you sure you want to delete this file?')) {
    return;
  }

  fetch(`/file/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      loadFiles();
    } else {
      showError(data.error || 'Delete failed');
    }
  })
  .catch(err => {
    console.error('Delete error:', err);
    showError('Delete failed');
  });
}

// Reset upload form
function resetUpload() {
  console.log('resetUpload() called');
  hideError();
  
  selectedFiles = [];
  fileInput.value = ''; // Clear the file input
  filesInfo.classList.add('hidden');
  filesCount.textContent = '';
  filesListUpload.innerHTML = '';
  progressContainer.classList.add('hidden');
  progressFill.style.width = '0%';
  progressText.textContent = '0%';
  uploadStatus.textContent = '';
  
  // Try to focus on drop zone
  try {
    dropZone.focus();
  } catch (e) {
    console.log('Could not focus dropZone');
  }
}

// Logout
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    authToken = null;
    currentUsername = null;
    loginError.classList.add('hidden');
    usernameInput.value = '';
    showLoginPage();
  }
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make drop zone clickable
dropZone.addEventListener('click', (e) => {
  if (e.target.closest('button')) {
    return;
  }
  console.log('dropZone clicked');
  // Clear the file input value to allow selecting the same file again
  fileInput.value = '';
  selectedFiles = [];
  // Trigger the file picker
  fileInput.click();
});

// Enter key to login
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleLogin();
  }
});

// Log when app is ready
console.log('✨ File Drop frontend loaded successfully!');
