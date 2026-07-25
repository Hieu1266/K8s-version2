"use client";

import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";

import SubjectHeader from "@/components/SubjectHeader";
import SubjectInfo from "@/components/SubjectInfo";
import QuestionFilter from "@/components/QuestionFilter";
import QuestionCard from "@/components/QuestionCard";
import Pagination from "@/components/Pagination";
import AddQuestionModal from "@/components/AddQuestionModal";

import { CauHoi, SubjectInfo as Subject } from "@/types/questions-bank";
import {
  FileQuestion,
  Layers,
  HelpCircle,
  Plus,
  SearchX,
  Sparkles,
} from "lucide-react";

const subject: Subject = {
  id: "sub001",
  code: "CNTT301",
  title: "Python Programming",
  description:
    "Learn Python from basic to advanced through hands-on exercises and real-world projects.",
  instructor: "Nguyễn Văn A",
  image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4",
  totalModules: 8,
  totalQuestions: 6,
  status: "Active",
};

const fakeQuestions: CauHoi[] = [
  {
    id: "CH001",
    noiDung: "Python là ngôn ngữ lập trình thuộc loại nào?",
    module: "Module 1",
    loaiCauHoi: "Trắc nghiệm",
    mucDo: "Dễ",
    chuDe: ["Python", "Basic"],
    ngayTao: "12/07/2026",
    cacDapAn: [
      { id: "A", noiDung: "Compiled" },
      { id: "B", noiDung: "Interpreted" },
      { id: "C", noiDung: "Assembly" },
      { id: "D", noiDung: "Machine" },
    ],
    dapAnDungId: "B",
  },
  {
    id: "CH002",
    noiDung: "Giải thích Decorator trong Python.",
    module: "Module 4",
    loaiCauHoi: "Tự luận",
    mucDo: "Khó",
    chuDe: ["Decorator"],
    ngayTao: "10/07/2026",
    huongDanTuLuan: "Sinh viên trình bày đúng khái niệm, cú pháp và ví dụ.",
  },
];

