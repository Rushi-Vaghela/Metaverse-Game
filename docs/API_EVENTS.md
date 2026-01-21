# API Events

## Client -> Server

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `join_room` | `roomId: string` | User requests to join a specific space. |
| `move` | `{ x: number, y: number, roomId: string }` | User sends updated coordinates. |
| `disconnect` | `void` | Standard socket disconnect. |

## Server -> Client

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `players_update` | `Player[]` | Array of all players in the room. Sent every 50ms. |
| `connect` | `void` | Connection established. |
