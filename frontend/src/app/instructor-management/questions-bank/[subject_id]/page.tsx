"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import SubjectHeader from "@/components/question-bank/SubjectHeader";
import SubjectInfoComponent from "@/components/SubjectInfo";
import QuestionFilter from "@/components/question-bank/QuestionFilter";
import QuestionCard from "@/components/question-bank//QuestionCard";
import Pagination from "@/components/question-bank/Pagination";
import AddQuestionModal from "@/components/question-bank/AddQuestionModal";
import { Question, SubjectInfo } from "@/types/questions-bank";
import Link from "next/link";
import {
  Plus,
  SearchX,
  Loader2,
  BookOpenCheck,
  HelpCircle,
  FileText
} from "lucide-react";

import {
  getQuestionsBySubjectAction,
  getSubjectDetailAction,
  getQuestionDetailAction, // 🎯 Gọi API chi tiết khi mở modal Sửa
  saveQuestionAction,
  deleteQuestionAction, // 🎯 1. Đã import thêm hàm Delete Action

} from "@/actions/getQuestionBank";

export default function QuestionBankDetailPage() {
  const params = useParams();

  // Lấy mã môn học từ URL
  const subjectId = (params?.subject_id as string) || (params?.id as string) || "";

  // State quản lý bộ lọc
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [modules, setModules] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);

  // State quản lý dữ liệu
  const [subjectData, setSubjectData] = useState<SubjectInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | undefined>();
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null); // 🎯 Câu hỏi đang được tải chi tiết để sửa

  // State bộ lọc
  const [keyword, setKeyword] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("Tất cả loại");

  // State phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  // 🎯 Danh sách câu hỏi (get-list) có thể không kèm đủ dữ liệu "rubrics" của câu tự luận.
  // Nên với các câu ESSAY, gọi thêm API chi tiết từng câu để lấy đủ tiêu chí đánh giá,
  // giúp hiển thị ngay ở danh sách ngoài mà không cần bấm Sửa.
  const enrichEssayRubrics = useCallback(async (list: Question[]): Promise<Question[]> => {
    const essayQuestions = list.filter(
      (q) => String(q.question_type).toUpperCase() === "ESSAY" && (!q.rubrics || q.rubrics.length === 0)
    );

    if (essayQuestions.length === 0) return list;

    const details = await Promise.all(
      essayQuestions.map((q) => getQuestionDetailAction(q.question_id))
    );

    const detailMap = new Map<string, Question>();
    essayQuestions.forEach((q, i) => {
      const detail = details[i];
      if (detail) detailMap.set(q.question_id, detail);
    });

    return list.map((q) => {
      const detail = detailMap.get(q.question_id);
      return detail ? { ...q, rubrics: detail.rubrics, options: detail.options } : q;
    });
  }, []);

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

      const baseQuestions = questionsRes || [];
      setQuestions(baseQuestions);

      // Bổ sung rubrics cho câu tự luận sau khi đã hiển thị danh sách cơ bản,
      // tránh chặn màn hình chờ nếu có nhiều câu tự luận.
      const enriched = await enrichEssayRubrics(baseQuestions);
      setQuestions(enriched);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  }, [subjectId, enrichEssayRubrics]);

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

  // 🎯 2. ĐÃ FIX HÀM DELETE: GỌI SERVER ACTION ĐỂ XÓA THỰC TRONG DATABASE
  const handleDelete = async (questionId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng đề?")) return;

    try {
      const result = await deleteQuestionAction(questionId, subjectId);

      if (result.success) {
        alert("Xóa câu hỏi thành công!");
        // Cập nhật lại UI sau khi xóa thành công
        setQuestions((prev) => prev.filter((q) => q.question_id !== questionId));
        await fetchData(); // Đồng bộ lại dữ liệu
      } else {
        alert(`Xóa thất bại: ${result.error || "Vui lòng thử lại!"}`);
      }
    } catch (error) {
      console.error("Lỗi khi xóa câu hỏi:", error);
      alert("Đã xảy ra lỗi hệ thống khi xóa câu hỏi!");
    }
  };

  // LOGIC LỌC CÂU HỎI ĐỘNG
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
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

  // 🎯 Gọi GET /questions/{question_id} để lấy đầy đủ options (trắc nghiệm)
  // và rubrics (tự luận) mới nhất trước khi mở modal Sửa, tránh trường hợp
  // dữ liệu từ danh sách câu hỏi (get-list) chưa kèm đủ 2 quan hệ này.
  const handleEdit = async (question: Question) => {
    setEditLoadingId(question.question_id);
    try {
      const detail = await getQuestionDetailAction(question.question_id);
      setEditingQuestion(detail || question); // fallback về dữ liệu cũ nếu API lỗi
      setOpenModal(true);
    } finally {
      setEditLoadingId(null);
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

      {/* 🎯 TAB CHUYỂN ĐỔI NGÂN HÀNG CÂU HỎI <-> NGÂN HÀNG ĐỀ THI */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-8">
          <button className="py-3 px-1 border-b-2 border-emerald-600 font-bold text-emerald-600 text-sm flex items-center gap-2">
            <HelpCircle size={18} />
            Ngân hàng câu hỏi
          </button>

          <Link
            href={`/instructor-management/exam-manage/${subjectId}`}
            className="py-3 px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-900 font-medium text-sm flex items-center gap-2 transition duration-200"
          >
            <FileText size={18} />
            Ngân hàng đề thi
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">

        {/* 1. THÔNG TIN MÔN HỌC & THỐNG KÊ */}
        <div className="grid grid-cols-1 gap-6 items-stretch">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <SubjectInfoComponent subject={currentSubject} />
          </div>
        </div>

        {/* 2. BỘ LỌC TÌM KIẾM */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <QuestionFilter
            keyword={keyword}
            setKeyword={setKeyword}
            selectedModule={selectedModule}
            setSelectedModule={setSelectedModule}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            selectedDifficulty={selectedDifficulty}
            setSelectedDifficulty={setSelectedDifficulty}
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
                      isEditLoading={editLoadingId === question.question_id}
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