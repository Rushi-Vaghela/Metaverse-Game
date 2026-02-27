export type Action = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface State {
    col: number; // 0 to 15 (800 / 50)
    row: number; // 0 to 11 (600 / 50)
}

export class Environment {
    public readonly width: number;
    public readonly height: number;
    public readonly tileSize: number;

    public readonly cols: number;
    public readonly rows: number;

    constructor(width: number = 800, height: number = 600, tileSize: number = 50) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;

        this.cols = Math.floor(width / tileSize);
        this.rows = Math.floor(height / tileSize);
    }

    /**
     * Given a continuous (x, y) coordinate, return the discrete (col, row) state.
     */
    public getStateFromCoordinates(x: number, y: number): State {
        // Clamp to edges to prevent out of bounds
        const safeX = Math.max(0, Math.min(x, this.width - 1));
        const safeY = Math.max(0, Math.min(y, this.height - 1));

        return {
            col: Math.floor(safeX / this.tileSize),
            row: Math.floor(safeY / this.tileSize)
        };
    }

    /**
     * Given a state, return the center (x, y) coordinate of that tile.
     * Useful for broadcasting the bot's position to the frontend.
     */
    public getCoordinatesFromState(state: State): { x: number, y: number } {
        return {
            x: (state.col * this.tileSize) + (this.tileSize / 2),
            y: (state.row * this.tileSize) + (this.tileSize / 2)
        };
    }

    /**
     * Simulates taking an action from a given state.
     * Returns the next state, the reward, and whether the episode is done (reached target).
     */
    public step(state: State, action: Action, targetState: State): { nextState: State, reward: number, done: boolean } {
        let nextState = { ...state };

        switch (action) {
            case 'UP':
                nextState.row -= 1;
                break;
            case 'DOWN':
                nextState.row += 1;
                break;
            case 'LEFT':
                nextState.col -= 1;
                break;
            case 'RIGHT':
                nextState.col += 1;
                break;
        }

        // Check Wall Collisions (Out of bounds)
        let hitWall = false;
        if (nextState.col < 0 || nextState.col >= this.cols || nextState.row < 0 || nextState.row >= this.rows) {
            hitWall = true;
            nextState = state; // Bounce back to original state
        }

        const isTarget = nextState.col === targetState.col && nextState.row === targetState.row;

        // Reward Function
        let reward = -1; // Small penalty for each step to encourage shortest path
        if (hitWall) {
            reward = -10; // Large penalty for hitting walls
        } else if (isTarget) {
            reward = 100; // Massive reward for reaching target
        }

        return {
            nextState,
            reward,
            done: isTarget
        };
    }

    /**
     * Serializes state to a string key for Q-Table lookup
     */
    public serializeState(state: State): string {
        return `${state.col},${state.row}`;
    }
}
