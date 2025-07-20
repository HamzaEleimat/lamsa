/**
 * @file MFASetup.tsx
 * @description Multi-Factor Authentication setup component
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Copy, CheckCircle, AlertCircle } from 'lucide-react';

interface MFASetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface MFAData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export default function MFASetup({ onComplete, onCancel }: MFASetupProps) {
  const [step, setStep] = useState(1);
  const [mfaData, setMFAData] = useState<MFAData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const setupMFA = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/mfa/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setMFAData(data.data);
        setStep(2);
      } else {
        setError(data.error || 'Failed to setup MFA');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMFA = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/mfa/verify-setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationCode }),
      });

      const data = await response.json();

      if (data.success) {
        setStep(3);
      } else {
        setError(data.error || 'Invalid code. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'secret' | 'codes') => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <h2 className="text-2xl font-bold">Two-Factor Authentication Setup</h2>
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Introduction */}
          {step === 1 && (
            <div className="space-y-6">
              <p className="text-gray-600">
                Two-factor authentication adds an extra layer of security to your account. 
                You'll need an authenticator app on your phone.
              </p>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Recommended Apps:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Google Authenticator</li>
                  <li>Microsoft Authenticator</li>
                  <li>Authy</li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 p-4 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={setupMFA}
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Setting up...' : 'Continue'}
                </button>
                <button
                  onClick={onCancel}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step 2: QR Code and Verification */}
          {step === 2 && mfaData && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">
                  Scan this QR code with your authenticator app
                </h3>
                
                <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <img src={mfaData.qrCode} alt="MFA QR Code" className="w-48 h-48" />
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Or enter this code manually:</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="px-3 py-1 bg-gray-100 rounded font-mono text-sm">
                      {mfaData.secret}
                    </code>
                    <button
                      onClick={() => copyToClipboard(mfaData.secret, 'secret')}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {copiedSecret ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter the 6-digit code from your app:
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-center text-2xl font-mono"
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-50 p-4 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={verifyMFA}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify and Enable'}
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Backup Codes */}
          {step === 3 && mfaData && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Two-Factor Authentication Enabled!
                </h3>
                <p className="text-gray-600">
                  Your account is now protected with 2FA.
                </p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  Save Your Backup Codes
                </h4>
                <p className="text-sm text-gray-700 mb-4">
                  Store these codes safely. You can use them to access your account if you lose your authenticator device.
                </p>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {mfaData.backupCodes.map((code, index) => (
                    <code key={index} className="px-3 py-2 bg-white rounded font-mono text-sm">
                      {code}
                    </code>
                  ))}
                </div>

                <button
                  onClick={() => copyToClipboard(mfaData.backupCodes.join('\n'), 'codes')}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-yellow-600 text-yellow-700 rounded-lg hover:bg-yellow-50"
                >
                  {copiedCodes ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy All Codes</span>
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={onComplete}
                className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}