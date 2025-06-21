# FigmaAI: Text-to-Design Figma Plugin Monorepo

**FigmaAI** is a monorepo project that enables users to generate Figma designs from natural language prompts using an LLM (Google Gemini/OpenAI) via a Bun-powered backend server. The project consists of two packages:

- **plugin**: The Figma plugin that sends prompts to the backend and renders the returned JSON design spec as Figma objects.
- **server**: A Hono/Bun backend that receives prompts, calls the LLM, and returns a design JSON (with fallback if LLM fails).

All scripts and dependencies are managed with Bun. See below for setup and usage instructions.

---

# FigmaAI Monorepo

AI-powered design generation for Figma using Google Gemini and Hono server.

## Project Structure

```
/
├── packages/
│   ├── plugin/          # Figma plugin code
│   │   ├── src/         # Plugin source code
│   │   ├── manifest.json # Figma plugin manifest
│   │   └── ui.html      # Plugin UI
│   └── server/          # Hono server for AI generation
│       └── src/         # Server source code
├── package.json         # Root package.json with workspaces
└── README.md
```

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) installed
- Google AI API key

### Installation

1. Clone the repository
2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
   - Create `.env` in `packages/server/`
   - Add your Google AI API key: `GOOGLE_GENERATIVE_AI_API_KEY=your_key_here`

### Development

#### Start the server:
```bash
bun run dev:server
```

#### Build the plugin:
```bash
bun run build:plugin
```

#### Watch mode for plugin development:
```bash
bun run watch:plugin
```

#### Build everything:
```bash
bun run build
```

## Available Scripts

- `bun run build` - Build all packages
- `bun run dev` - Start server in development mode
- `bun run build:plugin` - Build only the plugin
- `bun run build:server` - Build only the server
- `bun run dev:server` - Start server with hot reload
- `bun run watch:plugin` - Build plugin in watch mode
- `bun run lint` - Lint the plugin code
- `bun run lint:fix` - Lint and fix the plugin code

## Package Details

### Plugin (`packages/plugin`)
- Figma plugin that communicates with the server
- Built with TypeScript and Figma Plugin API
- Provides UI for users to input design prompts

### Server (`packages/server`)
- Hono-based server running on Bun
- Integrates with Google AI (Gemini) for design generation
- Provides REST API for design generation

## Installation in Figma

1. Build the plugin: `bun run build:plugin`
2. In Figma: Plugins → Development → Import plugin from manifest
3. Select `packages/plugin/manifest.json`

## Usage

1. Start the server: `bun run dev:server`
2. Open the plugin in Figma
3. Enter a design prompt (e.g., "Create a modern login form")
4. The AI will generate Figma elements based on your prompt

## Architecture

The system consists of two main components:

1. **Figma Plugin**: Runs in Figma, provides UI, communicates with server
2. **Hono Server**: Processes AI requests, returns structured design data

The plugin sends prompts to the server, which uses Google AI to generate structured JSON representing Figma design elements, which are then created in Figma.
