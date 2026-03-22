'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<'intro' | 'logo' | 'tagline' | 'exit'>('intro');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('logo'),    400);
    const t2 = setTimeout(() => setPhase('tagline'), 1400);
    const t3 = setTimeout(() => setPhase('exit'),    3000);
    const t4 = setTimeout(() => router.push('/login'), 3600); // ← always go to login

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div className={`splash ${phase === 'exit' ? 'exit' : ''}`}>

      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />
      <div className="grid-overlay" />

      {[...Array(12)].map((_, i) => (
        <div key={i} className={`particle p${i}`} />
      ))}

      <div className={`content ${phase !== 'intro' ? 'visible' : ''}`}>
        <div className="logo-wrap">
          <div className="logo-ring ring1" />
          <div className="logo-ring ring2" />
          <div className="logo-ring ring3" />
          <div className="logo-box">
            <span className="logo-th">TH</span>
            <div className="logo-pulse" />
          </div>
        </div>

        <div className="brand-name">
          <span className="brand-tru">Tru</span>
          <span className="brand-heal">Heal</span>
          <span className="brand-link">Link</span>
        </div>

        <div className={`tagline ${phase === 'tagline' || phase === 'exit' ? 'visible' : ''}`}>
          <div className="tagline-line" />
          <span>Admin Control Center</span>
          <div className="tagline-line" />
        </div>

        <div className={`stats-row ${phase === 'tagline' || phase === 'exit' ? 'visible' : ''}`}>
          <div className="stat">
            <span className="stat-icon">👥</span>
            <span className="stat-label">Patients</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-icon">👨‍⚕️</span>
            <span className="stat-label">Doctors</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-icon">📅</span>
            <span className="stat-label">Appointments</span>
          </div>
        </div>

        <div className={`loading-wrap ${phase === 'tagline' || phase === 'exit' ? 'visible' : ''}`}>
          <div className="loading-bar">
            <div className="loading-fill" />
          </div>
          <span className="loading-text">Initializing admin panel...</span>
        </div>
      </div>

      <div className={`version ${phase !== 'intro' ? 'visible' : ''}`}>
        v1.0.0 · TruHealLink
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .splash {
          min-height: 100vh; width: 100%;
          background: linear-gradient(135deg, #0f0c29 0%, #1e1b4b 35%, #302b63 65%, #24243e 100%);
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden;
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .splash.exit { opacity: 0; transform: scale(1.04); }
        .orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.35; animation: orbFloat 8s ease-in-out infinite; }
        .orb1 { width: 500px; height: 500px; background: #4f46e5; top: -150px; left: -150px; animation-delay: 0s; }
        .orb2 { width: 400px; height: 400px; background: #7c3aed; bottom: -100px; right: -100px; animation-delay: -3s; }
        .orb3 { width: 300px; height: 300px; background: #2563eb; top: 50%; left: 50%; transform: translate(-50%,-50%); animation-delay: -6s; }
        @keyframes orbFloat {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(30px,-20px) scale(1.05); }
          66%      { transform: translate(-20px,30px) scale(0.95); }
        }
        .orb3 { animation-name: orb3Float; }
        @keyframes orb3Float {
          0%,100% { transform: translate(-50%,-50%) scale(1); }
          50%      { transform: translate(-50%,-50%) scale(1.2); }
        }
        .grid-overlay {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        .particle { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,0.4); animation: particleFloat 6s ease-in-out infinite; }
        .p0  { top: 10%; left: 15%; animation-delay: 0s;    animation-duration: 7s; }
        .p1  { top: 20%; left: 80%; animation-delay: -1s;   animation-duration: 5s; }
        .p2  { top: 70%; left: 10%; animation-delay: -2s;   animation-duration: 8s; }
        .p3  { top: 80%; left: 70%; animation-delay: -3s;   animation-duration: 6s; }
        .p4  { top: 40%; left: 5%;  animation-delay: -0.5s; animation-duration: 9s; }
        .p5  { top: 60%; left: 90%; animation-delay: -4s;   animation-duration: 7s; }
        .p6  { top: 15%; left: 50%; animation-delay: -1.5s; animation-duration: 5s; width: 6px; height: 6px; }
        .p7  { top: 85%; left: 35%; animation-delay: -2.5s; animation-duration: 8s; width: 3px; height: 3px; }
        .p8  { top: 35%; left: 65%; animation-delay: -3.5s; animation-duration: 6s; }
        .p9  { top: 55%; left: 25%; animation-delay: -0.8s; animation-duration: 7s; width: 5px; height: 5px; }
        .p10 { top: 75%; left: 55%; animation-delay: -4.5s; animation-duration: 9s; }
        .p11 { top: 25%; left: 40%; animation-delay: -2.2s; animation-duration: 6s; width: 3px; height: 3px; }
        @keyframes particleFloat {
          0%,100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50%      { transform: translateY(-20px) scale(1.3); opacity: 0.8; }
        }
        .content {
          display: flex; flex-direction: column; align-items: center; gap: 24px;
          position: relative; z-index: 10;
          opacity: 0; transform: translateY(30px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .content.visible { opacity: 1; transform: translateY(0); }
        .logo-wrap { position: relative; width: 110px; height: 110px; display: flex; align-items: center; justify-content: center; }
        .logo-ring { position: absolute; border-radius: 50%; border: 1px solid rgba(255,255,255,0.15); animation: ringExpand 2.5s ease-in-out infinite; }
        .ring1 { width: 110px; height: 110px; animation-delay: 0s; }
        .ring2 { width: 140px; height: 140px; animation-delay: -0.8s; }
        .ring3 { width: 170px; height: 170px; animation-delay: -1.6s; }
        @keyframes ringExpand {
          0%,100% { transform: scale(1); opacity: 0.3; }
          50%      { transform: scale(1.08); opacity: 0.6; }
        }
        .logo-box {
          width: 80px; height: 80px; border-radius: 22px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          position: relative; z-index: 2;
          box-shadow: 0 0 40px rgba(79,70,229,0.6), 0 0 80px rgba(79,70,229,0.2);
          animation: logoGlow 3s ease-in-out infinite;
        }
        @keyframes logoGlow {
          0%,100% { box-shadow: 0 0 40px rgba(79,70,229,0.6), 0 0 80px rgba(79,70,229,0.2); }
          50%      { box-shadow: 0 0 60px rgba(79,70,229,0.8), 0 0 120px rgba(79,70,229,0.4); }
        }
        .logo-th { font-size: 26px; font-weight: 900; color: #fff; letter-spacing: -1px; font-family: 'Segoe UI', sans-serif; }
        .logo-pulse { position: absolute; inset: -4px; border-radius: 26px; border: 2px solid rgba(255,255,255,0.3); animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse {
          0%,100% { transform: scale(1); opacity: 0.3; }
          50%      { transform: scale(1.05); opacity: 0.7; }
        }
        .brand-name { font-size: 42px; font-weight: 900; letter-spacing: -1px; font-family: 'Segoe UI', sans-serif; animation: shimmer 3s ease-in-out infinite; }
        .brand-tru  { color: #fff; }
        .brand-heal { color: #a5b4fc; }
        .brand-link { color: #818cf8; }
        @keyframes shimmer {
          0%,100% { filter: brightness(1); }
          50%      { filter: brightness(1.2); }
        }
        .tagline {
          display: flex; align-items: center; gap: 12px;
          opacity: 0; transform: translateY(10px);
          transition: opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s;
          color: rgba(255,255,255,0.55); font-size: 13px;
          font-weight: 500; letter-spacing: 2px; text-transform: uppercase;
          font-family: 'Segoe UI', sans-serif;
        }
        .tagline.visible { opacity: 1; transform: translateY(0); }
        .tagline-line { width: 40px; height: 1px; background: rgba(255,255,255,0.25); }
        .stats-row {
          display: flex; align-items: center; gap: 20px;
          opacity: 0; transform: translateY(10px);
          transition: opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s;
        }
        .stats-row.visible { opacity: 1; transform: translateY(0); }
        .stat { display: flex; flex-direction: column; align-items: center; gap: 4px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 18px; }
        .stat-icon  { font-size: 18px; }
        .stat-label { font-size: 11px; color: rgba(255,255,255,0.5); font-weight: 500; white-space: nowrap; }
        .stat-divider { width: 1px; height: 40px; background: rgba(255,255,255,0.1); }
        .loading-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 10px; width: 280px;
          opacity: 0; transform: translateY(10px);
          transition: opacity 0.6s ease 0.5s, transform 0.6s ease 0.5s;
        }
        .loading-wrap.visible { opacity: 1; transform: translateY(0); }
        .loading-bar { width: 100%; height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
        .loading-fill {
          height: 100%; border-radius: 2px;
          background: linear-gradient(90deg, #4f46e5, #7c3aed, #a78bfa);
          animation: loadFill 2.2s ease forwards;
        }
        @keyframes loadFill {
          0%   { width: 0%; }
          30%  { width: 45%; }
          60%  { width: 72%; }
          85%  { width: 90%; }
          100% { width: 100%; }
        }
        .loading-text { font-size: 12px; color: rgba(255,255,255,0.35); font-family: 'Segoe UI', sans-serif; letter-spacing: 0.5px; animation: textBlink 1.5s ease-in-out infinite; }
        @keyframes textBlink {
          0%,100% { opacity: 0.35; }
          50%      { opacity: 0.65; }
        }
        .version { position: fixed; bottom: 24px; font-size: 11px; color: rgba(255,255,255,0.2); font-family: 'Segoe UI', sans-serif; letter-spacing: 1px; z-index: 10; opacity: 0; transition: opacity 0.8s ease 0.5s; }
        .version.visible { opacity: 1; }
      `}</style>
    </div>
  );
}