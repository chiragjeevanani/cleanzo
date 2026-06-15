import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Layers, Plus, Edit, Trash2, X, Eye, EyeOff, Save, Info, AlertCircle, Clock
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';

export default function AdminCategories() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: '', icon: 'Package', description: '', isActive: true, sortOrder: 0
  });

  const availableIcons = [
    'Package', 'ShoppingBag', 'Sparkles', 'Wrench', 'Compass', 'Gift', 'Tags', 'Shield', 'Droplet', 'Car'
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/marketplace/categories');
      setCategories(res.categories || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Marketplace category name is required', 'error');
      return;
    }

    const containsAlphanumeric = (str) => /^(?=.*[a-zA-Z0-9]).+$/.test(str);
    if (!containsAlphanumeric(formData.name)) {
      showToast('Marketplace category name cannot consist of only special characters', 'error');
      return;
    }

    try {
      const payload = {
        ...formData,
        sortOrder: Number(formData.sortOrder)
      };

      if (editingCategory) {
        await apiClient.put(`/admin/marketplace/categories/${editingCategory._id}`, payload);
        showToast('Marketplace category updated successfully');
      } else {
        await apiClient.post('/admin/marketplace/categories', payload);
        showToast('Marketplace category created successfully');
      }

      setShowModal(false);
      fetchCategories();
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this marketplace category? All products using it may lose their categorization.')) return;
    try {
      await apiClient.delete(`/admin/marketplace/categories/${id}`);
      showToast('Marketplace category deleted successfully');
      fetchCategories();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  const handleToggleActive = async (category) => {
    try {
      await apiClient.put(`/admin/marketplace/categories/${category._id}`, { isActive: !category.isActive });
      showToast(`Marketplace category ${!category.isActive ? 'activated' : 'deactivated'}`);
      fetchCategories();
    } catch (err) {
      showToast(err.message || 'Toggle status failed', 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header Area */}
      <div className="flex justify-between items-center" style={{ marginBottom: 40 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>Marketplace Categories</h1>
          <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Manage marketplace product and service categories shown dynamically on the app store</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => { 
            setEditingCategory(null); 
            setFormData({ name: '', icon: 'Package', description: '', isActive: true, sortOrder: 0 }); 
            setShowModal(true); 
          }} 
          style={{ padding: '12px 24px', borderRadius: 14 }}
        >
          <Plus size={18} /> Add Marketplace Category
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-100">
          <div className="animate-spin rounded-full h-40 w-40 border-b-2 border-primary mb-16" />
          <p className="text-tertiary font-medium">Loading marketplace categories...</p>
        </div>
      ) : (
        <div className="glass overflow-hidden" style={{ borderRadius: 28, border: '1px solid var(--border-glass)' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--divider)' }}>
                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>MARKETPLACE CATEGORY NAME</th>
                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>ICON</th>
                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>DESCRIPTION</th>
                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>SORT ORDER</th>
                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>STATUS</th>
                <th style={{ textAlign: 'right', padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {categories.map(c => (
                <tr key={c._id} className="hover:bg-glass-hover transition-colors">
                  <td className="px-24 py-20" style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</td>
                  <td className="px-24 py-20">
                    <span className="chip chip-ghost" style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {c.icon}
                    </span>
                  </td>
                  <td className="px-24 py-20 text-secondary text-sm" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.description || 'No description provided.'}
                  </td>
                  <td className="px-24 py-20" style={{ fontWeight: 600 }}>{c.sortOrder}</td>
                  <td className="px-24 py-20">
                    <button 
                      onClick={() => handleToggleActive(c)}
                      className={`chip ${c.isActive ? 'chip-success' : 'chip-error'}`} 
                      style={{ fontSize: 10, fontWeight: 800 }}
                    >
                      {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>
                  <td className="px-24 py-20" style={{ textAlign: 'right' }}>
                    <div className="flex justify-end gap-8">
                      <button 
                        className="btn btn-ghost py-8 px-12 rounded-10 text-xs font-bold" 
                        onClick={() => { setEditingCategory(c); setFormData(c); setShowModal(true); }}
                      >
                        <Edit size={14} style={{ marginRight: 4 }} /> Edit
                      </button>
                      <button 
                        className="btn btn-ghost py-8 px-12 rounded-10 text-xs font-bold text-error hover:bg-error/5" 
                        onClick={() => handleDelete(c._id)}
                      >
                        <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {categories.length === 0 && (
            <div className="py-100 flex flex-col items-center justify-center text-center">
              <Layers size={48} className="text-tertiary mb-16 opacity-20 mx-auto" />
              <div className="text-secondary font-bold text-lg mb-4">No Marketplace Categories Found</div>
              <p className="text-tertiary text-sm">Get started by launching your first marketplace category.</p>
            </div>
          )}
        </div>
      )}

      {/* Category Add/Edit Modal */}
      {showModal && createPortal(
        <div className="modal-overlay" style={{ 
          backdropFilter: 'blur(32px)', 
          backgroundColor: 'rgba(0,0,0,0.8)', 
          zIndex: 9999,
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 0'
        }}>
          <div className="glass-solid animate-scale-in" 
            style={{ 
              width: 540, 
              padding: '48px 56px', 
              borderRadius: 40, 
              border: '1px solid var(--border-glass)', 
              boxShadow: 'var(--shadow-lg)',
              background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
              position: 'relative',
              maxHeight: '92vh',
              overflowY: 'auto',
              zIndex: 10000,
              scrollbarWidth: 'none'
            }}>
            
            <div className="flex justify-between items-start" style={{ marginBottom: 40 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                  {editingCategory ? 'Edit Marketplace Category' : 'Add Marketplace Category'}
                </h2>
                <p className="text-secondary" style={{ fontSize: 15, marginTop: 4, opacity: 0.8 }}>Define marketplace category identity and sort parameters</p>
              </div>
              <button className="glass flex items-center justify-center hover:scale-110 transition-all hover:bg-white/10"
                onClick={() => setShowModal(false)}
                style={{ width: 48, height: 48, borderRadius: 18 }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-28">
              <div className="flex flex-col gap-8">
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.15em', fontWeight: 700 }}>MARKETPLACE CATEGORY NAME *</label>
                <input 
                  required 
                  className="input-field" 
                  style={{ background: 'var(--bg-glass)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--divider)', fontSize: 16 }}
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="e.g. Products, Services, Car Care" 
                />
              </div>

              <div className="flex flex-col gap-8">
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.15em', fontWeight: 700 }}>ICON *</label>
                <select 
                  className="input-field cursor-pointer" 
                  style={{ background: 'var(--bg-glass)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--divider)', fontSize: 16 }}
                  value={formData.icon} 
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                >
                  {availableIcons.map(iconName => (
                    <option key={iconName} value={iconName} style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>{iconName}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-8">
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.15em', fontWeight: 700 }}>DESCRIPTION</label>
                <textarea 
                  className="input-field" 
                  style={{ background: 'var(--bg-glass)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--divider)', minHeight: 80, fontSize: 14, resize: 'none' }}
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })} 
                  placeholder="Describe what items belong in this marketplace category..." 
                />
              </div>

              <div className="grid-2 gap-20">
                <div className="flex flex-col gap-8">
                  <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.15em', fontWeight: 700 }}>SORT ORDER</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    style={{ background: 'var(--bg-glass)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--divider)', fontSize: 16 }}
                    value={formData.sortOrder}
                    onChange={e => setFormData({ ...formData, sortOrder: Math.max(0, parseInt(e.target.value) || 0) })}
                    placeholder="0"
                  />
                </div>

                <div className="flex flex-col gap-8">
                  <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.15em', fontWeight: 700 }}>ACTIVE ON APP</label>
                  <div className="flex items-center gap-12" style={{ padding: '12px 0' }}>
                    <input 
                      type="checkbox" 
                      id="isActiveToggle"
                      style={{ width: 22, height: 22, cursor: 'pointer', accentColor: 'var(--accent-lime)' }}
                      checked={formData.isActive}
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <label htmlFor="isActiveToggle" style={{ fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      Publish Marketplace Category
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-16" style={{ marginTop: 24 }}>
                <button type="button" className="btn btn-glass flex-1 py-18 rounded-20 font-bold" onClick={() => setShowModal(false)}>Discard</button>
                <button type="submit" className="btn btn-primary flex-[2] py-18 rounded-20 font-extrabold text-md shadow-xl shadow-primary/30">
                  {editingCategory ? 'Save Changes' : 'Create Marketplace Category'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
