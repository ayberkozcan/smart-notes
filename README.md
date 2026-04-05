# Smart Notes

Smart Notes is a note-taking app built with Express, SQLite, and vanilla frontend files.

## Requirements

- Node.js 22
- npm

## Local development

1. Install dependencies:
   `npm ci`
2. Create a `.env` file with the variables you need.
3. Start the app:
   `npm start`

The app runs on `http://localhost:3000` by default.

## Environment variables

- `PORT`: HTTP port for the server. Default: `3000`
- `SESSION_SECRET`: Secret used by `express-session`
- `CLIENT_ORIGIN`: Allowed frontend origin for CORS. Default: `http://localhost:<PORT>`
- `DB_PATH`: SQLite database path. Default: `src/js/notes.db`
- `OPENAI_API_KEY`: Optional. Enables AI title/content suggestions
- `NODE_ENV`: Set to `production` in deployment

## Tests

Run the backend test suite with:

`npm test`

## Docker

Build the image:

`docker build -t smart-notes .`

Run the container:

`docker run -p 3000:3000 -e SESSION_SECRET=replace-me -e CLIENT_ORIGIN=http://localhost:3000 -v ${PWD}/data:/app/data smart-notes`

For local container usage, you can also run:

`docker compose up --build`

The container stores SQLite data in `/app/data/notes.db`.

## CI

GitHub Actions CI is defined in `.github/workflows/ci.yml`.

It:

- installs dependencies
- runs `npm test`
- verifies the Docker image builds successfully

## Deployment notes

This project is deployment-ready for container platforms such as Render, Railway, Fly.io, or any VPS that can run Docker.

Recommended production settings:

- set a strong `SESSION_SECRET`
- mount persistent storage for `/app/data`
- set `CLIENT_ORIGIN` to your public app URL
- set `NODE_ENV=production`
- optionally set `OPENAI_API_KEY` if AI features should stay enabled

## Health check

The server exposes:

`GET /health`

It returns:

`{"ok": true}`
