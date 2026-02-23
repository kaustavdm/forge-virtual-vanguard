# Twilio Forge: Virtual Vanguard

This repository contains follow-along steps and resources for the **"Twilio Forge: Virtual Vanguard"** workshop, the kickoff event for the *Agent Activated* series. Build a production-grade Voice AI agent for Signal City Transit using Twilio ConversationRelay and layer on observability with Conversational Intelligence.

## Main Resource: The Runbook

The [RUNBOOK.md](./RUNBOOK.md) provides a step-by-step guide to:

- Setting up Twilio ConversationRelay with a phone number webhook
- Handling real-time WebSocket messages between caller and server
- Integrating OpenAI GPT-5 mini with streaming and function calling
- Building a voice agent that answers route questions, takes lost item reports, and escalates to humans
- Adding Conversational Intelligence with pre-built and custom operators
- Receiving post-call analysis via webhook

**Read the [RUNBOOK.md](./RUNBOOK.md) for detailed instructions and workshop steps.**

> [!TIP]
> The workshop uses a scaffolded Fastify application. You'll implement the core logic in `build/routes/` and `build/services/`. If you get stuck, check the [`./final/`](./final/) directory for the complete implementation.

## Workshop Structure

This repository is structured for hands-on learning:

- **[`./build/`](./build/) directory**: Scaffolded files with TODOs where you'll implement the voice agent logic
- **[`./final/`](./final/) directory**: Complete working implementation for reference
- **[`./assets/`](./assets/) directory**: Shared data files (Signal City Transit routes and schedules)

> [!TIP]
> This project uses npm workspaces for easier dependency management. Running `npm install` in the root directory will automatically install dependencies for both the `build/` and `final/` directories.

## Key Files

- [`build/routes/twiml.js`](./build/routes/twiml.js) - Return ConversationRelay TwiML
- [`build/routes/websocket.js`](./build/routes/websocket.js) - Handle WebSocket messages from ConversationRelay
- [`build/services/llm.js`](./build/services/llm.js) - OpenAI integration with streaming and tool calling
- [`build/routes/intelligence.js`](./build/routes/intelligence.js) - Conversational Intelligence webhook handler
- [`build/server.js`](./build/server.js) - Pre-configured Fastify server (no edits needed)
- [`build/services/transit-data.js`](./build/services/transit-data.js) - Transit data query helpers (no edits needed)

---

Peace.
