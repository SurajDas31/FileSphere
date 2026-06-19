# FileSphere - Project Overview

FileSphere is a modern, web-based file management interface featuring a sophisticated glassmorphism-inspired UI. It provides a rich, interactive environment for browsing, managing, and previewing documents with a focus on visual aesthetics and user experience.

## Project Structure

- **FrontEnd/**: A React application built with Vite. It contains all the UI logic, components, and styles.
- **BackEnd/**: A containerized Go service that handles folder structures, metadata storage, secure chunked uploads, compression, and end-to-end file encryption.

## Technologies

### FrontEnd
- **Framework**: React 19
- **Build Tool**: Vite 8
- **UI Components**:
  - `allotment`: For resizable, split-pane layouts.
  - `lucide-react`: For a consistent and modern icon set.
- **Styling**: Vanilla CSS with a focus on Glassmorphism (backdrop-filters, transparency, and glowing borders).
- **Icons**: SVG-based icons from Lucide.

### BackEnd
- **Language**: Go 1.21+
- **Web Framework**: Gin-Gonic 1.9+
- **ORM**: GORM 1.25+
- **Database**: PostgreSQL 15 (Docker)
- **Encryption**: AES-CTR (AES cipher block in Counter Mode)
- **Compression**: gzip compression for physical storage optimization

## Key Features

- **Split-Pane Workspace**: Resizable panes for the repository tree, file list, and file viewer.
- **Repository Tree**: Hierarchical view of folders and files with state management for expansion and selection.
- **Document List**: Detailed view of files with metadata (Owner, Date Modified, Tags, Type).
- **File Preview**: A dedicated viewer for different file types (PDFs, Word documents, Excel sheets, images, videos, and text files). It also supports previewing contents of ZIP archives.
- **Context Menus**: Custom right-click menus for folder and file operations.
- **Resumable Chunked Uploads**: Client-side slicing of large files into chunks with parallel upload, pause, resume, and backend chunk consolidation.
- **End-to-End Cryptographic Storage**: Auto-compression (gzip) and AES-CTR encryption on upload, with on-the-fly decryption and decompression during streaming or downloading.
- **Dark Mode Support**: Built-in variables for switching between light and dark themes.

## Building and Running

### FrontEnd

All commands should be run from the `FrontEnd` directory.

- **Install Dependencies**:
  ```bash
  npm install
  ```
- **Start Development Server**:
  ```bash
  npm run dev
  ```
- **Build for Production**:
  ```bash
  npm run build
  ```
- **Lint Code**:
  ```bash
  npm run lint
  ```
- **Preview Production Build**:
  ```bash
  npm run preview
  ```

### BackEnd

All commands should be run from the `BackEnd` directory.

- **Start Services (Database & API)**:
  ```bash
  docker compose up -d
  ```
- **Stop Services**:
  ```bash
  docker compose down
  ```
- **View API Logs**:
  ```bash
  docker compose logs -f api
  ```
- **Run API Server Locally (for development)**:
  Make sure database is running, then run in the `BackEnd/file-managed-service` directory:
  ```bash
  go run main.go
  ```

## Development Conventions

- **Component Structure**: Functional components using React Hooks (`useState`, `useEffect`).
- **Styling**:
  - Global styles and CSS variables are defined in `src/index.css`.
  - Component-specific styles are often embedded using `style` tags with `dangerouslySetInnerHTML` for quick prototyping, but should ideally be moved to CSS modules or external stylesheets for production.
- **State Management**: Local state is used for managing documents, selection, and pane visibility. Features are modularized into dedicated components (e.g., `Repository.jsx`, `FileList.jsx`) to keep `App.jsx` lean.
- **Naming**: PascalCase for component files and functions; camelCase for variables and hooks.

## Future Roadmap

- Integrate multi-user authentication (session/JWT tokens) and user-specific document owners.
- Implement file-sharing options (e.g., generating public access tokens).
- Optimize the chunked upload manager to support parallel chunk transfers.
