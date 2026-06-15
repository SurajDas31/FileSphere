# FileSphere - Project Overview

FileSphere is a modern, web-based file management interface featuring a sophisticated glassmorphism-inspired UI. It provides a rich, interactive environment for browsing, managing, and previewing documents with a focus on visual aesthetics and user experience.

## Project Structure

- **FrontEnd/**: A React application built with Vite. It contains all the UI logic, components, and styles.
- **BackEnd/**: Currently an empty directory, intended for future server-side implementation (API, storage management, etc.).

## Technologies (FrontEnd)

- **Framework**: React 19
- **Build Tool**: Vite 8
- **UI Components**:
  - `allotment`: For resizable, split-pane layouts.
  - `lucide-react`: For a consistent and modern icon set.
- **Styling**: Vanilla CSS with a focus on Glassmorphism (backdrop-filters, transparency, and glowing borders).
- **Icons**: SVG-based icons from Lucide.

## Key Features

- **Split-Pane Workspace**: Resizable panes for the repository tree, file list, and file viewer.
- **Repository Tree**: Hierarchical view of folders and files with state management for expansion and selection.
- **Document List**: Detailed view of files with metadata (Owner, Date Modified, Tags, Type).
- **File Preview**: A dedicated viewer for different file types.
- **Context Menus**: Custom right-click menus for file and folder operations.
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

- **TODO**: Implement the backend service. Currently, this directory is empty.

## Development Conventions

- **Component Structure**: Functional components using React Hooks (`useState`, `useEffect`).
- **Styling**:
  - Global styles and CSS variables are defined in `src/index.css`.
  - Component-specific styles are often embedded using `style` tags with `dangerouslySetInnerHTML` for quick prototyping, but should ideally be moved to CSS modules or external stylesheets for production.
- **State Management**: Local state is used for managing documents, selection, and pane visibility. Features are modularized into dedicated components (e.g., `Repository.jsx`, `FileList.jsx`) to keep `App.jsx` lean.
- **Naming**: PascalCase for component files and functions; camelCase for variables and hooks.

## Future Roadmap

- Implement the `BackEnd` API for real file system interaction.
- Add support for file uploads and downloads.
- Enhance the `FileViewer` to support more file types (PDF, Office docs, etc.).
- Integrate authentication and user-specific document owners.
