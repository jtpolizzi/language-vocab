# PWA + Google Drive Integration Overview

This document summarizes the key concepts, architecture, and implementation paths for enabling a Progressive Web App (PWA) to load, store, edit, and sync vocab data files (CSV/TSV/JSON) using Google Drive. It is designed to hand off to Codex or another development assistant.

---

## 1. PWA Capabilities Relevant to File Storage

Once the app is installed as a PWA (desktop or Android), browsers expose additional APIs and capabilities:

### **1.1 File System Access API (Desktop + Android Chrome)**
- Open user-selected files directly from the real file system (Downloads, Documents, etc.).
- Modify and **save back to the same file** using a persistent file handle.
- Create new files with `showSaveFilePicker()`.
- Store long-lived file handles in IndexedDB for future reopening.

### **1.2 OPFS (Origin Private File System)**
- High-performance, persistent local file storage.
- Ideal for offline caching of vocab data.
- Works offline and without user interaction.

### **1.3 Larger Persistent Storage Through the Storage API**
- Installed PWAs can request `navigator.storage.persist()`, reducing the risk of browser eviction.

### **1.4 Offline-First Architecture**
- Service worker caches the UI.
- OPFS/IndexedDB store user vocab data.
- Sync to cloud (Google Drive) when online.

### **1.5 Cross-Platform Reality**
- Windows/macOS Chrome/Edge → full file access.
- Android Chrome → good file picker and write support.
- iOS Safari → no File System Access API; fallback to import/export via file input and Blob downloads.

---

## 2. Google Drive Integration Options

PWAs cannot directly "mount" Drive. Instead, the app communicates with Google Drive through official APIs with user authorization.

There are two main approaches:

### **2.1 Drive API (Direct from the Browser)**
- Uses Google Identity Services for OAuth.
- App receives an access token with scope `drive.file` or `drive.appdata`.
- Supports listing, loading, creating, and updating Drive files.
- Format options: TSV, CSV, JSON.
- Works on all platforms including iOS (because it's HTTP-based, not file-based).

**Common Calls:**
- `files.list` – find vocab files.
- `files.get(fileId, alt=media)` – download file contents.
- `files.create` – create a new vocab file.
- `files.update` – overwrite with updated vocab.

### **2.2 Google Picker API (Optional)**
- Provides a GUI chooser so users can pick Drive files visually.
- After obtaining file ID, the app loads it via Drive API.

### **2.3 Apps Script Web App Backend (Alternative)**
- A lightweight mini-backend hosted by Google.
- PWA fetches data from the script, script reads/writes to Sheets or Drive.
- Avoids OAuth on the front-end.
- Can centralize or validate data.

---

## 3. Recommended Architecture for the Vocab Mini-App

### **3.1 Local-First Workflow**
- When the user opens a file, store a local copy in OPFS.
- If offline, load from OPFS.
- If online and Drive-linked, sync changes to Drive.

### **3.2 Typical Data Flow**
```
User selects file → App loads from Drive → Stores local copy in OPFS
User edits file → App updates local copy → Optional auto-sync to Drive
User saves file → App updates Drive version via Drive API
```

### **3.3 File Handle Persistence**
- On desktop/Android, store `FileSystemFileHandle` objects in IndexedDB.
- Allows reopening the same local file without reprompting.

### **3.4 Offline Behavior**
- Service worker ensures UI loads offline.
- Local OPFS version becomes the fallback data source.
- Sync engine runs when online.

---

## 4. Using Drive API in a PWA

### **4.1 Authentication Requirements**
- Create a Google Cloud project.
- Create OAuth client of type **Web Application**.
- Add authorized JavaScript origins (GitHub Pages URL).
- Request `drive.file` scope.

### **4.2 Loading a File**
- Query Drive for `.csv`/`.tsv` files or use Picker.
- Download using `files.get(fileId, alt="media")`.
- Parse into in-memory structures.

### **4.3 Saving a File**
- Use `files.update(fileId, uploadType="media")` to replace file body.
- Or `files.create` to generate a new file.

### **4.4 Metadata Management**
Store the following locally:
- `fileId`
- last modified timestamp
- local version
- pending changes queue for offline edits

---

## 5. Service Worker Update Strategy

### Problems with default behavior:
- Users don’t automatically get new versions after deploy.
- Old cached files may linger.

### Recommended Strategy:
- Use `self.skipWaiting()` and `clients.claim()` for immediate activation.
- Version cache keys: `CACHE = "vX.Y.Z"`.
- On each deploy, bump the version.

This ensures:
- Updates install immediately
- No stale caches
- Predictable behavior during active development

---

## 6. Summary

A PWA served from GitHub Pages gains powerful capabilities:
- Persistent, offline-friendly local storage (OPFS/IndexedDB)
- Direct editing and saving of local files on desktop/Android
- Cloud sync to Google Drive using Drive API
- Installability and better user experience

While a standard static page cannot reliably handle offline data or interact deeply with the file system, a PWA can serve as a true “app-like” environment with robust storage options and Drive integration.

This architecture supports:
- Local vocab file editing
- Multi-device sync via Drive
- Offline usage with automatic resync
- A clean, modern UX comparable to native apps

