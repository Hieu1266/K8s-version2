"use client";

import { useRouter } from "next/navigation";
import { SubjectInfo } from "@/types/questions-bank";

interface Props {
  subject: SubjectInfo;
}

export default function SubjectHeader({ subject }: Props) {
  const router = useRouter();

  return (
    <section className="bg-gradient-to-r from-[#66CCFF] to-[#0066FF] text-white pb-24">
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <button
          onClick={() => router.push("/instructor-management/questions-bank")}
          className="mb-6 flex items-center gap-2 text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-xl transition backdrop-blur-sm"
        >
          ← Danh sách Subject
        </button>

        <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">
          Question Bank
        </span>

        <h1 className="text-4xl font-extrabold mt-3">{subject.title}</h1>

        <p className="mt-2 text-blue-100 text-sm">
          {subject.code}
          <span className="mx-2">•</span>
          {subject.totalQuestions} câu hỏi
          <span className="mx-2">•</span>
          {subject.totalModules} Module
        </p>
      </div>
    </section>
  );
}
