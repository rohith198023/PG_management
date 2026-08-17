'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  Lock,
  RefreshCw,
  Sliders,
  ArrowRight,
  ExternalLink,
  ShieldAlert
} from 'lucide-react'

interface GatewayInfo {
  name: 'razorpay' | 'phonepe' | 'cashfree' | 'stripe'
  title: string
  logoText: string
  color: string
  bgLight: string
  ringColor: string
  description: string
}

const GATEWAY_CATALOGUE: GatewayInfo[] = [
  {
    name: 'razorpay',
    title: 'Razorpay',
    logoText: 'RZP',
    color: 'text-blue-400',
    bgLight: 'bg-blue-500/10',
    ringColor: 'ring-blue-500/30',
    description: 'India\'s leading payment gateway supporting UPI, Cards, NetBanking, and AutoPay mandates.',
  },
  {
    name: 'phonepe',
    title: 'PhonePe PG',
    logoText: 'PPE',
    color: 'text-purple-400',
    bgLight: 'bg-purple-500/10',
    ringColor: 'ring-purple-500/30',
    description: 'Direct UPI Intent & PhonePe Business payment checkout integration.',
  },
  {
    name: 'cashfree',
    title: 'Cashfree Payments',
    logoText: 'CF',
    color: 'text-cyan-400',
    bgLight: 'bg-cyan-500/10',
    ringColor: 'ring-cyan-500/30',
    description: 'Instant UPI refunds, NACH recurring mandates, and custom checkout suites.',
  },
  {
    name: 'stripe',
    title: 'Stripe Global',
    logoText: 'STR',
    color: 'text-indigo-400',
    bgLight: 'bg-indigo-500/10',
    ringColor: 'ring-indigo-500/30',
    description: 'International card payments, multi-currency checkout, and subscription billing.',
  },
]

