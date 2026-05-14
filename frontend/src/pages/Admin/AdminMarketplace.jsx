import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Package, ShoppingCart, Plus, Search, Filter, MoreVertical, 
  Trash2, Edit, CheckCircle, Clock, Truck, XCircle, 
  ChevronRight, ArrowUpRight, ArrowDownLeft, AlertCircle,
  PackageCheck, Info, Tag, Layers, Database, ShoppingBag, X, CreditCard, Edit2,
  Eye, EyeOff
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';

export default function AdminMarketplace() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'orders'
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', discountPrice: '', 
    category: 'Other', stock: '', images: [], specifications: []
  });

  const categories = ['Microfiber Cloths', 'Waterless Wash', 'Interior Care', 'Exterior Polish', 'Perfumes', 'Kits', 'Other'];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'products') {
        const res = await apiClient.get('/admin/products');
        setProducts(res.products || []);
      } else {
        const res = await apiClient.get('/admin/marketplace/orders');
        setOrders(res.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('image', file);
    try {
      const res = await apiClient.uploadForm('/admin/upload', form);
      setFormData(prev => ({ ...prev, images: [...prev.images, res.url] }));
      showToast('Image uploaded');
    } catch (err) {
      showToast('Upload failed', 'error');
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        discountPrice: formData.discountPrice ? Number(formData.discountPrice) : undefined,
        stock: Number(formData.stock)
      };

      if (editingProduct) {
        await apiClient.put(`/admin/products/${editingProduct._id}`, payload);
        showToast('Product updated');
      } else {
        await apiClient.post('/admin/products', payload);
        showToast('Product created');
      }
      setShowProductModal(false);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiClient.delete(`/admin/products/${id}`);
      showToast('Product deleted');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleActive = async (product) => {
    try {
      await apiClient.put(`/admin/products/${product._id}`, { isActive: !product.isActive });
      showToast(`Product ${!product.isActive ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId, updates) => {
    try {
      await apiClient.put(`/admin/marketplace/orders/${orderId}`, updates);
      showToast('Order status updated');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Header Area */}
      <div className="flex justify-between items-center" style={{ marginBottom: 40 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>Marketplace</h1>
          <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Manage vehicle care products and track customer orders</p>
        </div>
        <div className="flex items-center gap-16">
          <div className="relative hide-mobile" style={{ width: 240 }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              className="input-field" 
              style={{ paddingLeft: 44, borderRadius: 14, fontSize: 14 }}
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => { setEditingProduct(null); setFormData({ name: '', description: '', price: '', discountPrice: '', category: 'Other', stock: '', images: [], specifications: [] }); setShowProductModal(true); }} style={{ padding: '12px 24px', borderRadius: 14 }}>
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-12" style={{ marginBottom: 32 }}>
        <button 
          className={`flex items-center gap-8 px-24 py-12 rounded-16 font-bold text-sm transition-all ${activeTab === 'products' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'bg-glass text-secondary hover:bg-glass-hover'}`}
          onClick={() => setActiveTab('products')}
        >
          <Database size={16} /> Inventory
        </button>
        <button 
          className={`flex items-center gap-8 px-24 py-12 rounded-16 font-bold text-sm transition-all ${activeTab === 'orders' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'bg-glass text-secondary hover:bg-glass-hover'}`}
          onClick={() => setActiveTab('orders')}
        >
          <ShoppingCart size={16} /> Orders
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-100">
          <div className="animate-spin rounded-full h-40 w-40 border-b-2 border-primary mb-16" />
          <p className="text-tertiary font-medium">Loading marketplace data...</p>
        </div>
      ) : activeTab === 'products' ? (
        <div className="grid-4" style={{ gap: 24 }}>
          {filteredProducts.map(p => (
            <div key={p._id} className="glass group" style={{ padding: 20, borderRadius: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 16, overflow: 'hidden', marginBottom: 16, background: 'rgba(255,255,255,0.02)' }}>
                <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                   <span className={`chip ${p.stock > 0 ? 'chip-lime' : 'chip-error'}`} style={{ fontSize: 10, fontWeight: 800 }}>
                     {p.stock > 0 ? `${p.stock} IN STOCK` : 'OUT OF STOCK'}
                   </span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex justify-between items-start gap-8 mb-4">
                  <h3 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>{p.name}</h3>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-lime)' }}>₹{p.discountPrice || p.price}</div>
                    {p.discountPrice && <div style={{ fontSize: 11, textDecoration: 'line-through', color: 'var(--text-tertiary)' }}>₹{p.price}</div>}
                  </div>
                </div>
                <span className="chip" style={{ fontSize: 9, background: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)', padding: '4px 8px' }}>{p.category.toUpperCase()}</span>
                <p className="text-body-xs text-tertiary line-clamp-2" style={{ marginTop: 12, fontSize: 12 }}>{p.description}</p>
              </div>
              <div className="flex gap-8" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--divider)' }}>
                <button 
                  className={`btn btn-ghost flex-1 py-10 rounded-12 flex items-center justify-center gap-6 text-xs font-bold ${p.isActive ? '' : 'text-warning'}`} 
                  onClick={() => handleToggleActive(p)}
                  title={p.isActive ? 'Deactivate Product' : 'Activate Product'}
                >
                  {p.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                  {p.isActive ? 'Active' : 'Hidden'}
                </button>
                <button className="btn btn-ghost flex-1 py-10 rounded-12 flex items-center justify-center gap-6 text-xs font-bold" onClick={() => { setEditingProduct(p); setFormData(p); setShowProductModal(true); }}>
                  <Edit2 size={14} /> Edit
                </button>
                <button className="btn btn-ghost flex-1 py-10 rounded-12 flex items-center justify-center gap-6 text-xs font-bold text-error hover:bg-error/5" onClick={() => handleDeleteProduct(p._id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="glass col-span-4" style={{ padding: 80, textAlign: 'center', borderRadius: 32 }}>
              <Package size={48} className="text-tertiary mb-16 mx-auto opacity-20" />
              <div className="text-secondary font-bold text-lg mb-8">No Products Found</div>
              <p className="text-tertiary text-sm max-w-300 mx-auto">Try a different search or start by adding a new vehicle care product to your inventory.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass overflow-hidden" style={{ borderRadius: 28, border: '1px solid var(--border-glass)' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--divider)' }}>
                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>ORDER DETAILS</th>
                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>CUSTOMER</th>
                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>ITEMS</th>
                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>AMOUNT</th>
                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>STATUS</th>
                <th style={{ textAlign: 'right', padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {orders.map(o => (
                <tr key={o._id} className="hover:bg-glass-hover transition-colors">
                  <td className="px-24 py-20">
                    <div style={{ fontWeight: 800, color: 'var(--primary-blue)', marginBottom: 2 }}>{o.orderId}</div>
                    <div className="flex items-center gap-4 text-[10px] text-tertiary font-bold">
                      <Clock size={10} /> {new Date(o.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-24 py-20">
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{o.customer?.firstName} {o.customer?.lastName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{o.customer?.phone}</div>
                  </td>
                  <td className="px-24 py-20">
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{o.items.length} Product(s)</div>
                    <div className="text-[10px] text-tertiary truncate" style={{ maxWidth: 180 }}>{o.items.map(i => i.product?.name).join(', ')}</div>
                  </td>
                  <td className="px-24 py-20">
                    <div style={{ fontWeight: 800, fontSize: 15 }}>₹{o.totalAmount}</div>
                    <div className="chip" style={{ fontSize: 9, background: 'rgba(255,255,255,0.05)', marginTop: 4 }}>{o.paymentMethod}</div>
                  </td>
                  <td className="px-24 py-20">
                    <span className={`chip ${
                      o.status === 'Delivered' ? 'chip-success' : 
                      o.status === 'Cancelled' ? 'chip-error' : 
                      o.status === 'Shipped' ? 'chip-primary' : 'chip-lime'
                    }`} style={{ fontSize: 10, fontWeight: 800 }}>
                      {o.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-24 py-20" style={{ textAlign: 'right' }}>
                    <select 
                      className="input-field" 
                      style={{ padding: '6px 12px', fontSize: 11, width: 'auto', borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}
                      value={o.status}
                      onChange={(e) => handleUpdateOrderStatus(o._id, { status: e.target.value })}
                    >
                      <option value="Placed">Placed</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="py-100 flex flex-col items-center justify-center text-center">
              <ShoppingBag size={48} className="text-tertiary mb-16 opacity-20 mx-auto" />
              <div className="text-secondary font-bold text-lg mb-4">No Orders Found</div>
              <p className="text-tertiary text-sm">Once customers start ordering, they will appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && createPortal(
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
          <div className="glass animate-scale-in" 
            style={{ 
              width: 720, 
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
            
            <div className="flex justify-between items-start" style={{ marginBottom: 48 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                  {editingProduct ? 'Edit Listing' : 'New Product'}
                </h2>
                <p className="text-secondary" style={{ fontSize: 16, marginTop: 6, opacity: 0.8 }}>{editingProduct ? 'Refine your product details and pricing' : 'Launch a new product into the marketplace'}</p>
              </div>
              <button className="glass flex items-center justify-center hover:scale-110 transition-all hover:bg-white/10"
                onClick={() => setShowProductModal(false)}
                style={{ width: 48, height: 48, borderRadius: 18 }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="flex flex-col gap-36">
              {/* Core Details */}
              <div className="space-y-32">
                <div className="flex flex-col gap-12">
                  <label style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.15em', fontWeight: 700 }}>PRODUCT IDENTITY</label>
                  <input required className="input-field" 
                    style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: '18px 24px', border: '1px solid var(--divider)', fontSize: 17, fontWeight: 500 }}
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Microfiber Polishing Cloth" />
                </div>

                <div className="flex flex-col gap-12">
                  <label style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.15em', fontWeight: 700 }}>DESCRIPTION</label>
                  <textarea required className="input-field" 
                    style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: '18px 24px', border: '1px solid var(--divider)', minHeight: 120, fontSize: 15, resize: 'none', lineHeight: 1.6 }}
                    value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Highlight features, material, and benefits..." />
                </div>

                <div className="grid-2" style={{ gap: 32 }}>
                  <div className="flex flex-col gap-12">
                    <label style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.15em', fontWeight: 700 }}>BASE PRICE (₹)</label>
                    <input required type="number" className="input-field" 
                      style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: '18px 24px', border: '1px solid var(--divider)', fontSize: 18, fontWeight: 700 }}
                      value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="0" />
                  </div>
                  <div className="flex flex-col gap-12">
                    <label style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.15em', fontWeight: 700 }}>OFFER PRICE (₹)</label>
                    <input type="number" className="input-field" 
                      style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: '18px 24px', border: '1px solid var(--divider)', fontSize: 18, fontWeight: 700, color: 'var(--accent-lime)' }}
                      value={formData.discountPrice} onChange={e => setFormData({ ...formData, discountPrice: e.target.value })} placeholder="Optional" />
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 32 }}>
                  <div className="flex flex-col gap-12">
                    <label style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.15em', fontWeight: 700 }}>CATEGORY</label>
                    <select className="input-field cursor-pointer" 
                      style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: '18px 24px', border: '1px solid var(--divider)', fontSize: 16, appearance: 'none' }}
                      value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-12">
                    <label style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.15em', fontWeight: 700 }}>INVENTORY LEVEL</label>
                    <input required type="number" className="input-field" 
                      style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: '18px 24px', border: '1px solid var(--divider)', fontSize: 17 }}
                      value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} placeholder="Units available" />
                  </div>
                </div>

                {/* Media Section */}
                <div className="flex flex-col gap-16" style={{ background: 'rgba(255,255,255,0.02)', padding: 32, borderRadius: 24, border: '1px dashed var(--divider)' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.15em', fontWeight: 700 }}>PRODUCT MEDIA</label>
                  <div className="flex flex-wrap gap-16">
                    {formData.images.map((url, i) => (
                      <div key={i} className="relative w-100 h-100 rounded-24 overflow-hidden border border-divider group shadow-xl transition-all hover:scale-105">
                        <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" className="p-8 bg-error rounded-12 hover:scale-110 transition-transform" onClick={() => setFormData({ ...formData, images: formData.images.filter((_, idx) => idx !== i) })}>
                            <Trash2 size={18} color="#fff" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <label className="w-100 h-100 rounded-24 border-2 border-dashed border-divider flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group">
                      <div className="p-10 bg-glass rounded-14 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                        <Plus size={24} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', marginTop: 8 }}>ADD PHOTO</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-20" style={{ marginTop: 12 }}>
                <button type="button" className="btn btn-glass flex-1 py-20 rounded-24 font-bold" onClick={() => setShowProductModal(false)}>Discard</button>
                <button type="submit" className="btn btn-primary flex-[2] py-20 rounded-24 font-extrabold text-lg shadow-xl shadow-primary/30 transform transition-active active:scale-95">
                  {editingProduct ? 'Save Changes' : 'Launch Product'}
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
