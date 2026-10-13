import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  X,
  UploadSimple,
  CheckCircle,
  WarningCircle,
  Trash,
  ArrowsClockwise,
  Image as ImageIcon,
} from '@phosphor-icons/react';
import { PaymentSettings } from '../../types/index.js';

interface PaymentQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: PaymentSettings) => void;
}

export const PaymentQrModal: React.FC<PaymentQrModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [promptPayIdInput, setPromptPayIdInput] = useState('');
  const [accountNameInput, setAccountNameInput] = useState('');
  const [bankNameInput, setBankNameInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current payment settings on open
  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setSelectedFile(null);
      setPreviewUrl(null);
      setFeedback(null);
    }
  }, [isOpen]);

  // Clean up preview object URL on unmount or file change
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const loadSettings = async () => {
    setFetchingSettings(true);
    try {
      const res = await fetch('/api/settings/payment', {
        credentials: 'include',
      });
      if (res.ok) {
        const data: PaymentSettings = await res.json();
        setPaymentSettings(data);
        setPromptPayIdInput(data.promptPayId || '');
        setAccountNameInput(data.accountName || '');
        setBankNameInput(data.bankName || '');
      } else {
        setFeedback({
          type: 'error',
          message: 'Failed to load existing payment settings.',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Network error connecting to payment settings endpoint.',
      });
    } finally {
      setFetchingSettings(false);
    }
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    // Check size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: 'File is too large. Maximum allowed image size is 5MB.',
      });
      return;
    }

    setFeedback(null);
    setSelectedFile(file);
  };

  const handleSaveAndUpload = async () => {
    const cleanId = promptPayIdInput.trim();
    if (!cleanId) {
      setFeedback({
        type: 'error',
        message: 'PromptPay ID / Phone number is required (เบอร์พร้อมเพย์ หรือ เลขบัตรประชาชน).',
      });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      if (selectedFile) {
        // Upload image file with metadata via multipart form data
        const formData = new FormData();
        formData.append('qrImage', selectedFile);
        formData.append('promptPayId', cleanId);
        if (accountNameInput.trim()) formData.append('accountName', accountNameInput.trim());
        if (bankNameInput.trim()) formData.append('bankName', bankNameInput.trim());

        const res = await fetch('/api/settings/payment/upload-qr', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setPaymentSettings(data.settings);
          if (data.settings.promptPayId) setPromptPayIdInput(data.settings.promptPayId);
          if (data.settings.accountName) setAccountNameInput(data.settings.accountName);
          if (data.settings.bankName) setBankNameInput(data.settings.bankName);
          setSelectedFile(null);
          setFeedback({
            type: 'success',
            message: data.message || 'QR Code image uploaded and settings saved successfully!',
          });
          if (onSaved) onSaved(data.settings);
        } else {
          setFeedback({
            type: 'error',
            message: data.error || 'Failed to upload QR image file.',
          });
        }
      } else {
        // Update text details only
        const res = await fetch('/api/settings/payment', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            promptPayId: cleanId,
            accountName: accountNameInput.trim() || 'KanaShop Official',
            bankName: bankNameInput.trim() || 'PromptPay',
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setPaymentSettings(data.settings);
          setFeedback({
            type: 'success',
            message: 'Payment details updated successfully!',
          });
          if (onSaved) onSaved(data.settings);
        } else {
          setFeedback({
            type: 'error',
            message: data.error || 'Failed to save payment settings.',
          });
        }
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Connection error while saving payment settings: ' + (err.message || 'Unknown'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCustomImage = async () => {
    if (!window.confirm('Revert to automatic dynamic QR code? Customers will scan the auto-generated code for order amounts.')) {
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/settings/payment/qr-image', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentSettings(data.settings);
        setSelectedFile(null);
        setFeedback({
          type: 'success',
          message: 'Custom QR image removed. Default dynamic QR code generator restored.',
        });
        if (onSaved) onSaved(data.settings);
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to remove custom QR image.',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Network error removing custom QR image.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-surface border border-border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-token/10 text-accent-token">
              <QrCode size={22} weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-fg">
                Store Payment & PromptPay QR
              </h3>
              <p className="text-xs text-fg-muted">
                ตั้งค่าบัญชีรับเงินและรูป QR Code (อัปเดตได้ทันทีโดยไม่ต้องแก้โค้ด)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-danger/10 text-danger border border-danger/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle size={18} weight="bold" className="shrink-0" />
            ) : (
              <WarningCircle size={18} weight="bold" className="shrink-0" />
            )}
            <span className="leading-snug">{feedback.message}</span>
          </div>
        )}

        {/* Current Active QR Info Card */}
        <div className="p-3.5 rounded-xl bg-surface-muted border border-border">
          <div className="flex items-start gap-4">
            <div className="w-22 h-22 rounded-xl bg-surface border border-border overflow-hidden flex items-center justify-center shrink-0 relative shadow-2xs">
              {paymentSettings?.qrImageUrl ? (
                <img
                  src={paymentSettings.qrImageUrl}
                  alt="Store Official QR"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-fg-muted text-[10px] text-center p-1">
                  <QrCode size={30} className="text-accent-token" />
                  <span className="mt-1 font-medium">Dynamic Auto-QR</span>
                </div>
              )}
            </div>

            <div className="flex-1 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">
                  Active Payment Method
                </span>
                {paymentSettings?.qrImageUrl && (
                  <button
                    onClick={handleRemoveCustomImage}
                    disabled={loading}
                    type="button"
                    className="text-[11px] text-danger hover:underline flex items-center gap-1 cursor-pointer"
                    title="Remove custom uploaded QR"
                  >
                    <Trash size={12} />
                    <span>Reset to Dynamic</span>
                  </button>
                )}
              </div>

              <p className="text-fg font-semibold">
                PromptPay ID:{' '}
                <span className="font-mono text-accent-token font-bold text-sm">
                  {fetchingSettings ? 'Loading...' : paymentSettings?.promptPayId || 'Not set'}
                </span>
              </p>
              <p className="text-fg-muted">
                <strong>Account:</strong> {paymentSettings?.accountName || 'KanaShop Official'}
              </p>
              <p className="text-fg-muted">
                <strong>Bank/Channel:</strong> {paymentSettings?.bankName || 'PromptPay'}
              </p>

              {paymentSettings?.qrImageUrl && (
                <a
                  href={paymentSettings.qrImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-accent-token underline inline-block pt-0.5"
                >
                  View full image ↗
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Upload QR Image Section */}
        <div className="space-y-3 text-xs border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <label className="font-bold text-fg flex items-center gap-1.5">
              <ImageIcon size={16} className="text-accent-token" />
              <span>Upload Store QR Code Image (อัปโหลดรูป QR Code ร้านค้า):</span>
            </label>
            {selectedFile && (
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-[11px] text-fg-muted hover:text-danger cursor-pointer"
              >
                Clear selection
              </button>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            className="hidden"
          />

          {/* Drag & Drop / Click Zone */}
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileSelect(e.dataTransfer.files?.[0] || null);
              }}
              className="p-5 border-2 border-dashed border-border hover:border-accent-token rounded-2xl bg-surface-muted/50 hover:bg-surface-muted transition-all text-center cursor-pointer space-y-2 group"
            >
              <div className="w-10 h-10 rounded-full bg-accent-token/10 text-accent-token flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                <UploadSimple size={20} weight="bold" />
              </div>
              <p className="text-xs font-semibold text-fg">
                Click or drag & drop QR Code image here
              </p>
              <p className="text-[11px] text-fg-muted">
                Supports PNG, JPG, JPEG, or WEBP up to 5MB. System automatically crops only the QR code portion from your image.
              </p>
            </div>
          ) : (
            /* Selected File Preview Box */
            <div className="p-3.5 rounded-xl bg-header/10 border border-header/20 flex items-center gap-3.5">
              {previewUrl && (
                <div className="w-16 h-16 rounded-lg bg-surface border border-border overflow-hidden shrink-0">
                  <img
                    src={previewUrl}
                    alt="Selected QR Preview"
                    className="w-full h-full object-contain p-0.5"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-fg truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-fg-muted">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Ready to upload & decode
                </p>
                <p className="text-[10px] text-accent-token mt-0.5">
                  Clicking "Save & Apply Settings" below will upload this file and link it to your store.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-1 px-2.5 rounded-lg border border-border text-[11px] text-fg hover:bg-surface cursor-pointer shrink-0"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Editable Account Details */}
        <div className="space-y-3 text-xs border-t border-border pt-4">
          <h4 className="font-bold text-fg">PromptPay Account Details:</h4>

          <div>
            <label className="block font-medium text-fg mb-1">
              PromptPay ID / Phone Number (เบอร์พร้อมเพย์ หรือ เลขบัตรประชาชน) <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 0812345678 or 1100123456789"
              value={promptPayIdInput}
              onChange={(e) => setPromptPayIdInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-fg text-xs focus:outline-hidden focus:border-accent-token font-mono shadow-2xs"
            />
            <p className="text-[10px] text-fg-muted mt-1">
              Used to generate dynamic QR codes and auto-decoded when uploading an official PromptPay QR image.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-fg mb-1">
                Store Account Name (ชื่อบัญชีร้านค้า)
              </label>
              <input
                type="text"
                placeholder="e.g. KanaShop Official"
                value={accountNameInput}
                onChange={(e) => setAccountNameInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-fg text-xs focus:outline-hidden focus:border-accent-token shadow-2xs"
              />
            </div>
            <div>
              <label className="block font-medium text-fg mb-1">
                Bank / Channel (ชื่อธนาคาร)
              </label>
              <input
                type="text"
                placeholder="e.g. PromptPay / Kasikorn Bank"
                value={bankNameInput}
                onChange={(e) => setBankNameInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-fg text-xs focus:outline-hidden focus:border-accent-token shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={loading}
            type="button"
            className="py-2.5 px-4 rounded-xl border border-border text-xs text-fg-muted hover:text-fg font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndUpload}
            disabled={loading}
            type="button"
            className="py-2.5 px-5 rounded-xl bg-accent-token text-on-accent text-xs font-bold hover:opacity-95 cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <ArrowsClockwise size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} weight="bold" />
            )}
            <span>
              {loading
                ? selectedFile
                  ? 'Uploading & Decoding QR...'
                  : 'Saving...'
                : selectedFile
                ? 'Upload QR & Save Settings'
                : 'Save Payment Settings'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
