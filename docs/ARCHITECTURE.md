# Architecture

## WebSocket Flow

1.  **Connection**: Client connects to `ws://localhost:3001`.
2.  **Join**: Client emits `join_room` with `roomId`.
    *   Server adds socket to room.
    *   Server initializes player state in memory.
3.  **Game Loop**:
    *   Server runs `setInterval` every 50ms.
    *   Server gathers all players in a room.
    *   Server broadcasts `players_update` event to that room.
4.  **Movement**:
    *   Client listens for keyboard events (WASD).
    *   Client emits `move` event with new `{x, y}`.
    *   Server updates in-memory state.
    *   Next tick broadcasts the new position.

## Components

*   **Frontend**: React + Canvas. Renders based on `players` array from server.
*   **Backend**: Node.js + Socket.io. Authoritative state (currently trust-client for coords, but validated in future).
*   **Database**: Postgres. Persists World state (Rooms, Elements) and User profiles.
