"use client";
import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function FacultyDashboard() {
  const menuItems = [
    {
      title: "Chương trình đào tạo mẫu",
      desc: "Quản lý và cấu trúc chi tiết khung chương trình",
      icon: "📋",
      path: "/training-management/curriculum",
    },
    // {
    //   title: "Phân công giảng dạy",
    //   desc: "Lịch dạy chi tiết và điều phối công việc giảng viên",
    //   icon: "👥",
    //   path: "/training-management/course-assignment",
    // },
    {
      title: "Duyệt khóa học",
      desc: "Kiểm tra, đánh giá chất lượng và phê duyệt các khóa học mới",
      icon: "✅",
      path: "/training-management/course-approval",
    },
    {
      title: "Quản lý khóa học",
      desc: "Chỉnh sửa, cập nhật nội dung bài học và học liệu",
      icon: "📚",
      path: "/training-management/course-management",
    },
    {
      title: "Quản lý môn học",
      desc: "Chỉnh sửa, cập nhật nội dung bài học và học liệu",
      icon: "📖",
      path: "/training-management/course-content",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 flex flex-col">
      <Navbar />

      {/* Banner */}
      <div className="bg-gradient-to-r from-[#1E88E5] to-[#0066FF] text-white px-8 py-12 md:px-16 relative">
        <h1 className="text-3xl font-bold tracking-wide mb-2">
          Quản LÝ ĐÀO TẠO
        </h1>
        <p className="text-blue-100 text-sm mb-6">
          Quản lý toàn bộ hệ thống chương trình và giảng dạy
        </p>

        <div className="flex items-center space-x-3 mt-4">
          <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-lg border-2 border-white/50">
            GV
          </div>
          <span className="font-medium text-sm">Xin chào, Nguyen Van A</span>
        </div>
      </div>

      {/* Grid 4 mục hiển thị rõ nét, không làm mờ */}
      <div className="max-w-7xl w-full mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href={item.path}
              onClick={(e) => {
                if (item.path === "#") {
                  e.preventDefault();
                  alert(`Tính năng "${item.title}" sẽ được kết nối cơ sở dữ liệu sau.`);
                }
              }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between text-inherit no-underline"
            >
              <div>
                <div className="text-3xl mb-4 bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center text-[#0066FF]">
                  {item.icon}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
              <div className="text-right mt-4 text-xs font-bold text-[#0066FF] hover:underline">
                Truy cập →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}