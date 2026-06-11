import { useState, useEffect } from 'react'
import { Landmark, ArrowUpRight, DollarSign, Clock, Calendar, CheckCircle2, XCircle, AlertCircle, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import apiClient from '../../services/apiClient'
import PageLoader from '../../components/PageLoader'
import { useToast } from '../../context/ToastContext'

export default function SocietyCommissions() {
  const { showToast } = useToast()
  
  // Data State
  const [commissions, setCommissions] = useState([])
  const [payoutRequests, setPayoutRequests] = useState([])
  const [summary, setSummary] = useState({ totalEarned: 0, pendingBalance: 0, paidOut: 0 })
  const [savedBankDetails, setSavedBankDetails] = useState(null)
  
  // UI & Loading State
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('commissions') // 'commissions' | 'payouts'
  
  // Pagination for Commissions
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 10

  // Payout Request Form State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('bank') // 'bank' | 'upi'
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [upiId, setUpiId] = useState('')

  // Close the payout modal and clear any unsaved form input (bug 67).
  const closeWithdrawModal = () => {
    setShowWithdrawModal(false)
    setWithdrawAmount('')
    setPayoutMethod('bank')
    setAccountName('')
    setAccountNumber('')
    setBankName('')
    setIfscCode('')
    setUpiId('')
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [commRes, payoutRes, profileRes] = await Promise.all([
        apiClient.get('/society/commissions', { page, limit }),
        apiClient.get('/society/payout-requests'),
        apiClient.get('/society/profile')
      ])

      if (commRes.success) {
        setCommissions(commRes.commissions)
        setSummary(commRes.summary)
        setTotalPages(commRes.totalPages)
      }
      if (payoutRes.success) {
        setPayoutRequests(payoutRes.requests)
      }
      if (profileRes.success && profileRes.profile) {
        const bd = profileRes.profile.bankDetails || {}
        setSavedBankDetails(bd)
        setAccountName(bd.accountName || '')
        setAccountNumber(bd.accountNumber || '')
        setBankName(bd.bankName || '')
        setIfscCode(bd.ifscCode || '')
        setUpiId(bd.upiId || '')
      }
    } catch (err) {
      setError(err.message || 'Failed to load commissions data')
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    fetchData()
  }, [page])

  // Check if there is an active pending payout request
  const hasPendingPayout = payoutRequests.some(r => r.status === 'pending')

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault()
    
    const amt = parseFloat(withdrawAmount)
    if (!amt || amt <= 0) {
      showToast('Please enter a valid amount', 'error')
      return
    }

    if (amt > summary.pendingBalance) {
      showToast(`Cannot exceed pending balance of ₹${summary.pendingBalance}`, 'error')
      return
    }

    setSubmitting(true)
    try {
      const bankDetails = payoutMethod === 'bank' ? {
        accountName,
        accountNumber,
        bankName,
        ifscCode
      } : {
        upiId
      }

      const res = await apiClient.post('/society/payout-requests', {
        amount: amt,
        bankDetails
      })

      if (res.success) {
        showToast(res.message || 'Payout request submitted successfully!', 'success')
        setShowWithdrawModal(false)
        setWithdrawAmount('')
        // Refresh data
        fetchData()
      } else {
        showToast(res.message || 'Failed to submit payout request', 'error')
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit payout request', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrefillDetails = () => {
    if (savedBankDetails) {
      setAccountName(savedBankDetails.accountName || '')
      setAccountNumber(savedBankDetails.accountNumber || '')
      setBankName(savedBankDetails.bankName || '')
      setIfscCode(savedBankDetails.ifscCode || '')
      setUpiId(savedBankDetails.upiId || '')
      showToast('Prefilled saved bank details', 'success')
    } else {
      showToast('No saved details found in profile', 'error')
    }
  }

  if (loading && page === 1 && commissions.length === 0) return <PageLoader />

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
            Commissions & Payouts
          </h1>
          <p className="text-secondary">Track your earnings and request bank payouts</p>
        </div>
        <button 
          className="btn btn-primary"
          style={{ background: 'var(--primary-blue)', color: '#fff' }}
          onClick={() => setShowWithdrawModal(true)}
          disabled={hasPendingPayout || summary.pendingBalance <= 0}
        >
          <Landmark size={16} />
          <span>Withdraw Balance</span>
        </button>
      </div>

      {/* Warning banner if pending payout */}
      {hasPendingPayout && (
        <div className="glass" style={{
          padding: '16px 20px',
          borderLeft: '4px solid var(--warning)',
          background: 'rgba(255, 214, 10, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderRadius: 8
        }}>
          <AlertCircle size={20} color="var(--warning)" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Pending Payout Request In Progress</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              You already have a payout request processing. You can request another payout once the current one is approved or rejected by the admin.
            </div>
          </div>
        </div>
      )}

      {/* Summary Row */}
      <div className="grid-3" style={{ gap: 24 }}>
        <div className="glass premium-gradient" style={{ padding: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(var(--bg-accent-rgb), 0.1)', color: 'var(--accent-lime)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div className="text-label" style={{ color: 'var(--text-tertiary)', fontSize: 10, marginBottom: 4 }}>Total Earned</div>
            <div className="text-headline-sm" style={{ fontWeight: 800 }}>₹{summary.totalEarned.toLocaleString()}</div>
          </div>
        </div>

        <div className="glass premium-gradient" style={{ padding: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(0, 122, 255, 0.1)', color: 'var(--primary-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="text-label" style={{ color: 'var(--text-tertiary)', fontSize: 10, marginBottom: 4 }}>Pending Balance</div>
            <div className="text-headline-sm" style={{ fontWeight: 800 }}>₹{summary.pendingBalance.toLocaleString()}</div>
          </div>
        </div>

        <div className="glass premium-gradient" style={{ padding: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(48, 209, 88, 0.1)', color: 'var(--success)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-label" style={{ color: 'var(--text-tertiary)', fontSize: 10, marginBottom: 4 }}>Paid Out</div>
            <div className="text-headline-sm" style={{ fontWeight: 800 }}>₹{summary.paidOut.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid var(--divider)', gap: 8 }}>
        <button
          onClick={() => setActiveTab('commissions')}
          style={{
            padding: '12px 20px',
            fontWeight: 600,
            fontSize: 14,
            borderBottom: activeTab === 'commissions' ? '2.5px solid var(--primary-blue)' : '2.5px solid transparent',
            color: activeTab === 'commissions' ? 'var(--text-primary)' : 'var(--text-secondary)',
            transition: 'all 0.2s'
          }}
        >
          Commission Logs
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          style={{
            padding: '12px 20px',
            fontWeight: 600,
            fontSize: 14,
            borderBottom: activeTab === 'payouts' ? '2.5px solid var(--primary-blue)' : '2.5px solid transparent',
            color: activeTab === 'payouts' ? 'var(--text-primary)' : 'var(--text-secondary)',
            transition: 'all 0.2s'
          }}
        >
          Payout History ({payoutRequests.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'commissions' ? (
        <div className="glass-solid" style={{ padding: 8, overflowX: 'auto' }}>
          {commissions.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <FileText size={40} style={{ marginBottom: 12 }} />
              <div>No commission entries recorded yet.</div>
            </div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subscription Amt</th>
                    <th>Rate</th>
                    <th>Commission Earned</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(c => (
                    <tr key={c._id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={14} className="text-secondary" />
                        <span>{new Date(c.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                      </td>
                      <td>₹{c.subscriptionAmount.toLocaleString()}</td>
                      <td>
                        <span className="chip chip-ghost" style={{ fontSize: 10, padding: '2px 6px' }}>{c.commissionRate}%</span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>+₹{c.commissionAmount.toFixed(2)}</td>
                      <td>
                        <span className={`chip ${c.status === 'paid' ? 'chip-success' : 'chip-ghost'}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Page {page} of {totalPages}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      className="btn btn-glass btn-sm btn-icon" 
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(p - 1, 1))}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      className="btn btn-glass btn-sm btn-icon" 
                      disabled={page === totalPages}
                      onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="glass-solid" style={{ padding: 8, overflowX: 'auto' }}>
          {payoutRequests.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <Landmark size={40} style={{ marginBottom: 12 }} />
              <div>No payout requests submitted yet.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Requested Date</th>
                  <th>Amount</th>
                  <th>Payout Method</th>
                  <th>Status</th>
                  <th>Admin Remarks</th>
                </tr>
              </thead>
              <tbody>
                {payoutRequests.map(r => (
                  <tr key={r._id}>
                    <td>{new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                    <td style={{ fontWeight: 700 }}>₹{r.amount.toLocaleString()}</td>
                    <td>
                      {r.bankDetails?.upiId ? (
                        <div style={{ fontSize: 13 }}>
                          <strong>UPI:</strong> <span className="text-secondary">{r.bankDetails.upiId}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, lineHeight: 1.3 }}>
                          <strong>Bank:</strong> {r.bankDetails?.bankName}<br/>
                          <span className="text-secondary">A/C: {r.bankDetails?.accountNumber}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`chip ${
                        r.status === 'approved' ? 'chip-success' : 
                        r.status === 'rejected' ? 'chip-error' : 'chip-ghost'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: r.adminRemark ? 'normal' : 'italic' }}>
                      {r.adminRemark || 'No remarks'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {showWithdrawModal && (
        <div className="modal-overlay" onClick={closeWithdrawModal}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>
                Request Payout
              </h3>
              <button className="btn-icon btn-glass" onClick={closeWithdrawModal}>&times;</button>
            </div>

            <form onSubmit={handleWithdrawSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Max amount info */}
              <div style={{
                background: 'var(--bg-primary)',
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--border-glass)',
                fontSize: 13,
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span className="text-secondary">Available Balance:</span>
                <strong style={{ color: 'var(--success)' }}>₹{summary.pendingBalance.toLocaleString()}</strong>
              </div>

              {/* Amount input */}
              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: 6, fontSize: 10 }}>Withdrawal Amount (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  placeholder="e.g. 5000"
                  className="input-field"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  max={summary.pendingBalance}
                  min={1}
                />
              </div>

              {/* Payout method choice */}
              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>Payout Method</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    type="button"
                    onClick={() => setPayoutMethod('bank')}
                    className={`btn btn-sm ${payoutMethod === 'bank' ? 'btn-blue' : 'btn-glass'}`}
                    style={{ flex: 1 }}
                  >
                    Bank Account
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPayoutMethod('upi')}
                    className={`btn btn-sm ${payoutMethod === 'upi' ? 'btn-blue' : 'btn-glass'}`}
                    style={{ flex: 1 }}
                  >
                    UPI ID
                  </button>
                </div>
              </div>

              {/* Saved pre-fill link */}
              {savedBankDetails && (
                <div style={{ textAlign: 'right' }}>
                  <button 
                    type="button" 
                    onClick={handlePrefillDetails}
                    style={{ fontSize: 12, color: 'var(--primary-blue)', fontWeight: 600 }}
                  >
                    Autofill Saved Payout Details
                  </button>
                </div>
              )}

              {/* Form Fields: Bank Transfer */}
              {payoutMethod === 'bank' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label className="text-label" style={{ display: 'block', marginBottom: 4, fontSize: 9 }}>Account Holder Name</label>
                    <input 
                      type="text" 
                      required={payoutMethod === 'bank'}
                      placeholder="Account holder name"
                      className="input-field"
                      value={accountName}
                      onChange={e => setAccountName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="text-label" style={{ display: 'block', marginBottom: 4, fontSize: 9 }}>Account Number</label>
                      <input 
                        type="text" 
                        required={payoutMethod === 'bank'}
                        placeholder="Account number"
                        className="input-field"
                        inputMode="numeric"
                        maxLength={18}
                        value={accountNumber}
                        onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 18))}
                      />
                    </div>
                    <div>
                      <label className="text-label" style={{ display: 'block', marginBottom: 4, fontSize: 9 }}>IFSC Code</label>
                      <input 
                        type="text" 
                        required={payoutMethod === 'bank'}
                        placeholder="IFSC code"
                        className="input-field"
                        maxLength={11}
                        value={ifscCode}
                        onChange={e => setIfscCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-label" style={{ display: 'block', marginBottom: 4, fontSize: 9 }}>Bank Name</label>
                    <input 
                      type="text" 
                      required={payoutMethod === 'bank'}
                      placeholder="Bank name"
                      className="input-field"
                      value={bankName}
                      onChange={e => setBankName(e.target.value.replace(/[^a-zA-Z\s&.]/g, ''))}
                    />
                  </div>
                </div>
              ) : (
                /* Form Fields: UPI */
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: 6, fontSize: 9 }}>UPI ID</label>
                  <input 
                    type="text" 
                    required={payoutMethod === 'upi'}
                    placeholder="e.g. name@upi"
                    className="input-field"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-glass"
                  style={{ flex: 1 }}
                  onClick={closeWithdrawModal}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-blue" 
                  style={{ flex: 1 }} 
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
