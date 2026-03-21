import React from "react";

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center font-mono">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3b6fd4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span className="text-[#e05252] font-bold text-xl tracking-widest uppercase">VanderHub: Access Denied</span>
        </div>
        <p className="text-[#4a5568] text-sm">Raw source code is protected. Browser access is forbidden.</p>
      </div>
    </div>
  );
}