import { State, Action, Environment } from './Environment';

export class QAgent {
    // Q-Table: Map<StateKey, Map<Action, QValue>>
    private qTable: Map<string, Record<Action, number>> = new Map();

    // Hyperparameters
    public learningRate: number; // Alpha (how much to accept new knowledge vs old knowledge)
    public discountFactor: number; // Gamma (importance of future rewards)
    public epsilon: number; // Exploration rate (probability of taking a random action)

    private environment: Environment;

    public readonly allActions: Action[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

    constructor(
        environment: Environment,
        learningRate: number = 0.1,
        discountFactor: number = 0.9,
        epsilon: number = 1.0 // Start with 100% exploration
    ) {
        this.environment = environment;
        this.learningRate = learningRate;
        this.discountFactor = discountFactor;
        this.epsilon = epsilon;
    }

    /**
     * Ensure a state exists in the Q-table, initializing all actions to 0.
     */
    private initializeState(stateKey: string) {
        if (!this.qTable.has(stateKey)) {
            this.qTable.set(stateKey, {
                UP: 0,
                DOWN: 0,
                LEFT: 0,
                RIGHT: 0
            });
        }
    }

    /**
     * Choose an action using the Epsilon-Greedy strategy.
     */
    public chooseAction(state: State): Action {
        const stateKey = this.environment.serializeState(state);
        this.initializeState(stateKey);

        // Exploration
        if (Math.random() < this.epsilon) {
            const randomIndex = Math.floor(Math.random() * this.allActions.length);
            return this.allActions[randomIndex];
        }

        // Exploitation
        const actionValues = this.qTable.get(stateKey)!;
        let bestAction: Action = 'UP';
        let maxValue = -Infinity;

        for (const action of this.allActions) {
            if (actionValues[action] > maxValue) {
                maxValue = actionValues[action];
                bestAction = action;
            }
        }

        // Break ties randomly if multiple actions have the same max value (e.g., all 0 initially)
        const bestActions = this.allActions.filter(a => actionValues[a] === maxValue);
        return bestActions[Math.floor(Math.random() * bestActions.length)];
    }

    /**
     * Update the Q-Table using the Q-Learning formula (Bellman Equation).
     * Q(s,a) = Q(s,a) + alpha * (reward + gamma * max(Q(s',a')) - Q(s,a))
     */
    public learn(state: State, action: Action, reward: number, nextState: State) {
        const stateKey = this.environment.serializeState(state);
        const nextStateKey = this.environment.serializeState(nextState);

        this.initializeState(stateKey);
        this.initializeState(nextStateKey);

        const currentQ = this.qTable.get(stateKey)![action];

        const nextStateActionValues = this.qTable.get(nextStateKey)!;
        const maxNextQ = Math.max(...Object.values(nextStateActionValues));

        const updatedQ = currentQ + this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ);

        this.qTable.get(stateKey)![action] = updatedQ;
    }

    /**
     * Decay epsilon over time to shift from exploration to exploitation.
     */
    public decayEpsilon(minEpsilon: number = 0.01, decayRate: number = 0.995) {
        this.epsilon = Math.max(minEpsilon, this.epsilon * decayRate);
    }

    /**
     * Returns the full Q table (for debugging/visualization)
     */
    public getQTable() {
        return this.qTable;
    }

    /**
     * Reset the Q-table completely
     */
    public resetBrain() {
        this.qTable.clear();
        this.epsilon = 1.0;
    }
}
