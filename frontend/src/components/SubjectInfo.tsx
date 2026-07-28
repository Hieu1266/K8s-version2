import React from "react";
import { SubjectInfo } from "@/types/questions-bank";
import { BookOpen, User, Layers, CheckCircle2, FileText } from "lucide-react";

interface SubjectInfoProps {
  subject: SubjectInfo;
}

export default function SubjectInfoComponent({ subject }: SubjectInfoProps) {
  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      {/* Tiêu đề & Mô tả môn học */}
      <div className="flex items-start gap-4">
        {/* Badge Icon đại diện thay thế cho khung ảnh cũ */}
        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-sm">
          <BookOpen size={24} />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {subject.title || "Tên môn học"}
          </h1>
          <p className="text-xs font-medium text-slate-500">
            {subject.description || "Chưa có mô tả môn học"}
          </p>
        </div>
      </div>

      {/* Thông tin chi tiết dạng Grid 2x2 cân đối */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
        <div className="space-y-1">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <FileText size={12} className="text-slate-400" /> Mã môn học
          </span>
          <p className="font-bold text-slate-800 text-sm">
            {subject.code || subject.subject_id?.substring(0, 8).toUpperCase()}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <User size={12} className="text-slate-400" /> Giảng viên
          </span>
          <p className="font-bold text-slate-800 text-sm">
            {subject.instructor || "Chưa phân công"}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <Layers size={12} className="text-slate-400" /> Tổng số Module
          </span>
          <p className="font-bold text-slate-800 text-sm">
            {subject.totalModules || 0} Module
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-500" /> Trạng thái
          </span>
          <div className="pt-0.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/60">
              Đang hoạt động
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}