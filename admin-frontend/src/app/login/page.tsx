'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notRegistered, setNotRegistered] = useState(false);

  // Forgot password flow
  const [fpModal, setFpModal]       = useState(false);
  const [fpStep, setFpStep]         = useState<'email' | 'otp' | 'reset' | 'done'>('email');
  const [fpEmail, setFpEmail]       = useState('');
  const [fpOtp, setFpOtp]           = useState(['', '', '', '', '', '']);
  const [fpNewPw, setFpNewPw]       = useState('');
  const [fpConfPw, setFpConfPw]     = useState('');
  const [fpLoading, setFpLoading]   = useState(false);
  const [fpError, setFpError]       = useState('');
  const [fpShowPw, setFpShowPw]     = useState(false);
  const [fpShowConf, setFpShowConf] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotRegistered(false);
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 404) {
        setNotRegistered(true);
        setError("These credentials aren't registered. Please sign up first.");
        return;
      }
      if (!res.ok) { setError(data.message || 'Something went wrong.'); return; }
      localStorage.setItem('admin_token', data.access_token);
      localStorage.setItem('admin_user', JSON.stringify(data.admin));
      router.push('/dashboard');
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const openFp = () => {
    setFpModal(true);
    setFpStep('email');
    setFpEmail('');
    setFpOtp(['', '', '', '', '', '']);
    setFpNewPw('');
    setFpConfPw('');
    setFpError('');
  };

  const closeFp = () => {
    setFpModal(false);
    setFpStep('email');
    setFpError('');
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const iv = setInterval(() => {
      setResendTimer(p => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!fpEmail.trim()) { setFpError('Please enter your email address.'); return; }
    setFpLoading(true); setFpError('');
    try {
      const res = await fetch(`${API}/auth/admin/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setFpError(data.message || 'Email not found.'); return; }
      setFpStep('otp');
      startResendTimer();
    } catch {
      setFpError('Cannot connect to server.');
    } finally {
      setFpLoading(false);
    }
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...fpOtp];
    next[idx] = val.slice(-1);
    setFpOtp(next);
    if (val && idx < 5) {
      const el = document.getElementById(`otp-${idx + 1}`);
      el?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Backspace' && !fpOtp[idx] && idx > 0) {
      const el = document.getElementById(`otp-${idx - 1}`);
      el?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = fpOtp.join('');
    if (code.length < 6) { setFpError('Please enter the 6-digit OTP.'); return; }
    setFpLoading(true); setFpError('');
    try {
      const res = await fetch(`${API}/auth/admin/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) { setFpError(data.message || 'Invalid OTP.'); return; }
      setFpStep('reset');
    } catch {
      setFpError('Cannot connect to server.');
    } finally {
      setFpLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!fpNewPw || !fpConfPw) { setFpError('Please fill in both fields.'); return; }
    if (fpNewPw.length < 8)    { setFpError('Password must be at least 8 characters.'); return; }
    if (fpNewPw !== fpConfPw)  { setFpError('Passwords do not match.'); return; }
    setFpLoading(true); setFpError('');
    try {
      const res = await fetch(`${API}/auth/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail, otp: fpOtp.join(''), newPassword: fpNewPw }),
      });
      const data = await res.json();
      if (!res.ok) { setFpError(data.message || 'Reset failed.'); return; }
      setFpStep('done');
    } catch {
      setFpError('Cannot connect to server.');
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%}
        .page{display:flex;min-height:100vh;font-family:'Plus Jakarta Sans','Segoe UI',sans-serif}
        .left{flex:1.1;background:#13112e;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;padding:52px 60px}
        .dot-grid{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle,rgba(165,180,252,0.15) 1px,transparent 1px);background-size:32px 32px}
        .glow{position:absolute;border-radius:50%;filter:blur(100px);pointer-events:none}
        .g1{width:480px;height:480px;background:rgba(79,70,229,0.2);top:-160px;right:-100px}
        .g2{width:340px;height:340px;background:rgba(139,92,246,0.15);bottom:-90px;left:-70px}
        .g3{width:220px;height:220px;background:rgba(107,127,237,0.16);top:42%;left:38%;transform:translate(-50%,-50%)}
        .rings{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
        .ring{position:absolute;border-radius:50%;border:1px solid rgba(129,140,248,0.1)}
        .r1{width:600px;height:600px}.r2{width:440px;height:440px;border-color:rgba(129,140,248,0.13)}.r3{width:280px;height:280px;border-color:rgba(129,140,248,0.16)}.r4{width:140px;height:140px;border-color:rgba(129,140,248,0.2)}
        .cross-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:1}
        .ch{position:absolute;width:64px;height:18px;background:linear-gradient(90deg,transparent,rgba(129,140,248,0.3),transparent);border-radius:4px}
        .cv{position:absolute;width:18px;height:64px;background:linear-gradient(180deg,transparent,rgba(129,140,248,0.3),transparent);border-radius:4px}
        .dot{position:absolute;border-radius:50%;animation:pd 2.6s ease-in-out infinite}
        .d1{width:9px;height:9px;background:rgba(129,140,248,0.7);top:50%;left:50%;transform:translate(-50%,-50%);animation-delay:0s}
        .d2{width:7px;height:7px;background:rgba(196,181,253,0.5);top:calc(50% - 80px);left:calc(50% + 60px);animation-delay:.7s}
        .d3{width:6px;height:6px;background:rgba(167,139,250,0.4);top:calc(50% + 70px);left:calc(50% - 70px);animation-delay:1.4s}
        .d4{width:6px;height:6px;background:rgba(139,92,246,0.45);top:calc(50% - 55px);left:calc(50% - 90px);animation-delay:2.1s}
        @keyframes pd{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:1;transform:scale(1.7)}}
        .d1{animation-name:pd1}@keyframes pd1{0%,100%{opacity:.35;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.7)}}
        .hb{position:absolute;bottom:30%;left:50%;transform:translateX(-50%);width:280px;height:44px;z-index:2;pointer-events:none}
        .hb svg{width:100%;height:100%}
        .hb-line{stroke-dasharray:320;stroke-dashoffset:320;animation:draw 2s ease-out forwards,loop 3.5s 2s linear infinite}
        @keyframes draw{to{stroke-dashoffset:0}}@keyframes loop{to{stroke-dashoffset:-320}}
        .left-inner{position:relative;z-index:3;display:flex;flex-direction:column;height:100%;justify-content:space-between}
        .brand{display:flex;align-items:center;gap:12px}
        .bmark{width:44px;height:44px;background:rgba(165,180,252,0.1);border:1px solid rgba(165,180,252,0.25);border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#c7d2fe;letter-spacing:-0.5px}
        .bname{font-size:22px;font-weight:700;color:#e0e7ff;letter-spacing:-0.3px}
        .bname span{color:#818cf8}
        .htag{display:inline-flex;align-items:center;gap:8px;background:rgba(129,140,248,0.09);border:1px solid rgba(129,140,248,0.2);border-radius:30px;padding:6px 16px;font-size:12px;font-weight:600;color:#a5b4fc;margin-bottom:28px;letter-spacing:.2px}
        .ldot{width:7px;height:7px;background:#6ee7b7;border-radius:50%;box-shadow:0 0 0 0 rgba(110,231,183,.5);animation:live 1.8s ease-in-out infinite}
        @keyframes live{0%{box-shadow:0 0 0 0 rgba(110,231,183,.5)}70%{box-shadow:0 0 0 7px rgba(110,231,183,0)}100%{box-shadow:0 0 0 0 rgba(110,231,183,0)}}
        .hero h1{font-size:54px;font-weight:800;color:#e0e7ff;line-height:1.04;letter-spacing:-2.5px;margin-bottom:24px}
        .l2{display:block;background:linear-gradient(135deg,#a5b4fc 0%,#c084fc 55%,#818cf8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .l3{display:block;color:rgba(224,231,255,0.38);font-size:42px}
        .hero p{font-size:15px;color:rgba(165,180,252,0.48);line-height:1.8;max-width:320px;font-weight:400}
        .tagline{display:flex;align-items:center;gap:10px}
        .tline{flex:0 0 32px;height:1px;background:rgba(129,140,248,0.28)}
        .ttext{font-size:11px;color:rgba(129,140,248,0.38);font-weight:500;letter-spacing:2px;text-transform:uppercase}
        .right{flex:0 0 460px;background:#f6f6fb;display:flex;align-items:center;justify-content:center;padding:52px 44px;position:relative}
        .right::before{content:'';position:absolute;left:0;top:8%;bottom:8%;width:1px;background:linear-gradient(to bottom,transparent,rgba(107,127,237,0.22),transparent)}
        .fw{width:100%;max-width:348px}
        .ftop{margin-bottom:36px}
        .fbadge{display:inline-block;background:#EEF1FF;color:#5063C8;font-size:11px;font-weight:700;padding:4px 13px;border-radius:20px;margin-bottom:16px;letter-spacing:.3px}
        .ftop h2{font-size:30px;font-weight:800;color:#1A1E52;letter-spacing:-1px;margin-bottom:8px}
        .ftop p{font-size:14px;color:#9ca3af;line-height:1.5}
        .ebox{background:#fff1f2;border:1px solid #fecdd3;border-radius:13px;padding:14px 16px;margin-bottom:24px;display:flex;gap:12px;align-items:flex-start}
        .eicon{width:34px;height:34px;border-radius:9px;background:#ffe4e6;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .etitle{font-size:13px;font-weight:700;color:#e11d48;margin-bottom:3px}
        .emsg{font-size:12px;color:#be123c;line-height:1.5}
        .ecta{display:inline-block;margin-top:8px;font-size:12px;font-weight:700;color:#5063C8;text-decoration:none;border-bottom:1px solid rgba(67,56,202,.3);padding-bottom:1px}
        .field{margin-bottom:18px}
        .field label{display:block;font-size:11px;font-weight:700;color:#374151;margin-bottom:8px;letter-spacing:.6px;text-transform:uppercase}
        .iw{position:relative}
        .iico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#d1d5db;pointer-events:none;display:flex;align-items:center}
        .iw input{width:100%;padding:13px 14px 13px 42px;background:#fff;border:1.5px solid #eaecf0;border-radius:13px;font-size:14px;font-family:inherit;color:#111827;outline:none;transition:border-color .2s,box-shadow .2s}
        .iw input::placeholder{color:#d1d5db}
        .iw input:focus{border-color:#6B7FED;box-shadow:0 0 0 4px rgba(107,127,237,.09)}
        .eye{position:absolute;right:13px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#d1d5db;display:flex;align-items:center;padding:4px;border-radius:6px;transition:color .2s}
        .eye:hover{color:#6B7FED}
        .fp-link{display:block;text-align:right;margin-top:-10px;margin-bottom:18px;font-size:12px;font-weight:600;color:#6B7FED;cursor:pointer;text-decoration:none;transition:color .2s}
        .fp-link:hover{color:#5063C8;text-decoration:underline}
        .btn{width:100%;padding:14px;background:linear-gradient(135deg,#1A1E52 0%,#2D3680 35%,#5063C8 70%,#6B7FED 100%);border:none;border-radius:13px;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:opacity .2s,transform .15s;position:relative;overflow:hidden;margin-top:8px;letter-spacing:.1px}
        .btn::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.1) 0%,transparent 60%)}
        .btn:hover{opacity:.91;transform:translateY(-1px)}
        .btn:active{transform:scale(.98) translateY(0)}
        .btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
        .spin{width:17px;height:17px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:sp .65s linear infinite}
        @keyframes sp{to{transform:rotate(360deg)}}
        .div{display:flex;align-items:center;gap:12px;margin:22px 0}
        .dl{flex:1;height:1px;background:#f0f0f6}
        .dt{font-size:12px;color:#c4c9d4;font-weight:500;white-space:nowrap}
        .bot{text-align:center;font-size:13px;color:#9ca3af}
        .bot a{color:#5063C8;font-weight:700;text-decoration:none}
        .bot a:hover{text-decoration:underline}
        .trust{display:flex;justify-content:center;align-items:center;gap:6px;margin-top:28px;flex-wrap:wrap}
        .ti{display:flex;align-items:center;gap:5px;font-size:11px;color:#c4c9d4;font-weight:500}
        .tdot{width:5px;height:5px;border-radius:50%;background:#6ee7b7;flex-shrink:0}
        .tsep{color:#e5e7eb;font-size:12px}

        /* ── Forgot Password Modal ── */
        .fp-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);animation:fadeIn .2s ease}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .fp-modal{background:#fff;border-radius:20px;padding:36px;width:100%;max-width:420px;position:relative;animation:slideUp .25s ease;box-shadow:0 24px 60px rgba(0,0,0,0.15)}
        @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        .fp-close{position:absolute;top:16px;right:16px;background:#f3f4f8;border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:14px;color:#666;display:flex;align-items:center;justify-content:center;transition:background .15s}
        .fp-close:hover{background:#e5e5e5}
        .fp-icon{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#EEF1FF,#ddd6fe);display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px}
        .fp-modal h3{font-size:20px;font-weight:800;color:#1A1E52;margin-bottom:6px}
        .fp-modal p{font-size:13px;color:#9ca3af;line-height:1.6;margin-bottom:24px}
        .fp-field{margin-bottom:16px}
        .fp-field label{display:block;font-size:11px;font-weight:700;color:#374151;margin-bottom:8px;letter-spacing:.5px;text-transform:uppercase}
        .fp-field input{width:100%;padding:12px 14px;border:1.5px solid #eaecf0;border-radius:12px;font-size:14px;font-family:inherit;color:#111;outline:none;transition:border-color .2s,box-shadow .2s;background:#f9fafb}
        .fp-field input:focus{border-color:#6B7FED;box-shadow:0 0 0 3px rgba(107,127,237,.09);background:#fff}
        .fp-pw-wrap{position:relative}
        .fp-pw-wrap input{padding-right:44px}
        .fp-eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9ca3af;display:flex;align-items:center;padding:4px}
        .fp-eye:hover{color:#6B7FED}
        .fp-btn{width:100%;padding:13px;background:linear-gradient(135deg,#1A1E52,#5063C8,#6B7FED);border:none;border-radius:12px;color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:opacity .2s;margin-top:4px}
        .fp-btn:hover:not(:disabled){opacity:.88}
        .fp-btn:disabled{opacity:.5;cursor:not-allowed}
        .fp-err{background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:10px 14px;font-size:12px;color:#be123c;font-weight:500;margin-bottom:14px}
        .fp-steps{display:flex;align-items:center;gap:6px;margin-bottom:24px}
        .fp-step{flex:1;height:3px;border-radius:2px;background:#f0f0f5;transition:background .3s}
        .fp-step.done{background:#6B7FED}
        .fp-step.active{background:#a5b4fc}

        /* OTP inputs */
        .otp-row{display:flex;gap:8px;justify-content:center;margin-bottom:20px}
        .otp-input{width:46px;height:54px;border:1.5px solid #eaecf0;border-radius:12px;font-size:22px;font-weight:700;color:#1A1E52;text-align:center;outline:none;transition:border-color .2s,box-shadow .2s;background:#f9fafb;font-family:inherit}
        .otp-input:focus{border-color:#6B7FED;box-shadow:0 0 0 3px rgba(107,127,237,.09);background:#fff}
        .otp-input.filled{border-color:#6B7FED;background:#EEF1FF}
        .resend-row{text-align:center;font-size:12px;color:#9ca3af;margin-bottom:16px}
        .resend-btn{background:none;border:none;cursor:pointer;color:#6B7FED;font-weight:700;font-size:12px;font-family:inherit;padding:0}
        .resend-btn:disabled{color:#c4c9d4;cursor:not-allowed}

        /* Success */
        .fp-success{display:flex;flex-direction:column;align-items:center;text-align:center;padding:10px 0}
        .fp-success-icon{width:72px;height:72px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:16px;animation:popIn .4s ease}
        @keyframes popIn{0%{transform:scale(0)}80%{transform:scale(1.1)}100%{transform:scale(1)}}
        .fp-success h3{font-size:20px;font-weight:800;color:#1A1E52;margin-bottom:8px}
        .fp-success p{font-size:13px;color:#9ca3af;line-height:1.6;margin-bottom:24px}

        @media(max-width:900px){.left{display:none}.right{flex:1}}
      `}</style>

      <div className="page">

        {/* LEFT — unchanged */}
        <div className="left">
          <div className="dot-grid" />
          <div className="glow g1" /><div className="glow g2" /><div className="glow g3" />
          <div className="rings">
            <div className="ring r1" /><div className="ring r2" /><div className="ring r3" /><div className="ring r4" />
          </div>
          <div className="cross-wrap">
            <div className="ch" /><div className="cv" />
            <div className="dot d1" /><div className="dot d2" /><div className="dot d3" /><div className="dot d4" />
          </div>
          <div className="hb">
            <svg viewBox="0 0 280 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path className="hb-line" d="M0 22 L50 22 L68 4 L80 40 L92 10 L104 32 L116 22 L280 22" stroke="rgba(129,140,248,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="left-inner">
            <div className="brand">
              <div className="bmark">TH</div>
              <div className="bname">TruHeal<span>Link</span></div>
            </div>
            <div className="hero">
              <div className="htag"><span className="ldot" />Admin Control Center</div>
              <h1>Manage.<span className="l2">Monitor.</span><span className="l3">Heal.</span></h1>
              <p>Your all-in-one admin dashboard to oversee patients, verify doctors, and keep the TruHeal platform running seamlessly.</p>
            </div>
            <div className="tagline">
              <div className="tline" />
              <div className="ttext">Powered by TruHeal Link</div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="right">
          <div className="fw">
            <div className="ftop">
              <div className="fbadge">Admin Access</div>
              <h2>Welcome back 👋</h2>
              <p>Sign in to your admin account to start managing the platform.</p>
            </div>

            {error && (
              <div className="ebox">
                <div className="eicon">🔒</div>
                <div>
                  <div className="etitle">{notRegistered ? 'Account Not Found' : 'Login Failed'}</div>
                  <div className="emsg">{error}</div>
                  {notRegistered && <Link href="/register" className="ecta">Create an account →</Link>}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Email or Username</label>
                <div className="iw">
                  <span className="iico">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  </span>
                  <input type="text" placeholder="Enter your email or username" value={form.identifier} onChange={e => setForm({...form, identifier: e.target.value})} required />
                </div>
              </div>

              <div className="field">
                <label>Password</label>
                <div className="iw">
                  <span className="iico">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  </span>
                  <input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
                  <button type="button" className="eye" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {/* ── Forgot Password Link ── */}
              <span className="fp-link" onClick={openFp}>Forgot password?</span>

              <button type="submit" className="btn" disabled={loading}>
                {loading ? <><span className="spin" />Signing in...</> : <>Sign In to Dashboard →</>}
              </button>
            </form>

            <div className="div">
              <div className="dl" /><span className="dt">New to TruHeal Admin?</span><div className="dl" />
            </div>
            <div className="bot">Don't have an account? <Link href="/register">Create one now</Link></div>
            <div className="trust">
              <div className="ti"><span className="tdot" />Secure Login</div>
              <span className="tsep">·</span>
              <div className="ti"><span className="tdot" />Admin Only</div>
              <span className="tsep">·</span>
              <div className="ti"><span className="tdot" />JWT Protected</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {fpModal && (
        <div className="fp-overlay" onClick={closeFp}>
          <div className="fp-modal" onClick={e => e.stopPropagation()}>
            <button className="fp-close" onClick={closeFp}>✕</button>

            {/* Progress steps */}
            <div className="fp-steps">
              <div className={`fp-step ${fpStep !== 'email' ? 'done' : 'active'}`} />
              <div className={`fp-step ${fpStep === 'reset' || fpStep === 'done' ? 'done' : fpStep === 'otp' ? 'active' : ''}`} />
              <div className={`fp-step ${fpStep === 'done' ? 'done' : fpStep === 'reset' ? 'active' : ''}`} />
            </div>

            {/* ── Step 1: Email ── */}
            {fpStep === 'email' && (
              <>
                <div className="fp-icon">📧</div>
                <h3>Forgot Password?</h3>
                <p>Enter your admin email address and we'll send you a 6-digit OTP to reset your password.</p>
                {fpError && <div className="fp-err">⚠ {fpError}</div>}
                <div className="fp-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="admin@truheal.com"
                    value={fpEmail}
                    onChange={e => setFpEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                    autoFocus
                  />
                </div>
                <button className="fp-btn" onClick={handleSendOtp} disabled={fpLoading || !fpEmail.trim()}>
                  {fpLoading ? <><span className="spin" />Sending OTP...</> : <>Send OTP →</>}
                </button>
              </>
            )}

            {/* ── Step 2: OTP ── */}
            {fpStep === 'otp' && (
              <>
                <div className="fp-icon">🔐</div>
                <h3>Enter OTP</h3>
                <p>We sent a 6-digit code to <strong style={{color:'#1A1E52'}}>{fpEmail}</strong>. Enter it below to continue.</p>
                {fpError && <div className="fp-err">⚠ {fpError}</div>}
                <div className="otp-row">
                  {fpOtp.map((val, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      className={`otp-input ${val ? 'filled' : ''}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={e => handleOtpChange(e.target.value, idx)}
                      onKeyDown={e => handleOtpKeyDown(e, idx)}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
                <div className="resend-row">
                  {resendTimer > 0
                    ? `Resend OTP in ${resendTimer}s`
                    : <><button className="resend-btn" onClick={() => { handleSendOtp(); }}>Resend OTP</button></>
                  }
                </div>
                <button className="fp-btn" onClick={handleVerifyOtp} disabled={fpLoading || fpOtp.join('').length < 6}>
                  {fpLoading ? <><span className="spin" />Verifying...</> : <>Verify OTP →</>}
                </button>
                <button style={{width:'100%',marginTop:10,padding:'10px',background:'none',border:'1px solid #e5e5e5',borderRadius:10,cursor:'pointer',fontSize:13,color:'#666',fontFamily:'inherit'}} onClick={() => setFpStep('email')}>
                  ← Change Email
                </button>
              </>
            )}

            {/* ── Step 3: Reset Password ── */}
            {fpStep === 'reset' && (
              <>
                <div className="fp-icon">🔑</div>
                <h3>Set New Password</h3>
                <p>Create a strong new password for your admin account.</p>
                {fpError && <div className="fp-err">⚠ {fpError}</div>}
                <div className="fp-field">
                  <label>New Password</label>
                  <div className="fp-pw-wrap">
                    <input
                      type={fpShowPw ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      value={fpNewPw}
                      onChange={e => setFpNewPw(e.target.value)}
                    />
                    <button className="fp-eye" type="button" onClick={() => setFpShowPw(!fpShowPw)}>
                      {fpShowPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div className="fp-field">
                  <label>Confirm Password</label>
                  <div className="fp-pw-wrap">
                    <input
                      type={fpShowConf ? 'text' : 'password'}
                      placeholder="Repeat new password"
                      value={fpConfPw}
                      onChange={e => setFpConfPw(e.target.value)}
                      style={{ borderColor: fpConfPw && fpConfPw !== fpNewPw ? '#fca5a5' : '' }}
                      onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                    />
                    <button className="fp-eye" type="button" onClick={() => setFpShowConf(!fpShowConf)}>
                      {fpShowConf ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {fpConfPw && fpConfPw !== fpNewPw && (
                    <div style={{fontSize:11,color:'#e11d48',marginTop:4,fontWeight:500}}>Passwords do not match</div>
                  )}
                </div>
                <button className="fp-btn" onClick={handleResetPassword} disabled={fpLoading || !fpNewPw || !fpConfPw || fpNewPw !== fpConfPw}>
                  {fpLoading ? <><span className="spin" />Resetting...</> : <>Reset Password →</>}
                </button>
              </>
            )}

            {/* ── Step 4: Done ── */}
            {fpStep === 'done' && (
              <div className="fp-success">
                <div className="fp-success-icon">✅</div>
                <h3>Password Reset!</h3>
                <p>Your admin password has been successfully updated. You can now sign in with your new password.</p>
                <button className="fp-btn" onClick={() => { closeFp(); }}>
                  Back to Login →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
