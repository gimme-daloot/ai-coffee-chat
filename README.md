# ☕ AI Coffeehouse - Multi-Agent Chat Interface

A BYOK (Bring Your Own Key) AI web chat interface that lets multiple AI agents converse with each other and with you. Now supports local LLMs via Ollama!

## 🎯 Features

- **Multi-Agent Conversations**: Watch AI agents chat with each other
- **Selective Messaging ("Whispers")**: Send private messages to specific agents
- **Multiple Providers**: OpenAI, Anthropic, Google, xAI, and **Ollama (Local)**
- **Custom Endpoints**: Use any OpenAI-compatible API endpoint
- **Zero Backend**: Runs entirely in your browser
- **Privacy-First**: Your API keys never leave your browser

## Project info

**URL**: https://lovable.dev/projects/428ab7dc-e16b-4b7b-88ce-eccbc5f874f7

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/428ab7dc-e16b-4b7b-88ce-eccbc5f874f7) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## 🚀 Getting Started with Ollama (Free Local Testing)

Want to test without using API credits? Use Ollama!

### 1. Install Ollama
```sh
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Or visit https://ollama.com/download
```

### 2. Start Ollama and Pull a Model
```sh
# Start Ollama server
ollama serve

# In a new terminal, pull a model
ollama pull llama3.2

# See all available models
ollama list
```

### 3. Configure Your Agent
1. Open the Settings (⚙️ icon)
2. Select an agent
3. Set:
   - **Provider**: Ollama (Local)
   - **Model**: llama3.2 (or any model you pulled)
   - **Custom Base URL**: http://localhost:11434 (default)
   - **API Key**: Leave empty (not needed for local)

### 4. Start Chatting!
Try sending messages to "Everyone" to watch agents converse, or whisper to specific agents for private conversations.

## 💡 Use Cases

### Scenario 1: Free Multi-Agent Testing
- Set both agents to use Ollama
- Test conversation flows without any API costs
- Perfect for development and experimentation

### Scenario 2: Hybrid Local + Cloud
- Agent 1: Ollama (free, local, fast for testing)
- Agent 2: OpenAI/Anthropic (paid, cloud, higher quality)
- Only pay for one agent while testing interactions

### Scenario 3: Custom Endpoints
- Use LM Studio, LocalAI, or Together.ai
- Set custom base URL to your preferred endpoint
- Works with any OpenAI-compatible API

## 🎨 Supported Providers

| Provider | Type | Requires API Key | Example Models |
|----------|------|------------------|----------------|
| **Ollama** | Local | ❌ No | llama3.2, mistral, phi3 |
| OpenAI | Cloud | ✅ Yes | gpt-4o, gpt-4o-mini |
| Anthropic | Cloud | ✅ Yes | claude-3-5-sonnet |
| Google | Cloud | ✅ Yes | gemini-2.0-flash |
| xAI | Cloud | ✅ Yes | grok-beta |

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/428ab7dc-e16b-4b7b-88ce-eccbc5f874f7) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
