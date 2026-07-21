import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ChevronDown } from 'lucide-react';
import useChatStore from '../../store/chatStore';
import useSettingsStore from '../../store/settingsStore';
import { ENDPOINTS } from '../../service/api';
import styles from './ChatPage.module.scss';
import { convertFileSrc } from '@tauri-apps/api/tauri';

const isTauri = typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;

const ChatPage = () => {
  const { chats, activeChatId, addMessage, updateChatPersonality } = useChatStore();
  const { userIconPath, userIconPosX, userIconPosY, aiIconPath, aiIconPosX, aiIconPosY } = useSettingsStore();
  const [inputValue, setInputValue] = useState('');
  const [personalities, setPersonalities] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const activeChat = chats.find(c => c.id === activeChatId);
  const messages = activeChat?.messages || [];
  const selectedPersonalityId = activeChat?.personalityId || '';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchPersonalities = async () => {
      try {
        const response = await fetch(ENDPOINTS.PERSONALITIES);
        if (response.ok) {
          const data = await response.json();
          setPersonalities(data || []);
        }
      } catch (e) {
        console.error("Error fetching personalities:", e);
      }
    };
    fetchPersonalities();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeChatId || isSending) return;

    const userText = inputValue;
    setInputValue('');
    setIsSending(true);

    addMessage(activeChatId, { sender: 'user', text: userText });

    // Construir historial para la API
    // (Incluye el mensaje recién añadido pero usamos la data mapeada directamente)
    const apiMessages = [...messages, { sender: 'user', text: userText }].map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      content: msg.text
    }));

    const payload = {
      messages: apiMessages,
      personality_id: selectedPersonalityId ? parseInt(selectedPersonalityId) : null
    };

    try {
      const response = await fetch(ENDPOINTS.CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        addMessage(activeChatId, {
          sender: 'ai',
          text: data.response
        });
      } else {
        const errData = await response.json();
        addMessage(activeChatId, {
          sender: 'ai',
          text: `**Error:** No se pudo procesar la solicitud. (${errData.error || response.statusText})`
        });
      }
    } catch (e) {
      addMessage(activeChatId, {
        sender: 'ai',
        text: `**Error:** Problema de conexión (${e.message})`
      });
    } finally {
      setIsSending(false);
    }
  };

  const renderAvatar = (sender) => {
    const isUser = sender === 'user';
    const path = isUser ? userIconPath : aiIconPath;
    const posX = isUser ? userIconPosX : aiIconPosX;
    const posY = isUser ? userIconPosY : aiIconPosY;
    const DefaultIcon = isUser ? User : Bot;

    if (path) {
      const imgUrl = isTauri && !path.startsWith('data:') ? convertFileSrc(path) : path;
      return (
        <div 
          className={styles.avatarImg} 
          style={{ 
            backgroundImage: `url(${imgUrl})`,
            backgroundPosition: `${posX}% ${posY}%`
          }} 
        />
      );
    }
    return <DefaultIcon size={20} />;
  };

  if (!activeChat) {
    return (
      <div className={styles.emptyState}>
        {renderAvatar('ai')}
        <h2>Bienvenido a Gemini UI</h2>
        <p>Selecciona un chat del historial o crea uno nuevo para empezar.</p>
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messagesArea}>
        {messages.length === 0 ? (
          <div className={styles.noMessages}>
            <Bot size={40} className={styles.icon} />
            <p>Comienza una conversación</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`${styles.messageWrapper} ${msg.sender === 'user' ? styles.user : styles.ai}`}
            >
              <div className={styles.avatar}>
                {renderAvatar(msg.sender)}
              </div>
              <div className={styles.messageContent}>
                <div className={styles.senderName}>
                  {msg.sender === 'user' ? 'Tú' : 'Agente IA'}
                </div>
                <div className={styles.text}>{msg.text}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <div className={styles.inputHeader}>
          <div className={styles.personalitySelector}>
            <Bot size={14} className={styles.selectorIcon} />
            <select 
              value={selectedPersonalityId} 
              onChange={(e) => updateChatPersonality(activeChatId, e.target.value)}
              className={styles.selectNative}
            >
              <option value="">Personalidad por defecto</option>
              {personalities.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <ChevronDown size={14} className={styles.chevron} />
          </div>
        </div>
        <form className={styles.inputForm} onSubmit={handleSend}>
          <input
            type="text"
            className={styles.input}
            placeholder="Escribe un mensaje al agente..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button 
            type="submit" 
            className={styles.sendButton}
            disabled={!inputValue.trim() || isSending}
          >
            <Send size={20} />
          </button>
        </form>
        <div className={styles.disclaimer}>
          El agente de IA puede cometer errores. Considera verificar la información importante.
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
