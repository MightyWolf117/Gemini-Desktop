import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, Settings, MessageSquare, Trash2, Users } from 'lucide-react';
import { useEffect } from 'react';
import useChatStore from '../../store/chatStore';
import useSettingsStore from '../../store/settingsStore';
import styles from './Sidebar.module.scss';

const Sidebar = () => {
  const { chats, activeChatId, setActiveChat, createNewChat, deleteChat } = useChatStore();
  const { isOnline, checkHealth } = useSettingsStore();
  const location = useLocation();

  const handleNewChat = () => {
    createNewChat();
  };

  // Polling para el Health Check cada 30 segundos
  useEffect(() => {
    checkHealth(); // Ejecutar inmediatamente
    const interval = setInterval(() => {
      checkHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>Gemini UI</h2>
        <Link to="/" className={styles.newChatBtn} onClick={handleNewChat}>
          <PlusCircle size={20} />
          <span>Nuevo Chat</span>
        </Link>
      </div>

      <div className={styles.chatList}>
        <div className={styles.listTitle}>Historial</div>
        {chats.map((chat) => (
          <div 
            key={chat.id} 
            className={`${styles.chatItem} ${activeChatId === chat.id && location.pathname === '/' ? styles.active : ''}`}
            onClick={() => setActiveChat(chat.id)}
          >
            <Link to="/" className={styles.chatLink}>
              <MessageSquare size={18} />
              <span className={styles.chatTitle}>{chat.title || 'Chat sin título'}</span>
            </Link>
            <button 
              className={styles.deleteBtn} 
              onClick={(e) => {
                e.stopPropagation();
                deleteChat(chat.id);
              }}
              title="Eliminar chat"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {chats.length === 0 && (
          <div className={styles.emptyState}>No hay chats recientes</div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.healthIndicator} title={isOnline ? "Backend Conectado" : "Backend Desconectado"}>
          <div className={`${styles.dot} ${isOnline ? styles.online : styles.offline}`}></div>
          <span>{isOnline ? 'Servicio en línea' : 'Servicio offline'}</span>
        </div>
        
        <Link 
          to="/personalities" 
          className={`${styles.footerBtn} ${location.pathname === '/personalities' ? styles.activeBtn : ''}`}
        >
          <Users size={20} />
          <span>Personalidades</span>
        </Link>

        <Link 
          to="/settings" 
          className={`${styles.footerBtn} ${location.pathname === '/settings' ? styles.activeBtn : ''}`}
        >
          <Settings size={20} />
          <span>Ajustes</span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
