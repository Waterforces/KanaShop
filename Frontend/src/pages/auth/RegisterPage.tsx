import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Envelope,
  Phone,
  IdentificationCard,
  Lock,
  Camera,
  WarningCircle,
  UploadSimple,
  X,
  Check,
  Sparkle,
} from '@phosphor-icons/react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [thaiId, setThaiId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile photo file and preview
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto format Thai ID as X-XXXX-XXXXX-XX-X
  const handleThaiIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 13);
    let formatted = raw;
    if (raw.length > 1) formatted = `${raw.slice(0, 1)}-${raw.slice(1)}`;
    if (raw.length > 5) formatted = `${formatted.slice(0, 6)}-${raw.slice(5)}`;
    if (raw.length > 10) formatted = `${formatted.slice(0, 12)}-${raw.slice(10)}`;
    if (raw.length > 12) formatted = `${formatted.slice(0, 15)}-${raw.slice(12)}`;
    setThaiId(formatted);
  };

  const cleanThaiIdDigits = thaiId.replace(/[^0-9]/g, '');

  const calculateThaiIdChecksum = (digits12: string): number => {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits12.charAt(i), 10) * (13 - i);
    }
    return (11 - (sum % 11)) % 10;
  };

  const getThaiIdStatus = () => {
    if (cleanThaiIdDigits.length === 0) return null;
    if (cleanThaiIdDigits.length < 13) {
      return {
        type: 'pending',
        message: `${13 - cleanThaiIdDigits.length} more digits needed`,
      };
    }
    const expected = calculateThaiIdChecksum(cleanThaiIdDigits.slice(0, 12));
    const actual = parseInt(cleanThaiIdDigits.charAt(12), 10);
    if (expected === actual) {
      return {
        type: 'valid',
        message: 'Valid Thai National ID checksum',
      };
    } else {
      return {
        type: 'invalid',
        message: `Checksum failed (expected last digit ${expected}, but got ${actual})`,
      };
    }
  };

  const handleFillTestId = () => {
    const validTestIds = [
      '1100702345676',
      '1234567890121',
      '1999999999999',
      '3100600123450',
    ];
    const pick = validTestIds[Math.floor(Math.random() * validTestIds.length)];
    const formatted = `${pick.slice(0, 1)}-${pick.slice(1, 5)}-${pick.slice(5, 10)}-${pick.slice(10, 12)}-${pick.slice(12)}`;
    setThaiId(formatted);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, WEBP, or GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be smaller than 5MB.');
      return;
    }

    setError(null);
    setPhotoFile(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    const cleanId = thaiId.replace(/[^0-9]/g, '');
    if (cleanId.length > 0) {
      if (cleanId.length !== 13) {
        setError('Thai National ID must contain exactly 13 digits if provided.');
        return;
      }

      const expectedLastDigit = calculateThaiIdChecksum(cleanId.slice(0, 12));
      const actualLastDigit = parseInt(cleanId.charAt(12), 10);
      if (expectedLastDigit !== actualLastDigit) {
        setError(
          `Thai National ID failed Modulo-11 checksum validation (expected last digit ${expectedLastDigit}, but got ${actualLastDigit}). Click "Use Valid Test ID" above to auto-fill a test number.`
        );
        return;
      }
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('thaiId', cleanId);
      formData.append('username', username);
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);

      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      // Redirect to Login page as specified in requirements
      navigate('/login?registered=1');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const thaiIdStatus = getThaiIdStatus();

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl bg-surface border border-border p-6 sm:p-10 shadow-xl space-y-6">
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-heading text-2xl font-bold text-fg mb-2"
          >
            <div className="w-8 h-8 rounded-lg bg-header-active border border-header flex items-center justify-center text-header">
              K
            </div>
            <span>KanaShop</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-fg">
            Create Customer Account
          </h1>
          <p className="text-xs text-fg-muted mt-1">
            Fill out the details below to join KanaShop. Data will be safely stored in Data_account.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2"
          >
            <WarningCircle size={18} weight="bold" className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-fg mb-1">
                Full Name *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Somchai Jaidee"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-fg mb-1">
                Email Address *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
                  <Envelope size={18} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="somchai@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-fg mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
                  <Phone size={18} />
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="081-234-5678"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
                />
              </div>
            </div>

            {/* Thai ID Card Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-fg">
                  Thai ID Card Number <span className="text-[10px] font-normal text-fg-muted">(Optional / ไม่บังคับ)</span>
                </label>
                <button
                  type="button"
                  onClick={handleFillTestId}
                  className="text-[10px] font-bold text-header hover:opacity-80 flex items-center gap-1 cursor-pointer bg-header-active px-2 py-0.5 rounded-md border border-header transition-opacity"
                  title="Generate a mathematically valid 13-digit test ID"
                >
                  <Sparkle size={12} weight="fill" />
                  <span>Use Valid Test ID</span>
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
                  <IdentificationCard size={18} />
                </span>
                <input
                  type="text"
                  value={thaiId}
                  onChange={handleThaiIdChange}
                  placeholder="1-1037-01234-56-8"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-surface-muted text-xs text-fg font-mono focus:outline-none focus:ring-2 ${
                    thaiIdStatus?.type === 'valid'
                      ? 'border-success focus:ring-success'
                      : thaiIdStatus?.type === 'invalid'
                      ? 'border-danger focus:ring-danger'
                      : 'border-border focus:ring-accent-token'
                  }`}
                />
              </div>
              <p className="mt-1 text-[10px] text-fg-muted">🔒 ข้อมูลบัตรประชาชน (ถ้ามี) จะถูกเข้ารหัส AES-256 เพื่อความปลอดภัยตามมาตรฐาน PDPA</p>

              {/* Real-time checksum feedback */}
              {thaiIdStatus && (
                <div className="mt-1 flex items-center gap-1 text-[11px]">
                  {thaiIdStatus.type === 'valid' ? (
                    <span className="text-success flex items-center gap-1 font-medium">
                      <Check size={12} weight="bold" />
                      <span>{thaiIdStatus.message}</span>
                    </span>
                  ) : thaiIdStatus.type === 'invalid' ? (
                    <span className="text-danger flex items-center gap-1 font-medium">
                      <WarningCircle size={12} weight="bold" />
                      <span>{thaiIdStatus.message}</span>
                    </span>
                  ) : (
                    <span className="text-fg-muted">{thaiIdStatus.message}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Profile Photo File Upload */}
          <div>
            <label className="block text-xs font-semibold text-fg mb-1.5">
              Profile Photo <span className="text-[10px] font-normal text-fg-muted">(File only, optional)</span>
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border border-dashed border-border bg-surface-muted/40 hover:bg-surface-muted/60 transition-colors">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-surface flex items-center justify-center shadow-xs">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-fg-muted">
                      <Camera size={26} weight="duotone" />
                    </div>
                  )}
                </div>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-1 -right-1 p-1 rounded-full bg-danger text-white hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
                    title="Remove photo"
                  >
                    <X size={12} weight="bold" />
                  </button>
                )}
              </div>

              {/* Upload Controls & Info */}
              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                    id="avatar-file-upload"
                  />
                  <label
                    htmlFor="avatar-file-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border hover:border-accent-token text-fg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  >
                    <UploadSimple size={15} weight="bold" />
                    <span>{photoFile ? 'Change Photo File' : 'Upload Photo File'}</span>
                  </label>
                  {photoFile && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-fg-muted truncate max-w-[180px]">
                        {photoFile.name} ({(photoFile.size / 1024).toFixed(0)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="text-[11px] text-danger hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-fg-muted">
                  Upload an image from your device. Supported: JPG, PNG, WEBP, GIF (Max 5MB).
                </p>
              </div>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-fg mb-1">
              Username *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="somchai99"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-surface-muted text-xs text-fg font-mono focus:outline-none focus:ring-2 focus:ring-accent-token"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-fg mb-1">
                Password *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-fg mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-primary-token text-on-primary font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>

        <div className="text-center pt-2 border-t border-border text-xs text-fg-muted">
          <span>Already have an account? </span>
          <Link to="/login" className="font-bold text-accent-token hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};