export default function QuestionBankDetailPage() {
  const [questions, setQuestions] = useState<CauHoi[]>(fakeQuestions);
  const [openModal, setOpenModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CauHoi | undefined>();

  const [keyword, setKeyword] = useState("");
  const [selectedModule, setSelectedModule] = useState("Tất cả Module");
  const [selectedType, setSelectedType] = useState("Tất cả loại");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Tất cả mức độ");
  const [selectedTopic, setSelectedTopic] = useState("Tất cả chủ đề");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const modules = useMemo(() => {
    return [...new Set(questions.map((q) => q.module).filter(Boolean))];
  }, [questions]);

  const topics = useMemo(() => {
    return [...new Set(questions.flatMap((q) => q.chuDe || []))];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Chuẩn hóa từ khóa tìm kiếm
      const searchKeyword = keyword?.trim().toLowerCase() || "";

      // Kiểm tra id và noiDung an toàn (ép kiểu chuỗi + phòng ngừa null/undefined)
      const matchKeyword =
        String(q.id ?? "")
          .toLowerCase()
          .includes(searchKeyword) ||
        (q.noiDung ?? "").toLowerCase().includes(searchKeyword);

      const matchModule =
        selectedModule === "Tất cả Module" || q.module === selectedModule;

      const matchType =
        selectedType === "Tất cả loại" || q.loaiCauHoi === selectedType;

      const matchDifficulty =
        selectedDifficulty === "Tất cả mức độ" ||
        q.mucDo === selectedDifficulty;

      const matchTopic =
        selectedTopic === "Tất cả chủ đề" ||
        (q.chuDe && q.chuDe.includes(selectedTopic));

      return (
        matchKeyword &&
        matchModule &&
        matchType &&
        matchDifficulty &&
        matchTopic
      );
    });
  }, [
    questions,
    keyword,
    selectedModule,
    selectedType,
    selectedDifficulty,
    selectedTopic,
  ]);

  const totalPages = Math.ceil(filteredQuestions.length / pageSize);

  const displayQuestions = filteredQuestions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleSave = (question: CauHoi) => {
    if (editingQuestion) {
      // Đang chỉnh sửa: Dùng ID của editingQuestion làm gốc và ép kiểu String khi so sánh
      const targetId = String(editingQuestion.id);

      setQuestions((prevQuestions) =>
        prevQuestions.map((q) =>
          String(q.id) === targetId
            ? { ...question, id: editingQuestion.id } // Giữ nguyên ID chuẩn của câu hỏi
            : q,
        ),
      );
    } else {
      // Đang thêm mới: Tạo ID mới nếu chưa có
      const newQuestion = {
        ...question,
        id: question.id || `CH_${Date.now()}`,
      };
      setQuestions((prevQuestions) => [newQuestion, ...prevQuestions]);
    }

    // Đóng trạng thái chỉnh sửa
    setEditingQuestion(undefined);
    setOpenModal(false); // Đóng modal sau khi lưu thành công
  };

  const handleEdit = (question: CauHoi) => {
    setEditingQuestion(question);
    setOpenModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) {
      setQuestions(questions.filter((q) => q.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 antialiased">
      <Navbar />

      {/* Header section môn học */}
      <SubjectHeader subject={subject} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
        {/* Thông tin môn học & Mini Metrics Inline Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition">
            <SubjectInfo subject={subject} />
          </div>

          {/* Quick Info Sidebar Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles size={16} /> Thông số quản lý
              </div>
              <h3 className="text-xl font-extrabold text-white">
                Ngân hàng đề {subject.code}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bộ câu hỏi được phân loại theo Module và chủ đề giúp tạo đề thi
                tự động chính xác.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-800">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-medium">
                  <HelpCircle size={14} /> Câu hỏi
                </div>
                <div className="text-xl font-black text-white mt-1">
                  {questions.length}
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                  <Layers size={14} /> Module
                </div>
                <div className="text-xl font-black text-white mt-1">
                  {modules.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thanh Lọc & Tìm Kiếm */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <QuestionFilter
            keyword={keyword}
            setKeyword={setKeyword}
            selectedModule={selectedModule}
            setSelectedModule={setSelectedModule}
            selectedDifficulty={selectedDifficulty}
            setSelectedDifficulty={setSelectedDifficulty}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            selectedTopic={selectedTopic}
            setSelectedTopic={setSelectedTopic}
            modules={modules}
            topics={topics}
            onAddQuestion={() => {
              setEditingQuestion(undefined);
              setOpenModal(true);
            }}
          />
        </div>

        {/* Danh sách Câu hỏi */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileQuestion size={20} className="text-indigo-600" />
              Danh sách câu hỏi
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full">
                {filteredQuestions.length}
              </span>
            </h2>

            {filteredQuestions.length > 0 && (
              <p className="text-xs text-slate-500">
                Hiển thị trang {currentPage} / {totalPages || 1}
              </p>
            )}
          </div>

          {displayQuestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <SearchX size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Không tìm thấy câu hỏi phù hợp
              </h3>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                Thử điều chỉnh lại bộ lọc tìm kiếm hoặc thêm mới câu hỏi cho môn
                học này.
              </p>
              <button
                onClick={() => {
                  setEditingQuestion(undefined);
                  setOpenModal(true);
                }}
                className="mt-5 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
              >
                <Plus size={16} /> Thêm câu hỏi ngay
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {displayQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 overflow-hidden"
                >
                  <QuestionCard
                    question={question}
                    index={(currentPage - 1) * pageSize + index}
                    onEdit={() => handleEdit(question)}
                    onDelete={() => handleDelete(question.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="flex justify-center pt-2">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </main>

      {/* Modal Thêm / Sửa Câu Hỏi */}
      <AddQuestionModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setEditingQuestion(undefined);
        }}
        onSave={handleSave}
        modules={modules}
        editQuestion={editingQuestion}
      />
    </div>
  );
}
