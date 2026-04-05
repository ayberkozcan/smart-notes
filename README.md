# Smart Notes

A lightweight note-taking application built with Express, SQLite, and vanilla frontend technologies.

<<<<<<< HEAD
## Tech stack & third-party resources

This project uses the following libraries and platforms:

- Node.js + npm
- Express.js for the server
- SQLite via the `sqlite3` package for local data storage
- `express-session` for session management
- `bcrypt` for password hashing
- `cors` for handling cross-origin requests
- `dotenv` for environment variable loading
- OpenAI API via the `openai` package for optional title/content suggestions
- Docker for containerized deployment
- Docker Compose for local container orchestration
- GitHub Actions for CI

## Requirements
=======
It allows users to create, edit, and organize notes with optional AI-powered suggestions, along with a simple authentication system and a containerized local development setup.
>>>>>>> 1bc32870649b0a917d3edfc75ba577ad5d75be88

## Preview

### Login Page
<img width="1856" height="948" alt="loginpage" src="https://github.com/user-attachments/assets/17f232b9-85af-4075-9eb5-3e71d5459805" />

### Homepage
<img width="1859" height="950" alt="homepage2" src="https://github.com/user-attachments/assets/6f92980e-9001-4cc1-8368-85b0d4314d7e" />

### Create Note Page
<img width="1844" height="952" alt="createnote" src="https://github.com/user-attachments/assets/12bc48a0-614e-4d92-9317-db2dce266ba2" />

## Features

- User authentication with signup and login
- Create, edit, and delete notes
- Notes organized with title, content, category, and color
- Todo management alongside notes
- Share notes via unique shareable codes to allow access for other users
- Optional AI-powered note title/content suggestions
- Simple and responsive vanilla frontend
- SQLite-based persistent storage
- Session-based authentication with secure configuration
- Dockerized local development environment
- Health check endpoint for monitoring

## Authentication & Authorization

- Users must sign up and log in to access the application
- Session-based authentication using express-session
- Only authenticated users can create, edit, or delete notes and todos
- Protected routes prevent unauthorized access to application data

## API Highlights

- Authentication routes (signup, login, logout)
- CRUD operations for notes
- CRUD operations for todos
- Optional AI suggestion endpoint (requires `OPENAI_API_KEY`)
- Health check endpoint at /health

## Tech Stack & Third-Party Resources

This project uses the following libraries and platforms:

- Node.js + npm
- Express.js for the server
- SQLite via the `sqlite3` package for local data storage
- `express-session` for session management
- `bcrypt` for password hashing
- `cors` for handling cross-origin requests
- `dotenv` for environment variable loading
- OpenAI API via the `openai` package for optional title/content suggestions
- Docker for containerized deployment
- Docker Compose for local container orchestration
- GitHub Actions for CI

## CI

GitHub Actions CI is configured under `.github/workflows/ci.yml`.

It performs:

* Dependency installation
* Running test suite (npm test)
* Docker image build verification

## Health Check

The application exposes a health check endpoint:

```http
GET /health
```

Response:

```bash
{ "ok": true }
```

## Docker Setup

The project can be run using Docker with persistent storage for the SQLite database.

### 1. Clone the repository

```bash
git clone https://github.com/ayberkozcan/smart-notes.git
cd smart-notes
```

### 2. Run with Docker

```bash
docker compose up --build
```
Alternatively
```
docker build -t smart-notes .
docker run -p 3000:3000 \
  -e SESSION_SECRET=replace-me \
  -e CLIENT_ORIGIN=http://localhost:3000 \
  -v ${PWD}/data:/app/data \
  smart-notes
```

The app will be available at:

```bash
http://localhost:3000
```

## Environment Variables

Create a .env file to configure the application:

```env
PORT=3000
SESSION_SECRET=your-secret
CLIENT_ORIGIN=http://localhost:3000
DB_PATH=src/js/notes.db
OPENAI_API_KEY=optional
NODE_ENV=development
```

## Local Development Without Docker

### 1. Clone the repository

```bash
git clone https://github.com/ayberkozcan/smart-notes.git
cd smart-notes
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Create environment file

```bash
cp .env.example .env
```

### 4. Start the application

```bash
npm start
```

The app will run at:

```bash
http://localhost:3000
```

## Testing

Run the backend test suite:

```bash
npm test
```

## Project Highlights

This project demonstrates:

- Full-stack JavaScript development with Express
- Session-based authentication
- CRUD operations with SQLite
- Clean separation between backend and frontend
- Containerized development workflow with Docker
- Optional AI integration for enhanced user experience
- Practical deployment readiness for modern platforms

## Possible Future Improvements

- Rich text editor for notes
- Tagging system for better organization
- Real-time collaboration features
- Production deployment pipeline with CI/CD

## License

MIT License
