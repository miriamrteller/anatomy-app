# Frontend for Anatomy App

React + Vite + TypeScript frontend for the anatomy app.

## Setup

From the `frontend` directory:

```bash
npm install
npm run dev
```

The frontend will start on `http://localhost:5173` and proxy API requests to `http://localhost:3000`.

## Technologies

- **Framework:** React 18 with TypeScript strict mode
- **Build Tool:** Vite 5
- **Styling:** Tailwind CSS 3
- **State Management:** Zustand
- **Type Safety:** TypeScript with strict compiler settings

## Components

- **AnatomySVG:** Renders an inline SVG with hover/click interactions
- **SidePanel:** Displays selected structure details (name, latin name, system, description)
- **LayerControls:** Toggle visibility of different body systems
- **App:** Main layout component

## Features

- SVG path hover highlighting with color change
- Click to fetch structure details from backend API
- Zustand global state for structure selection and system visibility
- Layer controls with Show All/Hide All buttons
- System visibility toggling
- Responsive design with Tailwind CSS
- Full TypeScript strict mode compliance
