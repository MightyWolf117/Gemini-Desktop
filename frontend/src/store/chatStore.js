import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useChatStore = create(
  persist(
    (set) => ({
      chats: [
        {
          id: '1',
          title: 'Bienvenida',
          messages: [
            { id: 1, sender: 'ai', text: '¡Hola! Soy tu asistente de IA. ¿En qué te puedo ayudar hoy?', timestamp: Date.now() }
          ],
          personalityId: null,
          updatedAt: Date.now()
        }
      ],
      activeChatId: '1',

      setActiveChat: (id) => set({ activeChatId: id }),

      addMessage: (chatId, message) => set((state) => {
        const updatedChats = state.chats.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, { ...message, id: Date.now(), timestamp: Date.now() }],
              updatedAt: Date.now()
            };
          }
          return chat;
        });
        return { chats: updatedChats };
      }),

      createNewChat: () => set((state) => {
        const newChat = {
          id: Date.now().toString(),
          title: 'Nuevo Chat',
          messages: [],
          personalityId: null,
          updatedAt: Date.now()
        };
        return {
          chats: [newChat, ...state.chats],
          activeChatId: newChat.id
        };
      }),

      updateChatPersonality: (chatId, personalityId) => set((state) => {
        const updatedChats = state.chats.map((chat) => {
          if (chat.id === chatId) {
            return { ...chat, personalityId, updatedAt: Date.now() };
          }
          return chat;
        });
        return { chats: updatedChats };
      }),

      deleteChat: (id) => set((state) => {
        const filteredChats = state.chats.filter(chat => chat.id !== id);
        return {
          chats: filteredChats,
          activeChatId: state.activeChatId === id ? (filteredChats[0]?.id || null) : state.activeChatId
        };
      })
    }),
    {
      name: 'ia-chat-storage',
    }
  )
);

export default useChatStore;