export default function GatewaySettingsPage() {
  const [configs, setConfigs] = useState<Record<string, any>>({})
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeGateway, setActiveGateway] = useState<GatewayInfo | null>(null)
  const [testingGateway, setTestingGateway] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, any>>({})

  // Form Modal States
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [merchantId, setMerchantId] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadGateways = async () => {
    setLoading(true)
    try {
      // Check auth role first
      const authRes = await fetch('/api/auth/me')
      const authData = await authRes.json()
      setUserRole(authData?.user?.role || null)

      const res = await fetch('/api/settings/gateways')
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, any> = {}
        data.configs?.forEach((c: any) => {
          map[c.gateway_name] = c
        })
        setConfigs(map)
      }
    } catch (err) {
      console.error('Failed to load gateways:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGateways()
  }, [])

  const handleTestConnection = async (gatewayName: string) => {
    setTestingGateway(gatewayName)
    try {
      const res = await fetch('/api/settings/gateways/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatewayName }),
      })
      const data = await res.json()
      setTestResult((prev) => ({ ...prev, [gatewayName]: data }))
    } catch (err: any) {
      setTestResult((prev) => ({ ...prev, [gatewayName]: { error: 'Connection test failed' } }))
    } finally {
      setTestingGateway(null)
    }
  }

  const handleOpenConfigure = (gw: GatewayInfo) => {
    setActiveGateway(gw)
    const existing = configs[gw.name]
    setApiKey(existing?.api_key || '')
    setApiSecret('')
    setMerchantId(existing?.merchant_id || '')
    setWebhookSecret('')
    setEnvironment('sandbox')
    setIsActive(existing ? existing.is_active : true)
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeGateway) return

    setSaving(true)
    try {
      const res = await fetch('/api/settings/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayName: activeGateway.name,
          apiKey,
          apiSecret,
          merchantId: merchantId || undefined,
          webhookSecret: webhookSecret || undefined,
          environment,
          isActive,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration')

      alert(`${activeGateway.title} settings saved successfully!`)
      setActiveGateway(null)
      loadGateways()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400 animate-pulse">Loading Payment Gateway configurations...</div>
  }

  // Enforce 403 Forbidden view if user is not WORKSPACE_ADMIN
  if (userRole && userRole !== 'WORKSPACE_ADMIN') {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-12 text-center max-w-2xl mx-auto my-12 backdrop-blur-xl">
        <ShieldAlert className="mx-auto h-16 w-16 text-rose-400" />
        <h2 className="mt-4 text-2xl font-bold text-white">403 Forbidden — Restricted Access</h2>
        <p className="mt-2 text-sm text-slate-300">
          Payment Gateway configuration is restricted exclusively to <strong>Workspace Owners & Admins</strong>.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Your current role (<strong>{userRole}</strong>) does not have sufficient privileges to modify workspace financial credentials.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            <span>Financial Settings</span>
            <span>•</span>
            <span>BYO Payment Gateways</span>
          </div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl mt-1">Payment Gateway Configuration</h1>
          <p className="mt-1 text-sm text-slate-400">
            Configure your own Payment Gateway credentials (BYO Key). Enabled gateways dynamically power tenant rent checkouts.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>AES-256 Secret Encryption</span>
        </div>
      </div>

      {/* Gateway Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {GATEWAY_CATALOGUE.map((gw) => {
          const config = configs[gw.name]
          const isConfigured = Boolean(config && config.raw_api_key_set)
          const isEnabled = Boolean(config && config.is_active)
          const test = testResult[gw.name]

          return (
            <div
              key={gw.name}
              className={`rounded-2xl border transition-all p-6 backdrop-blur-xl space-y-5 flex flex-col justify-between ${
                isEnabled && isConfigured
                  ? 'border-indigo-500/30 bg-slate-900/80 ring-1 ring-indigo-500/20'
                  : 'border-slate-800 bg-slate-900/40'
              }`}
            >
              <div className="space-y-4">
                {/* Header & Badges */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`h-12 w-12 rounded-xl ${gw.bgLight} ${gw.color} ${gw.ringColor} ring-1 flex items-center justify-center font-extrabold text-sm`}>
                      {gw.logoText}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {gw.title}
                      </h3>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {gw.name}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {isConfigured ? (
                      isEnabled ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400">
                          Disabled
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/20">
                        Configuration Missing
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{gw.description}</p>

                {/* Secret Key Mask Display */}
                {isConfigured && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>API Key:</span>
                      <span className="text-indigo-300 font-bold">{config.api_key}</span>
                    </div>
                    {config.merchant_id && (
                      <div className="flex justify-between text-slate-400">
                        <span>Merchant ID:</span>
                        <span className="text-slate-200">{config.merchant_id}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500 text-[10px] pt-1 border-t border-slate-800/60">
                      <span>Last Updated:</span>
                      <span>{new Date(config.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}

                {/* Connection Test Output */}
                {test && (
                  <div
                    className={`rounded-xl p-3 text-xs border ${
                      test.status === 'CONNECTED'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <p className="font-semibold">{test.message || test.error}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-4 border-t border-slate-800/60">
                <button
                  onClick={() => handleOpenConfigure(gw)}
                  className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-lg min-h-[44px]"
                >
                  <Sliders className="h-4 w-4" />
                  <span>{isConfigured ? 'Configure Credentials' : 'Setup Gateway'}</span>
                </button>

                {isConfigured && (
                  <button
                    disabled={testingGateway === gw.name}
                    onClick={() => handleTestConnection(gw.name)}
                    className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all min-h-[44px]"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${testingGateway === gw.name ? 'animate-spin' : ''}`} />
                    <span>{testingGateway === gw.name ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Configure Modal */}
      {activeGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <form
            onSubmit={handleSaveConfig}
            className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Configure {activeGateway.title}</h3>
                <p className="text-xs text-slate-400">Enter API keys provided by your gateway dashboard</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveGateway(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Environment Toggle */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Environment Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEnvironment('sandbox')}
                    className={`py-2 text-xs font-bold rounded-lg border ${
                      environment === 'sandbox'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    SANDBOX / TEST
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvironment('production')}
                    className={`py-2 text-xs font-bold rounded-lg border ${
                      environment === 'production'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    LIVE PRODUCTION
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">API Key / Publishable Key*</label>
                <input
                  type="text"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="e.g. rzp_test_123456789 or pk_live_..."
                  className="block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none font-mono"
                />
              </div>

              {/* API Secret Key */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">API Secret Key*</label>
                <input
                  type="password"
                  required
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter Gateway Secret Key (Encrypted AES-256)"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none font-mono"
                />
              </div>

              {/* Merchant ID */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Merchant ID (Optional)</label>
                <input
                  type="text"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  placeholder="e.g. MERCH_876543"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none font-mono"
                />
              </div>

              {/* Webhook Secret */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Webhook Signing Secret (Optional)</label>
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="e.g. whsec_..."
                  className="block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none font-mono"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-xs font-medium text-slate-300">Enable Gateway for Resident Rent Checkout</span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-12 h-6 rounded-full transition-all relative p-1 ${
                    isActive ? 'bg-indigo-600' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition-all ${
                      isActive ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setActiveGateway(null)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-all min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/25 min-h-[44px]"
              >
                {saving ? 'Encrypting & Saving...' : 'Save Configuration ✓'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
