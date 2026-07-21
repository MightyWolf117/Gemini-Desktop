import { useState, useEffect } from 'react';
import { PlusCircle, Edit3, UserCircle, Save } from 'lucide-react';
import Modal from '../../components/common/Modal/Modal';
import { ENDPOINTS } from '../../service/api';
import styles from './PersonalityPage.module.scss';

const PersonalityPage = () => {
  const [personalities, setPersonalities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({ nombre: '', descripcion_corta: '', instrucciones: '' });

  const [alert, setAlert] = useState({ isOpen: false, title: '', message: '', isError: false });

  const fetchPersonalities = async () => {
    setLoading(true);
    try {
      const response = await fetch(ENDPOINTS.PERSONALITIES);
      if (response.ok) {
        const data = await response.json();
        setPersonalities(data || []);
      }
    } catch (e) {
      console.error("Error fetching personalities:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalities();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ nombre: '', descripcion_corta: '', instrucciones: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingId(p.id);
    setFormData({ 
      nombre: p.nombre || '', 
      descripcion_corta: p.descripcion_corta || '', 
      instrucciones: p.instrucciones || '' 
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim() || !formData.instrucciones.trim()) {
      setAlert({ isOpen: true, title: 'Campos requeridos', message: 'El nombre y las instrucciones son obligatorios.', isError: true });
      return;
    }

    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `${ENDPOINTS.PERSONALITIES}/${editingId}` : ENDPOINTS.PERSONALITIES;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsModalOpen(false);
        fetchPersonalities();
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al guardar');
      }
    } catch (e) {
      setAlert({ isOpen: true, title: 'Error', message: e.message, isError: true });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Personalidades de IA</h1>
          <p className={styles.subtitle}>Define el comportamiento y el rol de tus agentes.</p>
        </div>
        <button className={styles.primaryBtn} onClick={openNewModal}>
          <PlusCircle size={20} />
          Crear Personalidad
        </button>
      </header>

      {loading ? (
        <div className={styles.loadingState}>Cargando personalidades...</div>
      ) : (
        <div className={styles.grid}>
          {personalities.map((p) => (
            <div key={p.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <UserCircle size={24} className={styles.cardIcon} />
                  <h3>{p.nombre}</h3>
                </div>
                <button className={styles.editBtn} onClick={() => openEditModal(p)} title="Editar">
                  <Edit3 size={18} />
                </button>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.description}>{p.descripcion_corta || 'Sin descripción.'}</p>
              </div>
            </div>
          ))}
          {personalities.length === 0 && (
            <div className={styles.emptyState}>No has creado ninguna personalidad.</div>
          )}
        </div>
      )}

      {/* Modal Creación/Edición */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Personalidad' : 'Nueva Personalidad'}
        actions={
          <>
            <button className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button className={styles.saveBtn} onClick={handleSave}><Save size={16}/> Guardar</button>
          </>
        }
      >
        <div className={styles.formGroup}>
          <label>Nombre de la Personalidad *</label>
          <input 
            className={styles.input} 
            value={formData.nombre} 
            onChange={e => setFormData({...formData, nombre: e.target.value})} 
            placeholder="Ej. Programador Experto" 
          />
        </div>
        <div className={styles.formGroup}>
          <label>Descripción corta</label>
          <input 
            className={styles.input} 
            value={formData.descripcion_corta} 
            onChange={e => setFormData({...formData, descripcion_corta: e.target.value})} 
            placeholder="Una breve descripción para identificarlo" 
          />
        </div>
        <div className={styles.formGroup}>
          <label>Instrucciones de Comportamiento (Prompt) *</label>
          <textarea 
            className={styles.textarea} 
            value={formData.instrucciones} 
            onChange={e => setFormData({...formData, instrucciones: e.target.value})} 
            placeholder="Ej. Eres un experto en Python. Debes responder con código limpio..." 
            rows={5}
          />
        </div>
      </Modal>

      {/* Modal Alertas */}
      <Modal 
        isOpen={alert.isOpen} 
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        actions={
          <button 
            className={`${styles.saveBtn} ${alert.isError ? styles.errorBtn : ''}`}
            onClick={() => setAlert({ ...alert, isOpen: false })}
          >
            Entendido
          </button>
        }
      >
        <p>{alert.message}</p>
      </Modal>

    </div>
  );
};

export default PersonalityPage;
