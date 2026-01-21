# Metaverse Arena (2D)

A real-time 2D multiplayer metaverse where players can join a shared space, move around, and see others in real-time. Built with a Monorepo structure using Turborepo.

## Tech Stack

-   **Monorepo**: Turborepo
-   **Frontend**: React, Vite, TailwindCSS (Port 3000)
-   **Backend**: Node.js, Express, Socket.IO (Port 3002)
-   **Database**: PostgreSQL, Prisma ORM
-   **Authentication**: JWT, bcryptjs

## Prerequisites

Before running this project, ensure you have the following installed:

1.  **Node.js** (v18 or higher)
2.  **Docker Desktop** (for running PostgreSQL) or a local PostgreSQL instance.

## Setup Guide

Follow these steps to set up the project on a new machine.

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Metaverse-Game
```

### 2. Install Dependencies
Install all dependencies for the monorepo root and workspaces.
```bash
npm install
```

### 3. Database Setup (Docker)
Start the PostgreSQL database using Docker Compose.
```bash
docker-compose up -d
```
*Tip: Ensure port `5433` is free, or check `docker-compose.yml`.*

### 4. Configure Environment Variables
The project uses Prisma to connect to the database. Ensure the `DATABASE_URL` is set correctly.
Check `packages/db/.env`:
```env
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5433/metaverse"
```
*(Matches the credentials in `docker-compose.yml`)*

### 5. Push Database Schema
Sync the Prisma schema with your database to create the tables.
```bash
npx turbo run db:push
# OR manually
cd packages/db
npx prisma db push
npx prisma generate
```

## Running the Application

To start both the Frontend and Backend simultaneously:

```bash
npm run dev
```

-   **Frontend**: Open [http://localhost:3000](http://localhost:3000)
-   **Backend API**: Running at `http://localhost:3002`

## Project Structure

-   `apps/web`: React Frontend application.
    -   `src/components/Playground.tsx`: Main game canvas and socket logic.
    -   `src/App.tsx`: Authentication routing.
-   `apps/server`: Express + Socket.IO Backend.
    -   `src/index.ts`: Entry point, Auth endpoints, and Game Loop.
-   `packages/db`: Shared Database module (Prisma).

## How it Works

1.  **Auth**: Users Sign Up/In. A JWT token is issued and stored in `localStorage`.
2.  **Socket**: The Frontend connects to the Backend Socket.IO server, passing the JWT in the handshake for authentication.
3.  **State**: The server maintains a list of users in `rooms`.
4.  **Movement**: 
    -   User presses keys (WASD).
    -   `move` event sent to server.
    -   Server updates player coordinates.
    -   Server ticks every 50ms and broadcasts `players_update`.
    -   Frontend redraws the canvas.
