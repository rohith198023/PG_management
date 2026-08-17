'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Upload, CheckCircle2, Clock, XCircle, ArrowLeft, ShieldCheck, Wallet, FileText, Download, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ResidentPaymentPortal() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [enabledGateways, setEnabledGateways] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>({ balance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<string>('razorpay');
  const [activeModal, setActiveModal] = useState<'NONE' | 'ONLINE' | 'PROOF' | 'RECEIPT'>('NONE');

  // Checkout Form State
  const [isPartial, setIsPartial] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Proof Upload Form State
  const [utrNumber, setUtrNumber] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [ocrPreview, setOcrPreview] = useState<any | null>(null);

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const invRes = await fetch('/api/tenant/invoices');
      const invData = await invRes.json();
      setInvoices(invData.invoices || []);

      const gwRes = await fetch('/api/settings/gateways');
      if (gwRes.ok) {
        const gwData = await gwRes.json();
        const activeList = gwData.configs?.filter((c: any) => c.is_active) || [];
        setEnabledGateways(activeList);
        if (activeList.length > 0) setSelectedGateway(activeList[0].gateway_name);
      }

      const walRes = await fetch('/api/finance/wallet');
      if (walRes.ok) {
        const walData = await walRes.json();
        if (walData.wallet) setWallet(walData.wallet);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOnlineCheckout = async () => {
    if (!selectedInvoice) return;
    setSubmitting(true);

    try {
      const dueAmount = Number(selectedInvoice.total_amount) - Number(selectedInvoice.amount_paid);
      const payAmount = isPartial && customAmount ? parseFloat(customAmount) : dueAmount;

      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          gatewayProvider: selectedGateway,
          customAmount: payAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');

      alert(`Payment of ₹${payAmount} Successful via ${selectedGateway.toUpperCase()}! Receipt Issued. 🎉`);
      setActiveModal('NONE');
      setSelectedInvoice(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !proofUrl) {
      alert('Please provide a payment proof screenshot URL.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/payments/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          proofImageUrl: proofUrl,
          utrNumber: utrNumber || undefined,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit proof');

      setOcrPreview(data.ocr);
      alert(data.message);
      setActiveModal('NONE');
      setSelectedInvoice(null);
      setProofUrl('');
      setUtrNumber('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReceipt = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/payments/receipt/${paymentId}`);
      const data = await res.json();
      if (data.receipt) {
        setReceiptData(data.receipt);
        setActiveModal('RECEIPT');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-16 text-slate-100">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/tenant/dashboard" className="flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Resident Portal</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white mt-1">Payment & Receipts Portal</h1>
          <p className="text-sm text-slate-400 mt-1">Pay monthly rent online via instant gateways, use resident wallet credits, or submit manual UPI payment receipts.</p>
        </div>

        {/* Resident Wallet Balance Card */}
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/40 p-4 flex items-center space-x-4 backdrop-blur-xl">
          <div className="rounded-xl bg-indigo-600/30 p-2.5 text-indigo-300">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-indigo-300 uppercase">Resident Wallet Balance</span>
            <p className="text-2xl font-black text-white">₹{wallet.balance?.toLocaleString('en-IN') || '0'}</p>
          </div>
        </div>
      </div>

      {/* Guided Payment Journey Steps */}
      <div className="grid grid-cols-4 gap-2 border border-slate-800 bg-slate-900/60 p-2 rounded-2xl text-xs font-semibold text-center">
        <div className="py-2 rounded-xl bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30">1. Select Invoice</div>
        <div className="py-2 text-slate-400">2. Choose Method</div>
        <div className="py-2 text-slate-400">3. Checkout / Scan</div>
        <div className="py-2 text-slate-400">4. Download Receipt</div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Your Outstanding Billed Invoices</h2>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Loading billed invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">All Dues Paid in Full!</h3>
            <p className="text-xs text-slate-400 mt-1">No pending rent invoices for your account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {invoices.map((inv) => {
              const dueAmount = Number(inv.total_amount) - Number(inv.amount_paid);
              const isPaid = inv.status === 'PAID';

              return (
                <div key={inv.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 hover:border-indigo-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">#{inv.invoice_number}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      isPaid ? 'bg-emerald-500/20 text-emerald-400' : inv.status === 'PARTIALLY_PAID' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {inv.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400">Total Billed: ₹{Number(inv.total_amount).toLocaleString('en-IN')}</span>
                    <p className="text-3xl font-black text-white mt-1">₹{dueAmount.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Due Date: {new Date(inv.due_date).toLocaleDateString()}</p>
                  </div>

                  {!isPaid && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setActiveModal('ONLINE');
                        }}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 transition-all flex items-center justify-center space-x-1"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Pay Online</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setActiveModal('PROOF');
                        }}
                        className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs py-2.5 transition-all flex items-center justify-center space-x-1"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Upload Proof</span>
                      </button>
                    </div>
                  )}

                  {/* Previous Payments & Receipt Button */}
                  {inv.payments && inv.payments.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      {inv.payments.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between text-xs text-slate-400">
                          <span>₹{p.amount} ({p.source})</span>
                          <button onClick={() => handleViewReceipt(p.id)} className="text-indigo-400 hover:underline flex items-center space-x-1">
                            <FileText className="h-3 w-3" />
                            <span>Receipt</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ONLINE PAYMENT CHECKOUT MODAL */}
      {activeModal === 'ONLINE' && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Online Gateway Checkout</h3>
                <p className="text-xs text-slate-400">Invoice #{selectedInvoice.invoice_number}</p>
              </div>
              <button onClick={() => setActiveModal('NONE')} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Select Gateway</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(enabledGateways.length > 0 ? enabledGateways : [{ gateway_name: 'razorpay' }, { gateway_name: 'stripe' }]).map((gw) => (
                    <button
                      key={gw.gateway_name}
                      onClick={() => setSelectedGateway(gw.gateway_name)}
                      className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${
                        selectedGateway === gw.gateway_name
                          ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {gw.gateway_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Partial Payment Toggle */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Pay Custom / Partial Amount?</span>
                  <input type="checkbox" checked={isPartial} onChange={(e) => setIsPartial(e.target.checked)} className="rounded bg-slate-900 border-slate-800 text-indigo-600" />
                </div>

                {isPartial && (
                  <input
                    type="number"
                    placeholder={`Enter amount (Max ₹${Number(selectedInvoice.total_amount) - Number(selectedInvoice.amount_paid)})`}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>

              <button
                onClick={handleOnlineCheckout}
                disabled={submitting}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3.5 transition-all shadow-lg shadow-indigo-600/30"
              >
                {submitting ? 'Processing Intent...' : `Proceed with ${selectedGateway.toUpperCase()} Checkout ✓`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL PROOF UPLOAD MODAL */}
      {activeModal === 'PROOF' && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Upload UPI Payment Receipt</h3>
              <button onClick={() => setActiveModal('NONE')} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitProof} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Proof Screenshot Image URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/receipt.jpg"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  required
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">12-Digit UPI UTR Number (Optional for OCR)</label>
                <input
                  type="text"
                  placeholder="420819203910"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="Paid via GooglePay"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3.5 transition-all shadow-lg shadow-emerald-600/30 mt-2"
              >
                {submitting ? 'Running OCR Scan...' : 'Submit Receipt for Auto-Verification ⚡'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT VIEW MODAL */}
      {activeModal === 'RECEIPT' && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-slate-950 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5" />
                <span>Payment Receipt</span>
              </div>
              <button onClick={() => setActiveModal('NONE')} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Receipt No:</span>
                <span className="font-bold text-white font-mono">{receiptData.receiptNumber}</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Tenant Name:</span>
                <span className="font-bold text-white">{receiptData.tenantName}</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Invoice Ref:</span>
                <span className="font-bold text-indigo-300">{receiptData.invoiceNumber}</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">₹{receiptData.amountPaid}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Transaction Ref:</span>
                <span className="font-mono text-slate-300">{receiptData.transactionRef}</span>
              </div>
            </div>

            <button
              onClick={() => alert(`Downloading PDF Receipt #${receiptData.receiptNumber}...`)}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 transition-all flex items-center justify-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download Official PDF Receipt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
