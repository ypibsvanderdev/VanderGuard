import React from "react";

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #0a0a0f; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #1e2433; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #06b6d4; }
        ::selection { background: rgba(6,182,212,0.2); color: #fff; }
      `}</style>
      {children}
    </div>
  );
}