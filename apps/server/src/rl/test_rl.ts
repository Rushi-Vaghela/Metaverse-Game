import { Environment, State } from './Environment';
import { QAgent } from './QAgent';

const env = new Environment(800, 600, 50); // 16x12 grid
const agent = new QAgent(env, 0.1, 0.9, 1.0); // 100% exploration start

const MAX_EPISODES = 500;
const MAX_STEPS = 500; // max steps per episode

const startState: State = { col: 0, row: 0 };
const targetState: State = { col: 15, row: 11 }; // Bottom right corner

console.log("Starting Headless RL Training...");

for (let episode = 1; episode <= MAX_EPISODES; episode++) {
    let currentState = { ...startState };
    let totalReward = 0;
    let steps = 0;

    while (steps < MAX_STEPS) {
        // Choose action based on current policy (epsilon-greedy)
        // Need to modify chooseAction to take state not stateKey if I didn't change it. Wait, the QAgent takes `chooseAction(state: State)`.
        const action = agent.chooseAction(currentState);

        // Take step
        const { nextState, reward, done } = env.step(currentState, action, targetState);

        // Learn (Update Q-table)
        // But first, we need a slight adjustment: chooseAction expects to return the action, but here we need to make sure we don't accidentally mutate the state.

        // Let's implement learn
        agent.learn(currentState, action, reward, nextState);

        currentState = nextState;
        totalReward += reward;
        steps++;

        if (done) {
            break;
        }
    }

    // Decay exploration rate after every episode
    agent.decayEpsilon(0.01, 0.99);

    if (episode % 100 === 0) {
        console.log(`Episode ${episode} | Steps: ${steps} | Total Reward: ${totalReward} | Epsilon: ${agent.epsilon.toFixed(3)}`);
    }
}

console.log("Training complete!");
console.log(`Checking exploit-only run (Epsilon = 0)...`);
agent.epsilon = 0;

let testState = { ...startState };
let testSteps = 0;
let testReward = 0;

while (testSteps < MAX_STEPS) {
    const action = agent.chooseAction(testState);
    const { nextState, reward, done } = env.step(testState, action, targetState);

    console.log(`Step ${testSteps + 1}: State(${testState.col},${testState.row}) --[${action}]--> State(${nextState.col},${nextState.row})`);

    testState = nextState;
    testReward += reward;
    testSteps++;

    if (done) {
        console.log(`Target reached in ${testSteps} steps! Total Reward: ${testReward}`);
        break;
    }
}

if (testSteps === MAX_STEPS) {
    console.log("Failed to reach target in exploit run.");
}
