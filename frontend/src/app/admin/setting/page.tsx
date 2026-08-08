import React from 'react';

// Đọc thông số từ process.env (có kèm giá trị mặc định nếu thiếu .env)
const config = {
  serverIp: process.env.SERVER_IP || '127.0.0.1',
  serverPort: process.env.SERVER_PORT || '8080',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8080/api',
  publicIp: process.env.NEXT_PUBLIC_APP_IP || 'localhost',
  publicPort: process.env.NEXT_PUBLIC_APP_PORT || '3000',
  publicApiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
};

export default function ConfigPage() {
  return (
    <main className="min-h-screen p-8 bg-slate-900 text-white font-mono">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-emerald-400 border-b border-slate-700 pb-3">
          Cấu Hình Hệ Thống (Environment Config)
        </h1>

        {/* Server Config */}
        <section className="bg-slate-800 p-5 rounded-lg border border-slate-700 shadow-md">
          <h2 className="text-lg font-semibold text-amber-400 mb-3">
            1. Server-Side Configuration (Chỉ đọc từ Server)
          </h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between border-b border-slate-700/50 pb-1">
              <span className="text-slate-400">Server IP (SERVER_IP):</span>
              <code className="text-cyan-300 font-bold">{config.serverIp}</code>
            </li>
            <li className="flex justify-between border-b border-slate-700/50 pb-1">
              <span className="text-slate-400">Server Port (SERVER_PORT):</span>
              <code className="text-cyan-300 font-bold">{config.serverPort}</code>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">API Base URL (API_BASE_URL):</span>
              <code className="text-cyan-300 font-bold">{config.apiBaseUrl}</code>
            </li>
          </ul>
        </section>

        {/* Client / Public Config */}
        <section className="bg-slate-800 p-5 rounded-lg border border-slate-700 shadow-md">
          <h2 className="text-lg font-semibold text-sky-400 mb-3">
            2. Public / Client Configuration (NEXT_PUBLIC_*)
          </h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between border-b border-slate-700/50 pb-1">
              <span className="text-slate-400">Public IP (NEXT_PUBLIC_APP_IP):</span>
              <code className="text-cyan-300 font-bold">{config.publicIp}</code>
            </li>
            <li className="flex justify-between border-b border-slate-700/50 pb-1">
              <span className="text-slate-400">Public Port (NEXT_PUBLIC_APP_PORT):</span>
              <code className="text-cyan-300 font-bold">{config.publicPort}</code>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Public API URL (NEXT_PUBLIC_API_URL):</span>
              <code className="text-cyan-300 font-bold">{config.publicApiUrl}</code>
            </li>
          </ul>
        </section>

        {/* Status */}
        <div className="text-xs text-slate-500 text-center pt-2">
          Môi trường chạy: <span className="text-emerald-400 font-semibold">{process.env.NODE_ENV}</span>
        </div>
      </div>
    </main>
  );
}