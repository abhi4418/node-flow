# Frontend - Visual Node Editor

React-based visual node editor built with React Flow, Tailwind CSS, and Zustand.

## Features

### Node Types (Quick Access Sidebar)

1. **Text Node** - Simple text input with textarea, output handle
2. **Upload Image Node** - File upload via Transloadit (jpg, jpeg, png, webp, gif)
3. **Upload Video Node** - File upload via Transloadit (mp4, mov, webm, m4v)
4. **Run LLM Node** - Google Gemini API with model selector, supports images
5. **Crop Image Node** - FFmpeg-based cropping with percentage parameters
6. **Extract Frame Node** - Extract frames from video at timestamp

### Visual Effects

- **Pulsating glow** on running nodes
- **Success/Error** state indicators
- Animated edge connections

## Tech Stack

- **React 19** + **TypeScript**
- **React Flow** - Node-based editor
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Uppy + Transloadit** - File uploads
- **Vite** - Build tool

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Make sure the backend is running** on port 3001

## Usage

1. Drag nodes from the sidebar onto the canvas
2. Connect nodes by dragging from output handles (right) to input handles (left)
3. Configure node parameters
4. Click "Run" on processing nodes (LLM, Crop, Extract Frame)
5. View results in the node preview area

## Project Structure

```
src/
├── components/
│   ├── nodes/          # Custom node components
│   ├── ui/             # Reusable UI components
│   ├── FlowCanvas.tsx  # Main React Flow canvas
│   └── Sidebar.tsx     # Quick Access sidebar
├── store/
│   └── flowStore.ts    # Zustand store
├── lib/
│   └── utils.ts        # Utility functions
└── App.tsx             # Main app component
```
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
