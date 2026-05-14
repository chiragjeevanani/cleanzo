import { useState, useEffect } from 'react';
import { 
  ShoppingCart, Search, Filter, ShoppingBag, 
  ArrowRight, Star, Minus, Plus, X, 
  CheckCircle, Truck, Package, CreditCard, Bell
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [category, setCategory] = useState('All');
  const [orderStatus, setOrderStatus] = useState(null); // 'success' | 'loading'

  const categories = ['All', 'Microfiber Cloths', 'Waterless Wash', 'Interior Care', 'Exterior Polish', 'Perfumes', 'Kits'];

  useEffect(() => {
    fetchProducts();
    const savedCart = localStorage.getItem('cleanzo_cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  useEffect(() => {
    localStorage.setItem('cleanzo_cart', JSON.stringify(cart));
  }, [cart]);

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/public/products');
      setProducts(res.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setShowCart(true);
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item._id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return newQty === 0 ? null : { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.discountPrice || item.price) * item.quantity, 0);

  const handleCheckout = async () => {
    if (!user.addresses || user.addresses.length === 0) {
      alert('Please add a shipping address in your profile first.');
      navigate('/customer/addresses');
      return;
    }

    setOrderStatus('loading');
    try {
      const defaultAddress = user.addresses.find(a => a.isDefault) || user.addresses[0];
      const payload = {
        items: cart.map(item => ({ productId: item._id, quantity: item.quantity })),
        shippingAddress: {
          line1: defaultAddress.line1,
          line2: defaultAddress.line2,
          city: defaultAddress.city,
          pincode: defaultAddress.pincode,
          phone: user.phone
        },
        paymentMethod: 'COD'
      };

      await apiClient.post('/customer/marketplace/orders', payload);
      setCart([]);
      setOrderStatus('success');
    } catch (err) {
      alert(err.message);
      setOrderStatus(null);
    }
  };

  if (orderStatus === 'success') {
    return (
      <div className="app-shell flex flex-col items-center justify-center p-40 text-center animate-fade-in">
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(223, 255, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <CheckCircle size={60} color="var(--accent-lime)" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Order Placed!</h2>
        <p className="text-secondary mb-32">Your vehicle care products are on the way. We'll notify you when they're shipped.</p>
        <button className="btn btn-primary w-full py-18 rounded-2xl" onClick={() => navigate('/customer/history')}>View My Orders</button>
        <button className="btn btn-ghost mt-12" onClick={() => setOrderStatus(null)}>Back to Shop</button>
      </div>
    );
  }

  return (
    <div className="app-shell animate-fade-in">
      {/* Header */}
      <div className="app-header" style={{ padding: '24px var(--margin-side)', background: 'transparent' }}>
        <div>
          <div className="text-body-sm text-secondary font-medium">Cleanzo Store</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>Marketplace</h1>
        </div>
        <button className="relative" onClick={() => setShowCart(true)}>
          <div className="glass flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 16 }}>
            <ShoppingCart size={20} className="text-secondary" />
          </div>
          {cart.length > 0 && (
            <div style={{ position: 'absolute', top: -5, right: -5, width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-lime)', color: '#000', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary)' }}>
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </div>
          )}
        </button>
      </div>

      <div className="container">
        {/* Categories — Only show if products exist */}
        {!loading && products.length > 0 && (
          <div className="flex gap-12 overflow-x-auto pb-16 no-scrollbar" style={{ marginBottom: 24 }}>
            {categories.map(c => (
              <button 
                key={c} 
                onClick={() => setCategory(c)}
                className={`chip ${category === c ? 'chip-lime' : 'chip-ghost'}`}
                style={{ flexShrink: 0, padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Product Grid */}
        {loading ? (
          <div className="grid-2 gap-16">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 240, borderRadius: 24 }} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="animate-fade-in" style={{ padding: '40px 0 100px' }}>
            {/* Reimagined: The Reveal Banner */}
            <div className="relative overflow-hidden" style={{ 
              width: '100%', 
              minHeight: 500,
              borderRadius: 48,
              background: '#000',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '0 24px',
              border: '1px solid rgba(255,255,255,0.03)',
              boxShadow: '0 60px 100px rgba(0,0,0,0.8)'
            }}>
              {/* Background Image: Luxury Car Silhouette */}
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                backgroundImage: 'url("https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=2000&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.3,
                zIndex: 0
              }} />
              
              {/* Internal Glow */}
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                background: 'radial-gradient(circle at center, transparent 0%, #000 80%)',
                zIndex: 1
              }} />

              {/* Content Overlay */}
              <div style={{ position: 'relative', zIndex: 10 }}>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  background: 'rgba(255,255,255,0.05)',
                  padding: '8px 20px',
                  borderRadius: 100,
                  border: '1px solid rgba(255,255,255,0.1)',
                  marginBottom: 32,
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-lime)', boxShadow: '0 0 10px var(--accent-lime)' }} />
                  <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', color: '#fff', textTransform: 'uppercase' }}>Coming Soon</span>
                </div>

                <h2 style={{ 
                  fontFamily: 'var(--font-display)', 
                  fontSize: 'clamp(40px, 8vw, 72px)', 
                  fontWeight: 900, 
                  lineHeight: 1, 
                  letterSpacing: '-0.04em',
                  color: '#fff',
                  marginBottom: 20
                }}>
                  Curating <br />
                  <span style={{ 
                    background: 'linear-gradient(to right, #fff, rgba(255,255,255,0.2))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>Excellence.</span>
                </h2>

                <p className="text-secondary" style={{ 
                  maxWidth: 460, 
                  fontSize: 18, 
                  lineHeight: 1.6, 
                  opacity: 0.6, 
                  marginBottom: 48,
                  marginRight: 'auto',
                  marginLeft: 'auto'
                }}>
                  Hand-selecting the world's most effective vehicle care essentials for the Cleanzo community.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-16">
                  <button className="btn btn-primary px-40 py-18 rounded-2xl font-bold flex items-center gap-12 shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                    <Bell size={20} /> Get Early Access
                  </button>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                    Exclusive for subscribers
                  </div>
                </div>
              </div>
              
              {/* Bottom Decorative Line */}
              <div style={{ 
                position: 'absolute', 
                bottom: 40, 
                left: '50%', 
                transform: 'translateX(-50%)',
                width: 1,
                height: 60,
                background: 'linear-gradient(to bottom, var(--accent-lime), transparent)',
                opacity: 0.5
              }} />
            </div>
          </div>
        ) : (
          <div className="grid-2 gap-16" style={{ marginBottom: 100 }}>
            {products
              .filter(p => category === 'All' || p.category === category)
              .map(p => (
                <div key={p._id} className="glass group" style={{ padding: 12, borderRadius: 24, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
                    <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <button className="glass flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 10 }} onClick={() => addToCart(p)}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: '0 4px' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, lineHeight: 1.2 }}>{p.name}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-lime)' }}>₹{p.discountPrice || p.price}</span>
                        {p.discountPrice && <span style={{ fontSize: 11, textDecoration: 'line-through', opacity: 0.5 }}>₹{p.price}</span>}
                      </div>
                      <span className="text-[10px] text-secondary font-bold uppercase">{p.category.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, backdropFilter: 'blur(12px)' }} onClick={() => setShowCart(false)} />
          <div className="animate-slide-up" style={{ 
            position: 'fixed', 
            bottom: 0, 
            left: '50%', 
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: 480, 
            background: 'var(--bg-secondary)', 
            borderTopLeftRadius: 40, 
            borderTopRightRadius: 40, 
            padding: '40px 24px', 
            zIndex: 101, 
            maxHeight: '85vh', 
            overflowY: 'auto',
            boxShadow: '0 -20px 40px rgba(0,0,0,0.4)',
            scrollbarWidth: 'none'
          }}>
            <div className="flex justify-between items-center mb-24">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>Your Cart</h2>
              <button onClick={() => setShowCart(false)}><X size={24} /></button>
            </div>

            {cart.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <ShoppingBag size={48} className="mx-auto opacity-20 mb-16" />
                <p className="text-secondary">Your cart is empty</p>
              </div>
            ) : (
              <div className="flex flex-col gap-20 mb-32">
                {cart.map(item => (
                  <div key={item._id} className="flex gap-16 items-center">
                    <img src={item.images[0]} style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover' }} />
                    <div className="flex-1">
                      <h4 style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</h4>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-lime)' }}>₹{item.discountPrice || item.price}</div>
                    </div>
                    <div className="flex items-center gap-12 bg-black/20 rounded-xl p-4">
                      <button className="p-4" onClick={() => updateQuantity(item._id, -1)}><Minus size={14} /></button>
                      <span style={{ fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                      <button className="p-4" onClick={() => updateQuantity(item._id, 1)}><Plus size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 24 }}>
                <div className="flex justify-between items-center mb-24">
                  <span className="text-secondary font-bold">Total Amount</span>
                  <span style={{ fontSize: 28, fontWeight: 800 }}>₹{cartTotal}</span>
                </div>
                
                <div className="glass flex items-center gap-16 p-16 mb-24" style={{ borderRadius: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Truck size={20} className="text-secondary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-secondary font-bold uppercase">Shipping to</div>
                    <div className="text-sm font-medium line-clamp-1">
                      {user.addresses?.find(a => a.isDefault)?.line1 || 'No address set'}
                    </div>
                  </div>
                  <button className="text-xs font-bold text-primary" onClick={() => navigate('/customer/addresses')}>Change</button>
                </div>

                <button 
                  className={`btn btn-primary w-full py-18 rounded-2xl flex items-center justify-center gap-8 ${orderStatus === 'loading' ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={handleCheckout}
                >
                  {orderStatus === 'loading' ? 'Processing...' : `Place Order (COD)`}
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
