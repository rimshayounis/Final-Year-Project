'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function getStrength(pwd: string) {
  const checks = {
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    digit: /[0-9]/.test(pwd),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    length: pwd.length >= 8,
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score };
}

const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const { checks, score } = getStrength(form.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[0-9]/.test(form.password)) { setError('Password must contain at least one digit.'); return; }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password)) { setError('Password must contain at least one special character.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: form.fullName, username: form.username, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (res.status === 409) { setError('Username or email already exists. Try logging in.'); return; }
      if (!res.ok) { setError(data.message || 'Registration failed.'); return; }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Cannot connect to server. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }

        .page {
          display: flex; min-height: 100vh;
          font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif;
        }

        /* ─── LEFT PANEL ─── */
        .left {
          flex: 0 0 400px;
          background: #1A1E52;
          position: relative; overflow: hidden;
          display: flex; flex-direction: column;
          justify-content: space-between;
          padding: 48px 44px;
        }

        .grid-bg {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(129,140,248,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(129,140,248,0.07) 1px, transparent 1px);
          background-size: 44px 44px;
          pointer-events: none;
        }
        .orb {
          position: absolute; border-radius: 50%;
          filter: blur(80px); pointer-events: none;
        }
        .orb1 { width: 400px; height: 400px; background: rgba(107,127,237,0.3); top: -150px; right: -120px; }
        .orb2 { width: 280px; height: 280px; background: rgba(139,92,246,0.2); bottom: -60px; left: -60px; }
        .ring {
          position: absolute; border-radius: 50%;
          border: 1px solid rgba(165,180,252,0.1);
          pointer-events: none;
        }
        .ring1 { width: 280px; height: 280px; top: -50px; right: 30px; }
        .ring2 { width: 440px; height: 440px; top: -140px; right: -80px; }

        .left-inner { position: relative; z-index: 2; display: flex; flex-direction: column; height: 100%; justify-content: space-between; }

        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-mark {
          width: 42px; height: 42px;
          background: rgba(165,180,252,0.15);
          border: 1px solid rgba(165,180,252,0.3);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800; color: #c7d2fe;
        }
        .brand-name { font-size: 20px; font-weight: 700; color: #e0e7ff; }
        .brand-name span { color: #a5b4fc; }

        .hero-copy h2 {
          font-size: 38px; font-weight: 800; color: #e0e7ff;
          line-height: 1.1; letter-spacing: -1.5px; margin-bottom: 16px;
        }
        .hero-copy h2 em {
          font-style: normal;
          background: linear-gradient(135deg, #a5b4fc, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-copy p { font-size: 14px; color: rgba(199,210,254,0.55); line-height: 1.7; max-width: 300px; }

        .steps { display: flex; flex-direction: column; gap: 0; }
        .step-item {
          display: flex; align-items: flex-start; gap: 14px;
          position: relative;
        }
        .step-item:not(:last-child)::after {
          content: '';
          position: absolute; left: 15px; top: 36px;
          width: 1px; height: 28px;
          background: rgba(165,180,252,0.2);
        }
        .step-num {
          width: 30px; height: 30px; border-radius: 50%;
          border: 1.5px solid rgba(165,180,252,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: rgba(165,180,252,0.5);
          flex-shrink: 0; margin-top: 4px;
          background: rgba(165,180,252,0.05);
        }
        .step-num.active {
          border-color: #a5b4fc; color: #a5b4fc;
          background: rgba(165,180,252,0.12);
        }
        .step-text { padding: 4px 0 20px; }
        .step-label { font-size: 13px; font-weight: 600; color: rgba(199,210,254,0.5); }
        .step-label.active { color: #c7d2fe; }
        .step-desc { font-size: 11px; color: rgba(165,180,252,0.35); margin-top: 2px; }

        /* ─── RIGHT PANEL ─── */
        .right {
          flex: 1;
          background: #f5f5fa;
          display: flex; align-items: center; justify-content: center;
          padding: 48px 60px;
          position: relative;
        }
        .right::before {
          content: '';
          position: absolute; left: 0; top: 10%; bottom: 10%;
          width: 1px;
          background: linear-gradient(to bottom, transparent, rgba(107,127,237,0.2), transparent);
        }

        .form-wrap { width: 100%; max-width: 480px; }

        /* Success state */
        .success-wrap { text-align: center; padding: 40px 0; }
        .success-circle {
          width: 80px; height: 80px; border-radius: 50%;
          background: linear-gradient(135deg, #2D3680, #5063C8);
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; margin: 0 auto 24px;
          box-shadow: 0 0 0 12px rgba(107,127,237,0.1), 0 0 0 24px rgba(107,127,237,0.05);
        }
        .success-wrap h3 { font-size: 26px; font-weight: 800; color: #1A1E52; letter-spacing: -0.5px; margin-bottom: 10px; }
        .success-wrap p { font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 28px; }
        .progress-track { height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden; }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #2D3680, #6B7FED);
          border-radius: 2px;
          animation: prog 3s linear forwards;
        }
        @keyframes prog { from { width: 0; } to { width: 100%; } }

        .form-top { margin-bottom: 32px; }
        .form-top h2 { font-size: 28px; font-weight: 800; color: #1A1E52; letter-spacing: -0.8px; margin-bottom: 8px; }
        .form-top p { font-size: 14px; color: #6b7280; }

        /* error */
        .err-box {
          background: #fff1f2; border: 1px solid #fecdd3;
          border-radius: 12px; padding: 14px 16px;
          margin-bottom: 22px;
          display: flex; gap: 12px; align-items: flex-start;
        }
        .err-icon { font-size: 18px; flex-shrink: 0; }
        .err-title { font-size: 13px; font-weight: 700; color: #e11d48; margin-bottom: 3px; }
        .err-msg { font-size: 12px; color: #be123c; line-height: 1.5; }
        .err-cta { display: inline-block; margin-top: 6px; font-size: 12px; font-weight: 700; color: #5063C8; text-decoration: none; border-bottom: 1px solid rgba(67,56,202,0.3); }

        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .field { margin-bottom: 18px; }
        .field label {
          display: block; font-size: 11px; font-weight: 700;
          color: #374151; margin-bottom: 7px;
          letter-spacing: 0.5px; text-transform: uppercase;
        }
        .inp-wrap { position: relative; }
        .inp-wrap .left-icon {
          position: absolute; left: 13px; top: 50%;
          transform: translateY(-50%); color: #9ca3af; pointer-events: none;
          display: flex; align-items: center;
        }
        .inp-wrap input {
          width: 100%; padding: 12px 42px 12px 40px;
          background: #fff; border: 1.5px solid #e5e7eb;
          border-radius: 12px; font-size: 14px;
          font-family: inherit; color: #111827; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .inp-wrap input::placeholder { color: #d1d5db; }
        .inp-wrap input:focus {
          border-color: #6B7FED;
          box-shadow: 0 0 0 4px rgba(107,127,237,0.1);
        }
        .inp-wrap.no-icon input { padding-left: 14px; }

        /* eye toggle */
        .eye-btn {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #9ca3af; display: flex; align-items: center;
          padding: 2px; border-radius: 4px;
          transition: color 0.15s;
        }
        .eye-btn:hover { color: #6B7FED; }

        /* ─── Password strength ─── */
        .strength-wrap { margin-top: 10px; }
        .strength-bars {
          display: flex; gap: 5px; margin-bottom: 6px;
        }
        .strength-bar {
          flex: 1; height: 4px; border-radius: 2px;
          background: #e5e7eb;
          transition: background 0.3s;
        }
        .strength-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 8px;
        }
        .strength-label { font-size: 11px; font-weight: 700; }
        .strength-checks {
          display: flex; flex-wrap: wrap; gap: 6px;
        }
        .chk {
          display: flex; align-items: center; gap: 4px;
          font-size: 11px; color: #9ca3af;
          transition: color 0.2s;
        }
        .chk.ok { color: #16a34a; }
        .chk-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #d1d5db; flex-shrink: 0;
          transition: background 0.2s;
        }
        .chk.ok .chk-dot { background: #16a34a; }

        .btn {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #2D3680 0%, #5063C8 40%, #6B7FED 100%);
          border: none; border-radius: 12px;
          color: #fff; font-family: inherit;
          font-size: 15px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity 0.2s, transform 0.15s;
          position: relative; overflow: hidden;
          margin-top: 8px;
        }
        .btn::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%);
        }
        .btn:hover { opacity: 0.93; transform: translateY(-1px); }
        .btn:active { transform: scale(0.98); }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .spinner {
          width: 17px; height: 17px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .bottom-row { text-align: center; margin-top: 22px; font-size: 13px; color: #6b7280; }
        .bottom-row a { color: #5063C8; font-weight: 700; text-decoration: none; }
        .bottom-row a:hover { text-decoration: underline; }

        .terms { text-align: center; margin-top: 14px; font-size: 11px; color: #9ca3af; line-height: 1.6; }

        @media (max-width: 900px) {
          .left { display: none; }
          .right { padding: 40px 28px; }
          .grid2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="page">
        {/* LEFT */}
        <div className="left">
          <div className="grid-bg" />
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="ring ring1" />
          <div className="ring ring2" />

          <div className="left-inner">
            <div className="brand">
              <div className="brand-mark">TH</div>
              <div className="brand-name">TruHeal<span>Link</span></div>
            </div>

            <div className="hero-copy">
              <h2>Join the<br /><em>Admin</em><br />Network.</h2>
              <p>Create your admin account and start managing the TruHeal Link platform today.</p>
            </div>

            <div className="steps">
              {[
                { label: 'Personal Info', desc: 'Your name and username', active: true },
                { label: 'Account Setup', desc: 'Email and password', active: true },
                { label: 'Access Granted', desc: "You're in", active: false },
              ].map((s, i) => (
                <div className="step-item" key={i}>
                  <div className={`step-num ${s.active ? 'active' : ''}`}>{i + 1}</div>
                  <div className="step-text">
                    <div className={`step-label ${s.active ? 'active' : ''}`}>{s.label}</div>
                    <div className="step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="right">
          <div className="form-wrap">
            {success ? (
              <div className="success-wrap">
                <div className="success-circle">🎉</div>
                <h3>Account Created!</h3>
                <p>Your admin account has been set up successfully.<br />Redirecting you to the login page...</p>
                <div className="progress-track">
                  <div className="progress-fill" />
                </div>
              </div>
            ) : (
              <>
                <div className="form-top">
                  <h2>Create Admin Account</h2>
                  <p>Fill in your details to get access to the TruHeal admin panel.</p>
                </div>

                {error && (
                  <div className="err-box">
                    <span className="err-icon">⚠️</span>
                    <div>
                      <div className="err-title">Registration Failed</div>
                      <div className="err-msg">{error}</div>
                      {error.includes('logging in') && (
                        <Link href="/login" className="err-cta">Go to Login →</Link>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="grid2">
                    <div className="field">
                      <label>Full Name</label>
                      <div className="inp-wrap">
                        <span className="left-icon">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                          </svg>
                        </span>
                        <input name="fullName" type="text" placeholder="Full name" value={form.fullName} onChange={handleChange} required />
                      </div>
                    </div>
                    <div className="field">
                      <label>Username</label>
                      <div className="inp-wrap">
                        <span className="left-icon">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                        </span>
                        <input name="username" type="text" placeholder="user_name" value={form.username} onChange={handleChange} required />
                      </div>
                    </div>
                  </div>

                  <div className="field">
                    <label>Email Address</label>
                    <div className="inp-wrap">
                      <span className="left-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                        </svg>
                      </span>
                      <input name="email" type="email" placeholder="admin@truheal.com" value={form.email} onChange={handleChange} required />
                    </div>
                  </div>

                  <div className="grid2">
                    <div className="field">
                      <label>Password</label>
                      <div className="inp-wrap">
                        <span className="left-icon">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                          </svg>
                        </span>
                        <input
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min. 8 chars"
                          value={form.password}
                          onChange={handleChange}
                          required
                        />
                        <button type="button" className="eye-btn" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                          <EyeIcon open={showPassword} />
                        </button>
                      </div>

                      {/* Strength meter */}
                      {form.password.length > 0 && (
                        <div className="strength-wrap">
                          <div className="strength-header">
                            <span className="strength-label" style={{ color: STRENGTH_COLORS[score] }}>
                              {STRENGTH_LABELS[score]}
                            </span>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{score}/5</span>
                          </div>
                          <div className="strength-bars">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div
                                key={i}
                                className="strength-bar"
                                style={{ background: i <= score ? STRENGTH_COLORS[score] : '#e5e7eb' }}
                              />
                            ))}
                          </div>
                          <div className="strength-checks">
                            {[
                              { key: 'upper', label: 'Uppercase' },
                              { key: 'lower', label: 'Lowercase' },
                              { key: 'digit', label: 'Digit' },
                              { key: 'special', label: 'Special char' },
                              { key: 'length', label: '8+ chars' },
                            ].map(({ key, label }) => (
                              <span key={key} className={`chk ${checks[key as keyof typeof checks] ? 'ok' : ''}`}>
                                <span className="chk-dot" />
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="field">
                      <label>Confirm Password</label>
                      <div className="inp-wrap">
                        <span className="left-icon">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          </svg>
                        </span>
                        <input
                          name="confirmPassword"
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="Repeat password"
                          value={form.confirmPassword}
                          onChange={handleChange}
                          required
                        />
                        <button type="button" className="eye-btn" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                          <EyeIcon open={showConfirm} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="btn" disabled={loading || score < 5 || !form.confirmPassword || form.password !== form.confirmPassword || !form.fullName.trim() || !form.username.trim() || !form.email.trim()}>
                    {loading ? <><span className="spinner" /> Creating account...</> : 'Create Admin Account →'}
                  </button>
                </form>

                <div className="bottom-row">
                  Already have an account? <Link href="/login">Sign in here</Link>
                </div>

                <div className="terms">
                  By creating an account, you confirm you are an authorized<br />TruHeal Link administrator.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
