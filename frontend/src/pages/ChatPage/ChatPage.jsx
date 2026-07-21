import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ChevronDown, Download } from 'lucide-react';
import useChatStore from '../../store/chatStore';
import useSettingsStore from '../../store/settingsStore';
import { ENDPOINTS } from '../../service/api';
import Modal from '../../components/common/Modal/Modal';
import styles from './ChatPage.module.scss';
import { convertFileSrc, invoke } from '@tauri-apps/api/tauri';

const CodeBlock = ({ language, code, onDownload }) => {
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { enableWsl } = useSettingsStore();

  const handleExecute = async () => {
    if (!isTauri) return;
    setIsExecuting(true);
    setErrorMsg('');
    setOutput('Ejecutando en WSL...');
    
    try {
      const res = await invoke('execute_wsl_code', { code, lang: language });
      setOutput(res);
    } catch (e) {
      setErrorMsg(e);
      setOutput('');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleOpenCmd = async () => {
    if (!isTauri) return;
    try {
      await invoke('open_wsl_cmd', { code, lang: language });
    } catch (e) {
      alert("Error al abrir CMD: " + e);
    }
  };

  const isExecutable = ['python', 'py', 'javascript', 'js', 'node', 'bash', 'sh', 'shell'].includes(language.toLowerCase());

  // Limite de 50 lineas
  const lines = output.split('\n');
  const isTruncated = lines.length > 50;
  const displayOutput = isTruncated ? lines.slice(0, 50).join('\n') : output;

  return (
    <div className={styles.codeBlockContainer}>
      <div className={styles.codeBlockHeader}>
        <span>{language}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isTauri && enableWsl && isExecutable && (
            <>
              <button className={styles.codeBlockDownloadBtn} onClick={handleExecute} disabled={isExecuting}>
                {isExecuting ? '⏳ Ejecutando...' : '▶ Ejecutar'}
              </button>
              <button className={styles.codeBlockDownloadBtn} onClick={handleOpenCmd}>
                💻 CMD
              </button>
            </>
          )}
          <button className={styles.codeBlockDownloadBtn} onClick={() => onDownload(code, language)}>
            <Download size={14} /> Descargar
          </button>
        </div>
      </div>
      <pre className={styles.codeBlockPre}>
        <code>{code}</code>
      </pre>
      
      {(output || errorMsg) && (
        <div style={{ background: '#0d0d0d', borderTop: '1px solid #333', padding: '12px', fontSize: '13px', color: '#10b981', fontFamily: 'Consolas, monospace', maxHeight: '400px', overflowY: 'auto', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
          {errorMsg ? <div style={{ color: '#ef4444', marginBottom: '8px' }}>❌ {errorMsg}</div> : null}
          {displayOutput && <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{displayOutput}</pre>}
          {isTruncated && (
            <div style={{ color: '#9ca3af', marginTop: '12px', borderTop: '1px dashed #4b5563', paddingTop: '8px', fontSize: '12px' }}>
              ⚠️ Salida muy larga truncada a 50 líneas. Para ver la ejecución completa, utiliza el botón "CMD" o descarga el script.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const isTauri = typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;

const ChatPage = () => {
  const { chats, activeChatId, addMessage, setMessages, updateChatPersonality, updateChatTitle } = useChatStore();
  const { userIconPath, userIconPosX, userIconPosY, aiIconPath, aiIconPosX, aiIconPosY, aiModel, temperature, googleApiKey } = useSettingsStore();
  const [inputValue, setInputValue] = useState('');
  const [personalities, setPersonalities] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [exportedPath, setExportedPath] = useState('');

  const activeChat = chats.find(c => c.id === activeChatId);
  const messages = activeChat?.messages || [];
  const selectedPersonalityId = activeChat?.personalityId || '';
  
  const agentName = selectedPersonalityId 
    ? (personalities.find(p => p.id === parseInt(selectedPersonalityId))?.nombre || 'Agente IA')
    : 'Agente IA';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadMessages = async () => {
      if (activeChatId && isTauri) {
        try {
          const loaded = await invoke('get_chat_messages', { chatCode: parseInt(activeChatId) });
          if (loaded && loaded.length > 0) {
            setMessages(activeChatId, loaded);
          }
        } catch (e) {
          console.error("Error loading local messages:", e);
        }
      }
    };
    loadMessages();
  }, [activeChatId, setMessages]);

  useEffect(() => {
    const fetchPersonalities = async () => {
      try {
        if (isTauri) {
          const data = await invoke('get_personalities');
          const processedData = await Promise.all(data.map(async (p) => {
            if (p.image) {
              try {
                const fullPath = await invoke('get_personality_image_path', { filename: p.image });
                return { ...p, localImageUrl: convertFileSrc(fullPath) };
              } catch (e) {
                return p;
              }
            }
            return p;
          }));
          setPersonalities(processedData || []);
        }
      } catch (e) {
        console.error("Error fetching personalities:", e);
      }
    };
    fetchPersonalities();
  }, []);

  const handleDownloadCode = async (code, language) => {
    if (!isTauri) return;
    
    const extensionMap = {
      python: 'py',
      javascript: 'js',
      typescript: 'ts',
      rust: 'rs',
      ruby: 'rb',
      csharp: 'cs',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      java: 'java',
      html: 'html',
      css: 'css',
      json: 'json',
      markdown: 'md',
      shell: 'sh',
      bash: 'sh',
      yaml: 'yml',
      sql: 'sql'
    };
    
    const langKey = language?.toLowerCase().trim() || 'txt';
    const ext = extensionMap[langKey] || langKey;
    const filename = `codigo_${Date.now()}.${ext}`;
    
    try {
      const parentDir = await invoke('export_text_file', { filename, content: code });
      setExportedPath(parentDir);
      setSuccessModalOpen(true);
    } catch (e) {
      console.error("Error exporting code:", e);
    }
  };

  const handleExportChat = async (format) => {
    setExportModalOpen(false);
    if (!isTauri || !activeChat) return;

    let content = '';
    const filename = `conversacion_${activeChatId}_${Date.now()}.${format}`;

    if (format === 'json') {
      content = JSON.stringify(messages, null, 2);
    } else {
      content = `# ${activeChat.title || 'Conversación'}\n\n`;
      messages.forEach(m => {
        content += `**${m.sender === 'user' ? 'Tú' : agentName}**:\n${m.text}\n\n---\n\n`;
      });
    }

    try {
      const parentDir = await invoke('export_text_file', { filename, content });
      setExportedPath(parentDir);
      setSuccessModalOpen(true);
    } catch (e) {
      console.error("Error exporting chat:", e);
    }
  };

  const parseMessageText = (text) => {
    if (!text) return null;
    const blocks = text.split(/(```[\w-]*\n[\s\S]*?```)/g);
    return blocks.map((block, index) => {
      if (block.startsWith('```')) {
        const lines = block.split('\n');
        const firstLine = lines[0].replace('```', '').trim();
        const lang = firstLine || 'txt';
        const code = lines.slice(1, -1).join('\n');
        return <CodeBlock key={index} language={lang} code={code} onDownload={handleDownloadCode} />;
      }
      return <span key={index}>{block}</span>;
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeChatId || isSending) return;

    const userText = inputValue;
    setInputValue('');
    setIsSending(true);

    const userMessage = { sender: 'user', text: userText };
    addMessage(activeChatId, userMessage);

    if (isTauri) {
      try {
        await invoke('save_chat_message', {
          chatCode: parseInt(activeChatId),
          messageOrder: messages.length + 1,
          message: { id: Date.now(), timestamp: Date.now(), ...userMessage }
        });
      } catch (e) {
        console.error("Error saving user message locally:", e);
      }
    }

    // Construir historial para la API
    const apiMessages = [...messages, userMessage].map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      content: msg.text
    }));

    const selectedPersonalityIdStr = selectedPersonalityId ? selectedPersonalityId.toString() : '';
    const selectedPersonality = personalities.find(p => p.id.toString() === selectedPersonalityIdStr);
    const personalityPrompt = selectedPersonality ? selectedPersonality.instrucciones : '';

    const payload = {
      messages: apiMessages,
      personality_prompt: personalityPrompt,
      generate_title: !activeChat.titleGenerated,
      chat_code: parseInt(activeChatId),
      model: aiModel,
      temperature: parseFloat(temperature)
    };

    try {
      const response = await fetch(ENDPOINTS.CHAT, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Google-API-Key': googleApiKey || ''
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage = { sender: 'ai', text: data.response };
        addMessage(activeChatId, aiMessage);
        
        if (isTauri) {
          try {
            await invoke('save_chat_message', {
              chatCode: parseInt(activeChatId),
              messageOrder: messages.length + 2,
              message: { id: Date.now(), timestamp: Date.now(), ...aiMessage }
            });
          } catch (e) {
            console.error("Error saving AI message locally:", e);
          }
        }
        
        if (data.title && isTauri && !activeChat.titleGenerated) {
          try {
            const savedHist = await invoke('save_historial', {
              historial: {
                id: activeChat.dbId || 0,
                created_at: "", 
                nombre: data.title,
                code: parseInt(activeChatId)
              }
            });
            updateChatTitle(activeChatId, data.title, savedHist.id);
          } catch (e) {
            console.error("Error saving historial locally", e);
            updateChatTitle(activeChatId, data.title, null);
          }
        } else if (data.title && !activeChat.titleGenerated) {
            updateChatTitle(activeChatId, data.title, null);
        }
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
    let path = isUser ? userIconPath : aiIconPath;
    let isPersonalityImage = false;

    if (!isUser && selectedPersonalityId) {
      const personality = personalities.find(p => p.id === parseInt(selectedPersonalityId));
      if (personality && personality.localImageUrl) {
        path = personality.localImageUrl;
        isPersonalityImage = true;
      }
    }

    const posX = isUser ? userIconPosX : aiIconPosX;
    const posY = isUser ? userIconPosY : aiIconPosY;
    const DefaultIcon = isUser ? User : Bot;

    if (path) {
      // Si es imagen de personalidad, ya viene resuelta con convertFileSrc en fetchPersonalities
      const imgUrl = (isTauri && !path.startsWith('data:') && !isPersonalityImage) ? convertFileSrc(path) : path;
      return (
        <div 
          className={styles.avatarImg} 
          style={{ 
            backgroundImage: `url(${imgUrl})`,
            backgroundPosition: isPersonalityImage ? 'center' : `${posX}% ${posY}%`
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
        <h2>Bienvenido a Orbit</h2>
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
                  {msg.sender === 'user' ? 'Tú' : agentName}
                </div>
                <div className={styles.text}>{parseMessageText(msg.text)}</div>
              </div>
            </div>
          ))
        )}
        {isSending && (
          <div className={`${styles.messageWrapper} ${styles.ai}`}>
            <div className={styles.avatar}>
              {renderAvatar('ai')}
            </div>
            <div className={styles.messageContent}>
              <div className={styles.senderName}>{agentName}</div>
              <div className={styles.text}>
                 <div className={styles.typingIndicator}>
                   <span className={styles.typingDot}></span>
                   <span className={styles.typingDot}></span>
                   <span className={styles.typingDot}></span>
                 </div>
              </div>
            </div>
          </div>
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
          <button className={styles.exportBtn} onClick={() => setExportModalOpen(true)} title="Exportar Conversación">
            <Download size={14} /> Descargar Chat
          </button>
        </div>
        <form className={styles.inputForm} onSubmit={handleSend}>
          <input
            type="text"
            className={styles.input}
            placeholder={!googleApiKey ? "Configura tu API Key de Google en Ajustes..." : "Escribe tu mensaje..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={!googleApiKey}
          />
          <button 
            type="submit" 
            className={styles.sendButton}
            disabled={!inputValue.trim() || !activeChatId || isSending || !googleApiKey}
          >
            <Send size={20} />
          </button>
        </form>
        <div className={styles.disclaimer}>
          El agente de IA puede cometer errores. Considera verificar la información importante.
        </div>
      </div>

      <Modal 
        isOpen={exportModalOpen} 
        onClose={() => setExportModalOpen(false)}
        title="Exportar Conversación"
      >
        <p style={{ marginBottom: '15px' }}>¿En qué formato deseas descargar la conversación actual?</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #444', background: 'transparent', color: '#fff', cursor: 'pointer' }}
            onClick={() => handleExportChat('md')}
          >
            Markdown (.md)
          </button>
          <button 
            style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}
            onClick={() => handleExportChat('json')}
          >
            JSON (.json)
          </button>
        </div>
      </Modal>

      <Modal 
        isOpen={successModalOpen} 
        onClose={() => setSuccessModalOpen(false)}
        title="Archivo Exportado"
        actions={
          <button 
            style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}
            onClick={async () => {
              setSuccessModalOpen(false);
              try {
                await invoke('open_folder', { path: exportedPath });
              } catch (e) {
                console.error("Error abriendo carpeta:", e);
              }
            }}
          >
            Ir a carpeta
          </button>
        }
      >
        <p>El archivo se ha guardado correctamente en tu carpeta de descargas de la aplicación.</p>
      </Modal>
    </div>
  );
};

export default ChatPage;
