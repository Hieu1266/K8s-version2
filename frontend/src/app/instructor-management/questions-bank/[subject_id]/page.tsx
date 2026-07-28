"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import SubjectHeader from "@/components/SubjectHeader";
import SubjectInfoComponent from "@/components/SubjectInfo";
import QuestionFilter from "@/components/QuestionFilter";
import QuestionCard from "@/components/QuestionCard";
import Pagination from "@/components/Pagination";
import AddQuestionModal from "@/components/AddQuestionModal";
import { Question, SubjectInfo } from "@/types/questions-bank";
import {
  Layers,
  HelpCircle,
  Plus,
  SearchX,
  Sparkles,
  Loader2,
  BookOpenCheck
} from "lucide-react";

import {
  getQuestionsBySubjectAction,
  getSubjectDetailAction,
  saveQuestionAction,
} from "@/actions/getQuestionBank";

export default function QuestionBankDetailPage() {
  const params = useParams();

  // Lấy mã môn học từ URL
  const subjectId = (params?.subject_id as string) || (params?.id as string) || "";

  // State quản lý dữ liệu
  const [subjectData, setSubjectData] = useState<SubjectInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | undefined>();

  // State bộ lọc
  const [keyword, setKeyword] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("Tất cả loại");

  // State phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  // Fetch dữ liệu môn học & câu hỏi
  const fetchData = useCallback(async () => {
    if (!subjectId) return;
    setLoading(true);
    try {
      const [subjRes, questionsRes] = await Promise.all([
        getSubjectDetailAction(subjectId),
        getQuestionsBySubjectAction(subjectId),
      ]);

      if (subjRes) {
        setSubjectData({
          subject_id: subjRes.subject_id,
          code: subjRes.code || subjRes.subject_id.substring(0, 8).toUpperCase(),
          title: subjRes.title,
          description: subjRes.description || "",
          instructor: subjRes.instructor || "Giảng viên phụ trách",
          status_id: subjRes.status_id,
          totalQuestions: questionsRes?.length || 0,
          totalModules: subjRes.totalModules || 0,
        });
      }

      setQuestions(questionsRes || []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // RESET VỀ TRANG 1 KHI BỘ LỌC THAY ĐỔI
  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, selectedType]);

  // Xử lý Thêm / Sửa câu hỏi
  const handleSave = async (question: Question) => {
    try {
      const payload: any = {
        ...question,
        ...(editingQuestion?.question_id ? { question_id: editingQuestion.question_id } : {}),
        subject_id: subjectId,
      };

      const result = await saveQuestionAction(payload);

      if (result.success) {
        alert("Lưu câu hỏi thành công!");
        await fetchData();
        setEditingQuestion(undefined);
        setOpenModal(false);
      } else {
        alert(`Lỗi: ${result.error || "Vui lòng thử lại!"}`);
      }
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      alert("Đã xảy ra lỗi hệ thống!");
    }
  };

  // LOGIC LỌC CÂU HỎI ĐỘNG (FIX TRIỆT ĐỂ LỖI BỘ LỌC & CÂU HỎI ĐÚNG/SAI)
  // LOGIC LỌC CÂU HỎI ĐỘNG (ĐÃ FIX LỖI TYPESCRIPT BẰNG ÉP KIỂU)
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const qAny = q as any; // Ép kiểu để hết 3 lỗi gạch đỏ TypeScript

      // 1. Tìm kiếm theo từ khóa
      const searchKeyword = keyword?.trim().toLowerCase() || "";
      const cleanContent = (q.content || "").replace(/<[^>]*>/g, "").toLowerCase();
      const matchKeyword =
        !searchKeyword ||
        String(q.question_id ?? "").toLowerCase().includes(searchKeyword) ||
        cleanContent.includes(searchKeyword) ||
        (q.question_title ?? "").toLowerCase().includes(searchKeyword);

      // 2. Lọc theo Loại câu hỏi
      let matchType = true;
      if (
        selectedType &&
        selectedType !== "Tất cả loại" &&
        selectedType !== "Tất cả" &&
        selectedType !== "ALL"
      ) {
        const typeMap: Record<string, string[]> = {
          "MULTIPLE_CHOICE": ["MULTIPLE_CHOICE", "Trắc nghiệm"],
          "TRUE_FALSE": ["TRUE_FALSE", "Đúng / Sai", "Đúng/Sai"],
          "ESSAY": ["ESSAY", "Tự luận"],
          "Trắc nghiệm": ["MULTIPLE_CHOICE", "Trắc nghiệm"],
          "Đúng / Sai": ["TRUE_FALSE", "Đúng / Sai", "Đúng/Sai"],
          "Tự luận": ["ESSAY", "Tự luận"],
        };

        const validTypes = typeMap[selectedType] || [selectedType];
        matchType = validTypes.includes(q.question_type);
      }


      return matchKeyword && matchType;
    });
  }, [questions, keyword, selectedType]);

  // Phân trang
  const totalPages = Math.ceil(filteredQuestions.length / pageSize) || 1;
  const displayQuestions = filteredQuestions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setOpenModal(true);
  };

  const handleDelete = (questionId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng đề?")) {
      setQuestions((prev) => prev.filter((q) => q.question_id !== questionId));
    }
  };

  const currentSubject: SubjectInfo = subjectData || {
    subject_id: subjectId,
    code: subjectId.substring(0, 8).toUpperCase(),
    title: "Đang tải dữ liệu môn học...",
    description: "Đang tải thông tin chi tiết môn học...",
    instructor: "Giảng viên",
    status_id: "SUBJECT_ACTIVE",
    totalQuestions: questions.length,
    totalModules: 0,
  };

  return (
    <div className="min-h-screen bg-slate-50/80 font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Navbar & Header */}
      <Navbar />
      <SubjectHeader subject={currentSubject} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">

        {/* 1. THÔNG TIN MÔN HỌC & THỐNG KÊ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <SubjectInfoComponent subject={currentSubject} />
          </div>

          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden border border-emerald-800/40">
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-3 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles size={14} /> Bảng Tổng Quan
              </div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Ngân Hàng Đề {currentSubject.code}
              </h3>
              <p className="text-xs text-emerald-100/70 leading-relaxed">
                Hệ thống lưu trữ và quản lý câu hỏi tiêu chuẩn, phục vụ tạo đề thi tự động.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-6 border-t border-emerald-800/50 relative z-10">
              <div className="bg-emerald-900/30 backdrop-blur-md rounded-xl p-3.5 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                  <HelpCircle size={15} /> Tổng câu hỏi
                </div>
                <div className="text-2xl font-black text-white mt-1">
                  {questions.length}
                </div>
              </div>

              <div className="bg-emerald-900/30 backdrop-blur-md rounded-xl p-3.5 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-teal-300 text-xs font-semibold">
                  <Layers size={15} /> Tổng Module
                </div>
                <div className="text-2xl font-black text-white mt-1">
                  {currentSubject.totalModules || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. BỘ LỌC TÌM KIẾM */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <QuestionFilter
            keyword={keyword}
            setKeyword={setKeyword}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            onAddQuestion={() => {
              setEditingQuestion(undefined);
              setOpenModal(true);
            }}
          />
        </div>

        {/* 3. DANH SÁCH CÂU HỎI */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/80 shadow-sm gap-3 text-slate-500">
            <Loader2 size={36} className="animate-spin text-emerald-600" />
            <p className="text-sm font-semibold text-slate-600">Đang đồng bộ dữ liệu câu hỏi...</p>
          </div>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
                <BookOpenCheck size={22} className="text-emerald-600" />
                Danh sách câu hỏi
                <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200/60">
                  {filteredQuestions.length} câu
                </span>
              </h2>
            </div>

            {displayQuestions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm space-y-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <SearchX size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">Không tìm thấy câu hỏi nào</h3>
                  <p className="text-xs text-slate-500">Thử thay đổi bộ lọc hoặc thêm câu hỏi mới vào môn học này.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingQuestion(undefined);
                    setOpenModal(true);
                  }}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Plus size={16} /> Thêm câu hỏi ngay
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {displayQuestions.map((question, index) => (
                  <div
                    key={question.question_id || index}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 overflow-hidden"
                  >
                    <QuestionCard
                      question={question}
                      index={(currentPage - 1) * pageSize + index}
                      onEdit={() => handleEdit(question)}
                      onDelete={() => handleDelete(question.question_id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 4. PHÂN TRANG */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center pt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </main>

      {/* MODAL THÊM / SỬA CÂU HỎI */}
      <AddQuestionModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setEditingQuestion(undefined);
        }}
        onSave={handleSave}
        subjectId={subjectId}
        editQuestion={editingQuestion}
      />
    </div>
  );
}