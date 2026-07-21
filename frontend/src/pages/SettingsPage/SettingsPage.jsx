import { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, Upload, User, Bot } from 'lucide-react';
import useSettingsStore from '../../store/settingsStore';
import Modal from '../../components/common/Modal/Modal';
import styles from './SettingsPage.module.scss';
import { invoke } from '@tauri-apps/api/tauri';
import { convertFileSrc } from '@tauri-apps/api/tauri';

const isTauri = typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;

const SettingsPage = () => {
  const { 
    theme, aiModel, temperature, 
    bgBlur, bgOpacity, bgPath,
    userIconPath, userIconPosX, userIconPosY,
    aiIconPath, aiIconPosX, aiIconPosY,
    setTheme, setAiModel, setTemperature, setBgSettings, setIconSettings,
    saveBgSettingsToBackend, saveIconSettingsToBackend, resetSettings,
    availableModels, fetchModels
  } = useSettingsStore();

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', isError: false });

  const handleSave = async () => {
    try {
      if (isTauri) {
        await saveBgSettingsToBackend();
        await saveIconSettingsToBackend();
      }
      setModalState({
        isOpen: true,
        title: 'Ajustes Guardados',
        message: 'Tus configuraciones han sido guardadas con éxito.',
        isError: false
      });
    } catch (e) {
      setModalState({
        isOpen: true,
        title: 'Error al Guardar',
        message: `Hubo un error al guardar los ajustes: ${e}`,
        isError: true
      });
    }
  };

  const handleFileUpload = async (e, type = 'bg') => {
    const file = e.target.files[0];
    if (!file) return;

    const isIcon = type !== 'bg';
    const MAX_SIZE = (isIcon ? 5 : 50) * 1024 * 1024; // 5MB iconos, 50MB fondo
    
    if (file.size > MAX_SIZE) {
      setModalState({
        isOpen: true,
        title: 'Archivo demasiado grande',
        message: `La imagen pesa más de ${isIcon ? '5MB' : '50MB'}. Por favor selecciona una más pequeña o ubícala manualmente.`,
        isError: true
      });
      return;
    }

    if (!isTauri) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (type === 'bg') setBgSettings({ bgPath: ev.target.result });
        else if (type === 'user') setIconSettings({ userIconPath: ev.target.result });
        else if (type === 'ai') setIconSettings({ aiIconPath: ev.target.result });
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      const ext = file.name.split('.').pop();
      
      if (type === 'bg') {
        const savedPath = await invoke('save_background_image', {
          imageBytes: Array.from(uint8Array),
          extension: ext
        });
        setBgSettings({ bgPath: savedPath });
      } else {
        const savedPath = await invoke('save_icon_image', {
          imageBytes: Array.from(uint8Array),
          extension: ext,
          iconType: type
        });
        if (type === 'user') setIconSettings({ userIconPath: savedPath });
        else if (type === 'ai') setIconSettings({ aiIconPath: savedPath });
      }
      
    } catch (err) {
      setModalState({
        isOpen: true,
        title: 'Error al subir imagen',
        message: `No se pudo guardar la imagen: ${err}`,
        isError: true
      });
    }
  };

  const renderIconPreview = (path, posX, posY, defaultIcon) => {
    if (path) {
      const imgUrl = isTauri && !path.startsWith('data:') ? convertFileSrc(path) : path;
      return <div className={styles.iconPreviewImg} style={{ 
        backgroundImage: `url(${imgUrl})`,
        backgroundPosition: `${posX}% ${posY}%`
      }} />;
    }
    return <div className={styles.iconPreviewPlaceholder}>{defaultIcon}</div>;
  };

  return (
    <div className={styles.settingsContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ajustes del Agente</h1>
        <p className={styles.subtitle}>Configura el comportamiento y la apariencia de la interfaz.</p>
      </header>

      <div className={styles.content}>
        
        {/* Sección de Avatares */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <User size={18} style={{marginRight: '8px', verticalAlign: 'middle'}}/>
            Personalización de Avatares (Máx 5MB)
          </h2>
          
          <div className={styles.iconSettingsGrid}>
            <div className={styles.iconSettingsColumn}>
              <h3 className={styles.label}>Avatar del Usuario</h3>
              <div className={styles.iconPreviewContainer}>
                {renderIconPreview(userIconPath, userIconPosX, userIconPosY, <User size={40} />)}
              </div>
              <div className={styles.uploadArea} style={{ padding: '0.5rem', marginBottom: '1rem' }}>
                <Upload size={16} /> <span>Subir</span>
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'user')} className={styles.fileInput} />
              </div>
              {userIconPath && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.helpText}>Posición X ({userIconPosX}%)</label>
                    <input type="range" className={styles.range} min="0" max="100" value={userIconPosX} onChange={(e) => setIconSettings({ userIconPosX: parseInt(e.target.value) })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.helpText}>Posición Y ({userIconPosY}%)</label>
                    <input type="range" className={styles.range} min="0" max="100" value={userIconPosY} onChange={(e) => setIconSettings({ userIconPosY: parseInt(e.target.value) })} />
                  </div>
                </>
              )}
            </div>

            <div className={styles.iconSettingsColumn}>
              <h3 className={styles.label}>Avatar de la IA</h3>
              <div className={styles.iconPreviewContainer}>
                {renderIconPreview(aiIconPath, aiIconPosX, aiIconPosY, <Bot size={40} />)}
              </div>
              <div className={styles.uploadArea} style={{ padding: '0.5rem', marginBottom: '1rem' }}>
                <Upload size={16} /> <span>Subir</span>
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'ai')} className={styles.fileInput} />
              </div>
              {aiIconPath && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.helpText}>Posición X ({aiIconPosX}%)</label>
                    <input type="range" className={styles.range} min="0" max="100" value={aiIconPosX} onChange={(e) => setIconSettings({ aiIconPosX: parseInt(e.target.value) })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.helpText}>Posición Y ({aiIconPosY}%)</label>
                    <input type="range" className={styles.range} min="0" max="100" value={aiIconPosY} onChange={(e) => setIconSettings({ aiIconPosY: parseInt(e.target.value) })} />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Sección de Fondo de Pantalla */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <ImageIcon size={18} style={{marginRight: '8px', verticalAlign: 'middle'}}/>
            Fondo de Pantalla
          </h2>
          
          <div className={styles.bgPreviewContainer}>
            <div className={styles.bgPreview} style={{
              backgroundImage: bgPath ? `url(${isTauri && !bgPath.startsWith('data:') ? convertFileSrc(bgPath) : bgPath})` : 'none',
              filter: `blur(${bgBlur}px)`,
              opacity: bgOpacity / 100
            }}></div>
            <div className={styles.bgOverlayText}>Vista Previa</div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Subir nueva imagen (Máx. 50MB)</label>
            <div className={styles.uploadArea}>
              <Upload size={20} />
              <span>Seleccionar archivo</span>
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'bg')} className={styles.fileInput} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Difuminado (Blur: {bgBlur}px)</label>
            <input 
              type="range" className={styles.range} min="0" max="50" step="1" 
              value={bgBlur} onChange={(e) => setBgSettings({ bgBlur: parseInt(e.target.value) })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Opacidad ({bgOpacity}%)</label>
            <input 
              type="range" className={styles.range} min="10" max="100" step="1" 
              value={bgOpacity} onChange={(e) => setBgSettings({ bgOpacity: parseInt(e.target.value) })}
            />
          </div>
        </section>

        {/* Sección Apariencia original */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Apariencia General</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>Tema de la interfaz</label>
            <select className={styles.select} value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="dark">Oscuro (Moderno)</option>
              <option value="light">Claro</option>
            </select>
          </div>
        </section>

        {/* Sección IA */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Configuración de IA</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>Modelo preferido</label>
            <select className={styles.select} value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
              {availableModels.length > 0 ? (
                availableModels.map(m => (
                  <option key={m.id} value={m.id}>{m.displayName} ({m.status})</option>
                ))
              ) : (
                <>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Rápido)</option>
                </>
              )}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Temperatura ({temperature})</label>
            <input type="range" className={styles.range} min="0" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} />
          </div>
        </section>

      </div>

      <footer className={styles.footer}>
        <button className={styles.resetBtn} onClick={resetSettings}>Restablecer Valores</button>
        <button className={styles.saveBtn} onClick={handleSave}>
          <Save size={18} />
          Guardar Cambios
        </button>
      </footer>

      {/* Reemplazo del Alert por el Modal */}
      <Modal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        actions={
          <button 
            className={`${styles.modalBtn} ${modalState.isError ? styles.modalBtnError : styles.modalBtnPrimary}`}
            onClick={() => setModalState({ ...modalState, isOpen: false })}
          >
            Entendido
          </button>
        }
      >
        <p>{modalState.message}</p>
      </Modal>
    </div>
  );
};

export default SettingsPage;
