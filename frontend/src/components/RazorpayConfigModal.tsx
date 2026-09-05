import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Cpu } from 'lucide-react';
import { Button } from './ui/Button';
import { apiClient } from '../api';
import { RazorpayConfigResponse } from '../types';

interface RazorpayConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: (config: RazorpayConfigResponse) => void;
}

export const RazorpayConfigModal: React.FC<RazorpayConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [config, setConfig] = useState<RazorpayConfigResponse | null>(null);
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const res = await apiClient.getRazorpayConfig();
      setConfig(res);
      setStatusMessage(null);
    } catch (err) {
      console.error('Failed to load Razorpay config:', err);
    }
  };

  const handleSaveRealKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyId.trim() || !keySecret.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please provide both Razorpay Key ID (starting with rzp_test_) and Key Secret.',
      });
      return;
    }

    if (!keyId.trim().startsWith('rzp_test_')) {
      setStatusMessage({
        type: 'error',
        text: 'Key ID must be a Razorpay Test Key starting with "rzp_test_". Live production keys are disallowed.',
      });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    try {
      const updated = await apiClient.updateRazorpayConfig({
        key_id: keyId.trim(),
        key_secret: keySecret.trim(),
        mock_mode: false,
      });
      setConfig(updated);
      onConfigUpdated?.(updated);
      if (updated.is_live_test_api) {
        setStatusMessage({
          type: 'success',
          text: 'Connected successfully to Razorpay Test API! Approved purchases will now mint genuine test orders on Razorpay.',
        });
        setKeySecret('');
      } else {
        setStatusMessage({
          type: 'error',
          text: updated.message || 'API key validation failed. Check your credentials in the Razorpay Dashboard.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to connect to Razorpay. Check network connection.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseMockSandbox = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const updated = await apiClient.updateRazorpayConfig({
        key_id: 'rzp_test_mock_sandbox',
        key_secret: 'mock_secret_key',
        mock_mode: true,
      });
      setConfig(updated);
      onConfigUpdated?.(updated);
      setKeyId('');
      setKeySecret('');
      setStatusMessage({
        type: 'info',
        text: 'Active in simulated test sandbox mode. Synthetic order_... entities are generated locally with zero latency.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Failed to reset to sandbox mode.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isLiveTest = config?.is_live_test_api && !config?.mock_mode;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-card border border-border rounded-lg w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-md bg-accent/15 text-accent border border-accent/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-lg text-foreground">
                Razorpay API &amp; Test Sandbox Settings
              </h3>
              <p className="text-xs text-muted-foreground font-sans">
                Configure live Razorpay Test API keys or toggle the zero-setup sandbox
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs font-sans">
          {/* Active Status Badge */}
          <div className={`p-4 rounded-lg border flex items-start gap-3 ${
            isLiveTest
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900'
              : 'bg-accent/10 border-accent/25 text-foreground'
          }`}>
            {isLiveTest ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Cpu className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  {isLiveTest ? 'Connected to Real Razorpay Test API' : 'Active Simulated Test Sandbox'}
                </span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded uppercase font-semibold ${
                  isLiveTest ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground border border-border'
                }`}>
                  {isLiveTest ? 'Live Test Mode' : 'Sandbox Mock'}
                </span>
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                {isLiveTest
                  ? `Active Test Key: ${config?.key_id_masked}. Approved transactions dispatch directly to Razorpay's test servers and mint real order IDs.`
                  : 'Operating locally using MandateSentinel\'s sub-10ms mock order engine. No API keys required.'}
              </p>
            </div>
          </div>

          {/* Feedback Message */}
          {statusMessage && (
            <div className={`p-3 rounded-md border text-xs flex items-start gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900'
                : statusMessage.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-900'
                : 'bg-muted border-border text-foreground'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Form for Real Keys */}
          <form onSubmit={handleSaveRealKeys} className="space-y-4 border-t border-border pt-4">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent font-semibold block mb-1">
                Use Your Razorpay Test Keys
              </span>
              <p className="text-xs text-muted-foreground">
                Enter your test credentials from Razorpay Dashboard &rarr; Settings &rarr; API Keys.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-mono text-[11px] text-foreground mb-1">
                  Razorpay Key ID (<code className="text-accent">rzp_test_...</code>)
                </label>
                <input
                  type="text"
                  placeholder="rzp_test_xxxxxxxxxxxxxxxx"
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-card border border-border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] text-foreground mb-1">
                  Razorpay Key Secret
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••"
                  value={keySecret}
                  onChange={(e) => setKeySecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-card border border-border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseMockSandbox}
                disabled={isSaving}
              >
                Reset to Mock Sandbox
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    <span>Connect Test Keys</span>
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Security Guarantee Note */}
          <div className="bg-muted/40 p-3 rounded-md border border-border/80 text-[11px] text-muted-foreground space-y-1">
            <span className="font-semibold text-foreground block">Enterprise Security Guarantee</span>
            <p>
              MandateSentinel only accepts test keys (<code className="text-accent">rzp_test_...</code>). Live production keys (<code className="text-rose-700">rzp_live_...</code>) are strictly rejected by policy to safeguard real balances. Keys are never committed to repositories.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
