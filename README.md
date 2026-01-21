# Metaverse Arena (2D)

A real-time 2D multiplayer metaverse where players can join shared spaces, move around, and chat in real-time. Built with a Monorepo structure using Turborepo.

## Tech Stack

-   **Monorepo**: Turborepo
-   **Frontend**: React, Vite, TailwindCSS (Port 3000)
-   **Backend**: Node.js, Express, Socket.IO (Port 3002)
-   **Database**: PostgreSQL, Prisma ORM
-   **Authentication**: JWT, bcryptjs

## Key Features

1.  **Authentication**: Secure Sign Up/Sign In with JWT.
2.  **Spaces**: 
    -   Admins can create multiple independent spaces (rooms).
    -   Users can select a space to join.
    -   Players in different spaces are completely isolated.
3.  **Real-Time Movement**: Multiplayer movement synchronization.
4.  **In-Game Chat**: 
    -   Real-time messaging side-panel.
    -   Chat is scoped to the current space.
    -   Movement keys (WASD) are disabled while typing.

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
    -   `src/components/Playground.tsx`: Main game canvas, chat UI, and socket logic.
    -   `src/components/SpaceSelector.tsx`: Dashboard for selecting/creating spaces.
    -   `src/App.tsx`: Authentication and Routing logic.
-   `apps/server`: Express + Socket.IO Backend.
    -   `src/index.ts`: Entry point, Auth endpoints (`/signup`, `/signin`), Spaces API (`/spaces`), and Socket.IO Events (`move`, `chat_message`).
-   `packages/db`: Shared Database module (Prisma).

## How it Works

1.  **Auth**: User logs in -> JWT issued -> Stored in LocalStorage.
2.  **Selection**: User selects a **Space** from the dashboard.
3.  **Connection**: Frontend connects to Socket.IO, sending the JWT and SpaceID.
4.  **Interaction**:
    -   **Move**: WASD keys send `move` events. Server broadcasts updates @ 20Hz.
    -   **Chat**: Messages sent via `chat_message` event. Server broadcasts to room.
