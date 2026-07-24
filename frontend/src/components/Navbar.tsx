"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showExploreMenu, setShowExploreMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const exploreRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const [role, setRole] = useState("");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");
    const savedRole = (localStorage.getItem("role") || "").toLowerCase();
    setRole(savedRole);

    const handleClickOutside = (event: MouseEvent) => {
      if (exploreRef.current && !exploreRef.current.contains(event.target as Node)) {
        setShowExploreMenu(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cấu hình đường dẫn Quản lý/Giảng dạy/Học tập riêng trong Avatar
  const getUserMenuConfig = () => {
    switch (role) {
      case "admin":
        return { label: "Quản lý hệ thống", path: "/admin" };
      case "manager":
        return { label: "Không gian quản lý", path: "/training-management" };
      case "instructor":
      case "faculty":
        return { label: "Không gian giảng dạy", path: "/instructor-management" };
      case "user":
      case "student":
      default:
        return { label: "Việc học của tôi", path: "/dashboard-student" };
    }
  };

  // Xử lý khi bấm vào danh mục trong Menu Khám phá
  const handleCategoryClick = (categoryName: string) => {
    setShowExploreMenu(false);

    // Đường dẫn gốc được tính toán động dựa vào quyền tài khoản hiện tại
    const basePath = getBasePathByRole();

    // Đẩy kèm tham số danh mục lọc ra URL của trang đó
    router.push(`${basePath}?category=${encodeURIComponent(categoryName)}`);
  };

  const handleLogout = () => {
    localStorage.clear();
    alert("Đã đăng xuất tài khoản!");
    setIsLoggedIn(false);
    setShowUserMenu(false);
    router.push("/");
  };

  const menuConfig = getUserMenuConfig();

  const getAvatarText = () => {
    switch (role) {
      case "admin": return "AD";
      case "manager": return "MN";
      case "instructor":
      case "faculty": return "GV";
      default: return "ST";
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-3.5 flex justify-between items-center font-sans">
      {/* KHU VỰC BÊN TRÁI */}
      <div className="flex items-center space-x-6">

        {/* LOGO: LUÔN VỀ /home NẾU ĐÃ ĐĂNG NHẬP (BẤT KỂ ROLE NÀO) */}
        <Link
          href={isLoggedIn ? "/home" : "/"}
          className="text-base font-black text-[#0066FF] tracking-tight no-underline"
        >
          LUMER <span className="text-blue-400 font-medium text-xs">elearning</span>
        </Link>

        {/* NÚT KHÁM PHÁ THẢ XUỐNG - Sẽ ẨN nếu là Giảng viên hoặc Admin */}
        {!isFacultyOrAdmin && (
          <div className="relative" ref={exploreRef}>
            <button
              type="button"
              onClick={() => setShowExploreMenu(!showExploreMenu)}
              className="bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition select-none border-none"
            >
              Khám phá ▾
            </button>
            {showExploreMenu && (
              <div className="absolute left-0 mt-2 w-[550px] bg-white border border-gray-200 rounded-2xl shadow-xl p-5 grid grid-cols-2 gap-6 z-50">
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase text-[#0066FF] tracking-wider">
                    Khám phá danh mục
                  </h4>
                  <div className="flex flex-col space-y-2 text-xs font-bold text-gray-600">
                    {["Khoa học Máy tính", "An ninh mạng", "Phát triển Web", "Khoa học Dữ liệu & AI", "Thiết kế Đồ họa"].map((cat) => (
                      <span
                        key={cat}
                        onClick={() => handleCategoryClick(cat)}
                        className="hover:text-[#0066FF] cursor-pointer transition"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase text-gray-400 tracking-wider">
                    Chứng chỉ chuyên môn
                  </h4>
                  <div className="flex flex-col space-y-2 text-xs font-medium text-gray-500">
                    {["Google Career Certificates", "Infosec", "Princeton University"].map((cert) => (
                      <span
                        key={cert}
                        onClick={() => handleCategoryClick(cert)}
                        className="hover:text-gray-800 cursor-pointer transition"
                      >
                        {cert === "Google Career Certificates" ? "Chứng chỉ Google Career" : cert === "Infosec" ? "Hệ thống bảo mật Infosec" : "Princeton Academic Program"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          type="text"
          placeholder="Bạn muốn học gì tại LUMER?"
          className="hidden md:block border border-gray-200 bg-slate-50 rounded-full px-4 py-1.5 text-xs w-64 focus:outline-none focus:border-blue-500 transition"
        />
      </div>

      {/* KHU VỰC BÊN PHẢI */}
      <div className="flex items-center space-x-4">
        {isLoggedIn ? (
          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 bg-[#0b1b35] hover:bg-slate-800 text-white font-black text-xs rounded-full flex items-center justify-center cursor-pointer border border-slate-200 transition uppercase"
            >
              {getAvatarText()}
            </button>

            {/* MENU AVATAR */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-50 divide-y divide-gray-100">
                <div className="py-1">
                  {/* Nút vào trang làm việc tương ứng với Role */}
                  <Link
                    href={menuConfig.path}
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-2 text-xs font-bold text-gray-700 hover:bg-slate-50 hover:text-[#0066FF] transition no-underline"
                  >
                    {menuConfig.label}
                  </Link>

                  {/* Nút quay lại trang chủ /home cho nhanh */}
                  <Link
                    href="/home"
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-2 text-xs font-medium text-gray-600 hover:bg-slate-50 hover:text-[#0066FF] transition no-underline"
                  >
                    Trang chủ khóa học
                  </Link>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition cursor-pointer border-none bg-transparent"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link href="/login?mode=login" className="text-xs font-bold text-gray-700 hover:text-blue-600 transition no-underline">
              Đăng nhập
            </Link>
            <Link href="/login?mode=register" className="bg-blue-50 hover:bg-blue-100 text-[#0066FF] border border-blue-100 text-xs font-bold px-4 py-2 rounded-xl transition no-underline">
              Đăng ký tài khoản
            </Link>
          </>
        )}
      </div>
    </header>
  );
}