"use client";

import React, { useState } from 'react';
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Server, Monitor, Edit2, X, Save, Loader2, Database, Key, Folder, Shield, Terminal } from 'lucide-react';

// Cấu trúc dữ liệu CHỈ chứa IP và Port
const initialConfig = {
  // --- FRONTEND ENV ---
  frontend: { ip: 'localhost', port: '3000' },
  userBackend: { ip: 'localhost', port: '8000' },
  courseBackend: { ip: 'localhost', port: '8001' },
  progressBackend: { ip: 'localhost', port: '8003' },
  examBackend: { ip: 'localhost', port: '8004' },
  nginx: { ip: 'localhost', port: '80' },
  googleClientId: '',

  // --- BACKEND ENV ---
  usersDb: { ip: 'localhost', port: '5434' },
  coursesDb: { ip: 'localhost', port: '5433' },
  mediaServer: { ip: '172.16.109.76', port: '8000' },
  corsOrigins: 'localhost:3000, 127.0.0.1:8004', // Giữ nguyên chuỗi vì có thể có nhiều origin
  clientSecretKey: '',
  secretKey: '',
  courseImagePath: '/var/www/lumer_media/uploads/course/images/',
};

type ViewState = 'HOME' | 'FRONTEND' | 'BACKEND';

export default function ConfigPage() {
  const [view, setView] = useState<ViewState>('HOME');
  const [config, setConfig] = useState(initialConfig);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialConfig);
  const [isSaving, setIsSaving] = useState(false);

  // Xử lý thay đổi cho IP/Port
  const handleIpPortChange = (field: string, key: 'ip' | 'port', value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: { ...prev[field], [key]: value }
    }));
  };

  // Xử lý thay đổi cho Text thường
  const handleTextChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600)); // Giả lập API
      setConfig(formData);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // GIAO DIỆN CHÍNH (HOME) - 2 Ô LỚN
  // ==========================================
  const renderHome = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto h-[400px]">
      <div 
        onDoubleClick={() => setView('FRONTEND')}
        className="group relative bg-white rounded-3xl p-10 border border-slate-200 hover:border-[#0066FF] shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer flex flex-col justify-center items-center text-center overflow-hidden hover:-translate-y-2"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative z-10">
          <div className="w-20 h-20 mx-auto bg-blue-50 text-[#0066FF] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Monitor size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Frontend Configuration</h2>
          <p className="text-sm text-slate-500 mb-6 px-4">Quản lý IP & Port cho các biến môi trường Client-side.</p>
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-[#0066FF] font-semibold rounded-lg text-sm animate-pulse">
            Nhấp đúp để mở
          </div>
        </div>
      </div>

      <div 
        onDoubleClick={() => setView('BACKEND')}
        className="group relative bg-white rounded-3xl p-10 border border-slate-200 hover:border-[#0066FF] shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer flex flex-col justify-center items-center text-center overflow-hidden hover:-translate-y-2"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative z-10">
          <div className="w-20 h-20 mx-auto bg-blue-50 text-[#0066FF] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Server size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Backend Configuration</h2>
          <p className="text-sm text-slate-500 mb-6 px-4">Quản lý Database, Security & Services của Server.</p>
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-[#0066FF] font-semibold rounded-lg text-sm animate-pulse">
            Nhấp đúp để mở
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // GIAO DIỆN CHI TIẾT FRONTEND
  // ==========================================
  const renderFrontend = () => (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl shadow-blue-500/5 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Header title="Frontend Setup" icon={<Monitor />} onBack={() => setView('HOME')} onEdit={() => { setFormData(config); setIsEditing(true); }} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DisplayIpPort label="Frontend Host" data={config.frontend} />
        <DisplayIpPort label="User Service" data={config.userBackend} />
        <DisplayIpPort label="Course Service" data={config.courseBackend} />
        <DisplayIpPort label="Progress Service" data={config.progressBackend} />
        <DisplayIpPort label="Exam Service" data={config.examBackend} />
        <DisplayIpPort label="Nginx Server" data={config.nginx} />
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100">
        <DisplayText label="Google Client ID" value={config.googleClientId} icon={<Key size={16} />} />
      </div>
    </div>
  );

  // ==========================================
  // GIAO DIỆN CHI TIẾT BACKEND
  // ==========================================
  const renderBackend = () => (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl shadow-blue-500/5 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Header title="Backend Setup" icon={<Server />} onBack={() => setView('HOME')} onEdit={() => { setFormData(config); setIsEditing(true); }} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DisplayIpPort label="Users Database" data={config.usersDb} icon={<Database size={16}/>} />
        <DisplayIpPort label="Courses Database" data={config.coursesDb} icon={<Database size={16}/>} />
        <DisplayIpPort label="Media Server" data={config.mediaServer} />
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
        <DisplayText label="CORS Origins" value={config.corsOrigins} icon={<Monitor size={16} />} />
        <DisplayText label="Secret Key" value="••••••••••••••••••••••••" icon={<Shield size={16} />} />
        <DisplayText label="Course Image Path" value={config.courseImagePath} icon={<Folder size={16} />} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 selection:bg-[#0066FF] selection:text-white">
      <div className="relative z-40"><Navbar /></div>

      {/* ==========================================
          BANNER ĐỘNG
          ========================================== */}
      <section className="relative overflow-hidden text-white pt-12 pb-32 px-6 bg-gradient-to-br from-[#0066FF] via-[#0052cc] to-[#003d99]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/20 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-white/80 font-medium mb-6">
              <Link href="/admin/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md hover:bg-white/20 transition-all"><ArrowLeft size={14} /> Trang chủ</Link>
              <span className="opacity-50">/</span>
              <span className="flex items-center gap-1.5 font-semibold text-white bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/5">Cấu hình</span>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md"><Terminal size={24} className="text-white" /></div>
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-tight">ENVIRONMENT MENU</h1>
            </div>
            <p className="max-w-2xl text-[15px] md:text-base text-white/90 font-medium leading-relaxed opacity-90">
              {view === 'HOME' && 'Chọn môi trường bạn muốn cấu hình bằng cách nhấp đúp vào ô tương ứng.'}
              {view === 'FRONTEND' && 'Đang xem cấu hình của Client-side (Trình duyệt).'}
              {view === 'BACKEND' && 'Đang xem cấu hình của Server-side (Máy chủ).'}
            </p>
          </div>
        </div>
      </section>

      {/* KHU VỰC NỘI DUNG CHÍNH (Đẩy lên trên một chút để chèn lên banner) */}
      <main className="px-6 relative z-20 -mt-16">
        {view === 'HOME' && renderHome()}
        {view === 'FRONTEND' && renderFrontend()}
        {view === 'BACKEND' && renderBackend()}
      </main>

      {/* ==========================================
          MODAL CHỈNH SỬA (CHỈ NHẬP IP & PORT)
          ========================================== */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSaving && setIsEditing(false)}></div>
          
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border-2 border-[#0066FF]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
              <h3 className="text-xl font-bold flex items-center gap-2 text-[#0066FF]">
                <Edit2 size={20} /> Cập nhật {view === 'FRONTEND' ? 'Frontend' : 'Backend'}
              </h3>
              <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {view === 'FRONTEND' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputIpPort label="Frontend Host" field="frontend" data={formData.frontend} onChange={handleIpPortChange} />
                  <InputIpPort label="User Service" field="userBackend" data={formData.userBackend} onChange={handleIpPortChange} />
                  <InputIpPort label="Course Service" field="courseBackend" data={formData.courseBackend} onChange={handleIpPortChange} />
                  <InputIpPort label="Progress Service" field="progressBackend" data={formData.progressBackend} onChange={handleIpPortChange} />
                  <InputIpPort label="Exam Service" field="examBackend" data={formData.examBackend} onChange={handleIpPortChange} />
                  <InputIpPort label="Nginx Server" field="nginx" data={formData.nginx} onChange={handleIpPortChange} />
                  
                  <div className="md:col-span-2 mt-2">
                    <label className="block text-xs font-bold text-slate-500 mb-2">Google Client ID</label>
                    <input type="text" value={formData.googleClientId} onChange={(e) => handleTextChange('googleClientId', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-[#0066FF] outline-none" />
                  </div>
                </div>
              )}

              {view === 'BACKEND' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputIpPort label="Users Database" field="usersDb" data={formData.usersDb} onChange={handleIpPortChange} />
                  <InputIpPort label="Courses Database" field="coursesDb" data={formData.coursesDb} onChange={handleIpPortChange} />
                  <InputIpPort label="Media Server" field="mediaServer" data={formData.mediaServer} onChange={handleIpPortChange} />
                  
                  <div className="md:col-span-2 grid gap-4 mt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">CORS Origins</label>
                      <input type="text" value={formData.corsOrigins} onChange={(e) => handleTextChange('corsOrigins', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-[#0066FF] outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Client Secret Key</label>
                        <input type="password" value={formData.clientSecretKey} onChange={(e) => handleTextChange('clientSecretKey', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-[#0066FF] outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Secret Key</label>
                        <input type="password" value={formData.secretKey} onChange={(e) => handleTextChange('secretKey', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-[#0066FF] outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">Course Image Path</label>
                      <input type="text" value={formData.courseImagePath} onChange={(e) => handleTextChange('courseImagePath', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-[#0066FF] outline-none" />
                    </div>
                  </div>
                </div>
              )}
            </form>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
              <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Hủy bỏ</button>
              <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#0066FF] hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-500/30">
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// CÁC COMPONENT PHỤ TRỢ DÀNH CHO UI
// ==========================================

function Header({ title, icon, onBack, onEdit }: { title: string, icon: any, onBack: any, onEdit: any }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-800">
          <span className="text-[#0066FF]">{icon}</span> {title}
        </h1>
      </div>
      <button onClick={onEdit} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#0066FF] hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-500/20">
        <Edit2 size={16} /> Chỉnh sửa
      </button>
    </div>
  );
}

// Component HIỂN THỊ IP và Port
function DisplayIpPort({ label, data, icon = <Server size={16} /> }: { label: string, data: { ip: string, port: string }, icon?: any }) {
  return (
    <div className="flex flex-col p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-blue-200 transition-colors">
      <span className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2">
        <span className="text-slate-400">{icon}</span> {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-mono rounded-lg shadow-sm w-full truncate" title={data.ip}>
          {data.ip}
        </span>
        <span className="text-slate-400 font-bold">:</span>
        <span className="px-3 py-1.5 bg-blue-50 border border-blue-100 text-[#0066FF] text-sm font-mono font-bold rounded-lg shadow-sm w-24 text-center">
          {data.port}
        </span>
      </div>
    </div>
  );
}

// Component NHẬP LIỆU IP và Port
function InputIpPort({ label, field, data, onChange }: { label: string, field: string, data: { ip: string, port: string }, onChange: any }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-2">{label}</label>
      <div className="flex items-center gap-2">
        <input 
          type="text" 
          value={data.ip} 
          onChange={(e) => onChange(field, 'ip', e.target.value)}
          placeholder="IP / Host"
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition-all"
        />
        <span className="text-slate-400 font-bold">:</span>
        <input 
          type="text" 
          value={data.port} 
          onChange={(e) => onChange(field, 'port', e.target.value)}
          placeholder="Port"
          className="w-24 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono text-center focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition-all"
        />
      </div>
    </div>
  );
}

// Component HIỂN THỊ text thông thường
function DisplayText({ label, value, icon }: { label: string, value: string, icon: any }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">{icon}</span>
        <span className="text-sm font-bold text-slate-700">{label}</span>
      </div>
      <span className="text-sm text-slate-600 font-mono truncate max-w-[300px] md:max-w-[500px] bg-white border border-slate-100 px-4 py-2 rounded-lg">
        {value}
      </span>
    </div>
  );
}