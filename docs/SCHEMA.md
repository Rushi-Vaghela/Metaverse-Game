# Database Schema

Visual representation of Prisma models.

## Models

### User
*   `id`: UUID
*   `username`: String (Unique)
*   `password`: String
*   `avatarId`: String?
*   `role`: Enum (Admin, User)

### Space
*   `id`: UUID
*   `name`: String (Unique)
*   `width`: Int
*   `height`: Int
*   `elements`: Relation to `Element[]`

### Element
*   `id`: UUID
*   `spaceId`: UUID (FK to Space)
*   `x`: Int
*   `y`: Int
*   `width`: Int
*   `height`: Int
*   `imageUrl`: String
*   `static`: Boolean

## Relations

*   **Space** (1) -> (Many) **Element**
