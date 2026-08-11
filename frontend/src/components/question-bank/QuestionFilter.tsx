"use client";

interface Props {
  keyword: string;
  setKeyword: (value: string) => void;

  selectedModule: string;
  setSelectedModule: (value: string) => void;

  selectedType: string;
  setSelectedType: (value: string) => void;

  selectedDifficulty: string;
  setSelectedDifficulty: (value: string) => void;

  selectedTopic: string;
  setSelectedTopic: (value: string) => void;

  modules: string[];
  topics: string[];

  onAddQuestion: () => void;
}

export default function QuestionFilter({
  keyword,
  setKeyword,

  selectedType,
  setSelectedType,

  onAddQuestion,
}: Props) {
  return (
    <section className="max-w-7xl mx-auto px-6 mb-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm kiếm theo mã, nội dung..."
            className="lg:w-80 px-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#0066FF]"
          />

          <div className="flex flex-wrap gap-2">


            {/* BỘ LỌC LOẠI CÂU HỎI (ĐÃ THÊM ĐÚNG / SAI) */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
            >
              <option>Tất cả loại</option>
              <option>Trắc nghiệm</option>
              <option>Đúng / Sai</option>
              <option>Tự luận</option>
            </select>


            <button
              onClick={onAddQuestion}
              className="bg-[#0066FF] hover:bg-blue-700 text-white font-bold px-5 rounded-xl"
            >
              + Thêm câu hỏi
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}