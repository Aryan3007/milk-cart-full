import React, { useState } from 'react';
import { sendSignupOtp, signupUser } from '../utils/api';

interface SignupModalProps {
  open: boolean;
  onClose: () => void;
  onSignupSuccess?: (user: any, tokens: any) => void;
}

const SignupModal: React.FC<SignupModalProps> = ({ open, onClose, onSignupSuccess }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSendOtp = async () => {
    setError('');
    setOtpError('');
    if (!form.phone) {
      setError('Please enter your phone number first');
      return;
    }
    setSending(true);
    try {
      // Pass both phone and name, even if name is not used by backend
      const res = await sendSignupOtp(form.phone, form.name);
      if (res.success) {
        setOtpSent(true);
      } else {
        setError(res.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Failed to send OTP');
    }
    setSending(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOtpError('');
    if (!form.name || !form.email || !form.phone) {
      setError('All fields are required');
      return;
    }
    if (!otpSent) {
      setError('Please send OTP to your phone number');
      return;
    }
    if (!enteredOtp) {
      setOtpError('Please enter the OTP');
      return;
    }
    setSubmitting(true);
    try {
      const res = await signupUser({ ...form, otp: enteredOtp });
      console.log('Signup response:', res); // Debug: log the full response
      if (res.success) {
        // Store tokens in localStorage for auto-login
        if (res.data && res.data.tokens) {
          localStorage.setItem('accessToken', res.data.tokens.accessToken);
          localStorage.setItem('refreshToken', res.data.tokens.refreshToken);
        }
        if (onSignupSuccess) {
          onSignupSuccess(res.data.user, res.data.tokens);
        }
        onClose();
      } else if (res.message && res.message.toLowerCase().includes('otp')) {
        setOtpError(res.message);
      } else {
        setError(res.message || 'Signup failed');
      }
    } catch (err) {
      setError('Signup failed');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-white"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">Sign Up</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Your Name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
            <div className="flex gap-2">
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="+919876543210"
                pattern="^\+?[1-9]\d{1,14}$"
                required
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sending || otpSent}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${otpSent ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {otpSent ? 'OTP Sent' : sending ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">Please enter your phone number in international format, e.g. +919876543210</div>
          </div>
          {otpSent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enter OTP</label>
              <input
                type="text"
                name="otp"
                value={enteredOtp}
                onChange={e => setEnteredOtp(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white tracking-widest text-center"
                placeholder="Enter OTP"
                maxLength={6}
                required
              />
              {otpError && <p className="text-red-500 text-sm mt-1">{otpError}</p>}
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-colors"
            disabled={submitting}
          >
            {submitting ? 'Signing Up...' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignupModal; 