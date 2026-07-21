import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useChatStore from '../../../store/chatStore';

const HotkeyManager = () => {
  const navigate = useNavigate();
  const { createNewChat } = useChatStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar atajos si el usuario está enfocado en algún input/textarea y presiona letras, 
      // pero si queremos atajos con Ctrl siempre activos, podemos filtrarlo si es necesario.
      // Sin embargo, Ctrl+N, Ctrl+P, etc. son acciones seguras independientemente del input.

      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createNewChat();
        navigate('/');
      }
      
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        navigate('/settings');
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        navigate('/personalities');
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, createNewChat]);

  return null;
};

export default HotkeyManager;
