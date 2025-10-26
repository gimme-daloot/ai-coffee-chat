import { Message } from '@/types/agent';

export type ConversationMode = 'group' | string; // 'group' or agentId for private

export interface ConversationState {
  messages: Message[];
  mode: ConversationMode;
}

/**
 * Manages isolated conversation states for different AI entities
 * Ensures that private conversations remain separate and group conversations are shared
 */
export class ConversationStateManager {
  private conversationStates: Map<ConversationMode, Message[]>;
  private currentMode: ConversationMode;

  constructor() {
    this.conversationStates = new Map();
    this.conversationStates.set('group', []);
    this.currentMode = 'group';
  }

  /**
   * Switch to a different conversation mode
   * @param mode - 'group' for group chat or agentId for private chat
   */
  switchMode(mode: ConversationMode): void {
    if (!this.conversationStates.has(mode)) {
      // Initialize new conversation
      this.conversationStates.set(mode, []);
    }
    this.currentMode = mode;
  }

  /**
   * Get the current conversation mode
   */
  getCurrentMode(): ConversationMode {
    return this.currentMode;
  }

  /**
   * Get messages for the current conversation context
   */
  getCurrentMessages(): Message[] {
    return this.conversationStates.get(this.currentMode) || [];
  }

  /**
   * Get messages for a specific conversation mode
   */
  getMessages(mode: ConversationMode): Message[] {
    return this.conversationStates.get(mode) || [];
  }

  /**
   * Add a message to the current conversation
   */
  addMessage(message: Message): void {
    const messages = this.conversationStates.get(this.currentMode) || [];
    messages.push(message);
    this.conversationStates.set(this.currentMode, messages);
  }

  /**
   * Add a message to a specific conversation mode
   */
  addMessageToMode(mode: ConversationMode, message: Message): void {
    const messages = this.conversationStates.get(mode) || [];
    messages.push(message);
    this.conversationStates.set(mode, messages);
  }

  /**
   * Get messages relevant to a specific agent
   * ALWAYS returns BOTH private messages with this agent AND all group messages (merged and sorted)
   * This enables bidirectional memory: private ↔ group
   */
  getMessagesForAgent(agentId: string): Message[] {
    // Agent always has access to both their private history AND group history
    // This allows information to flow bidirectionally:
    // - Private → Group: agent can bring private info into group chat
    // - Group → Private: agent remembers what was discussed in group chat
    const privateMessages = this.getMessages(agentId);
    const groupMessages = this.getMessages('group');

    // Merge and sort by timestamp to maintain chronological order
    const allMessages = [...privateMessages, ...groupMessages];
    allMessages.sort((a, b) => a.timestamp - b.timestamp);

    console.log(`[ConversationManager] Messages for ${agentId}:`, {
      currentMode: this.currentMode,
      privateCount: privateMessages.length,
      groupCount: groupMessages.length,
      totalCount: allMessages.length,
      messages: allMessages.map(m => ({
        sender: m.sender,
        recipient: m.recipient,
        content: m.content.substring(0, 50) + '...',
      })),
    });

    return allMessages;
  }

  /**
   * Clear all conversation states
   */
  clearAll(): void {
    this.conversationStates.clear();
    this.conversationStates.set('group', []);
    this.currentMode = 'group';
  }

  /**
   * Clear a specific conversation
   */
  clearConversation(mode: ConversationMode): void {
    this.conversationStates.set(mode, []);
  }

  /**
   * Export all conversation states for persistence
   */
  exportStates(): { [key: string]: Message[] } {
    const states: { [key: string]: Message[] } = {};
    this.conversationStates.forEach((messages, mode) => {
      states[mode] = messages;
    });
    return states;
  }

  /**
   * Import conversation states from persistence
   */
  importStates(states: { [key: string]: Message[] }, currentMode?: ConversationMode): void {
    this.conversationStates.clear();
    Object.entries(states).forEach(([mode, messages]) => {
      this.conversationStates.set(mode, messages);
    });
    
    if (currentMode && this.conversationStates.has(currentMode)) {
      this.currentMode = currentMode;
    } else {
      this.currentMode = 'group';
    }
  }

  /**
   * Get all available conversation modes
   */
  getAvailableModes(): ConversationMode[] {
    return Array.from(this.conversationStates.keys());
  }
}
