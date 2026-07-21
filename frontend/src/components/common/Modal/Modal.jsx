import { X } from 'lucide-react';
import styles from './Modal.module.scss';
import { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children, actions, disableOverlayClick = false }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = () => {
    if (!disableOverlayClick) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.body}>
          {children}
        </div>
        {actions && (
          <div className={styles.footer}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
