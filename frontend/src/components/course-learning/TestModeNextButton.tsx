'use client';

interface TestModeNextButtonProps {
  onNext: () => void;
  onPrev?: () => void;
  disabled?: boolean;
  disabledPrev?: boolean;
}

// Chỉ hiển thị khi NEXT_PUBLIC_TEST_MODE=true (đặt trong .env.local / .env.development).
// KHÔNG bật biến này ở môi trường production.
export default function TestModeNextButton({
  onNext,
  onPrev,
  disabled,
  disabledPrev,
}: TestModeNextButtonProps) {
  const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true';

  if (!isTestMode) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-yellow-300 bg-yellow-50 px-3 py-2 shadow-lg">
      <span className="text-xs font-semibold text-yellow-800">TEST MODE</span>

      {onPrev && (
        <button
          onClick={onPrev}
          disabled={disabledPrev}
          className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-medium text-yellow-900 hover:bg-yellow-300 disabled:opacity-40"
        >
          ← Prev
        </button>
      )}

      <button
        onClick={onNext}
        disabled={disabled}
        className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-medium text-yellow-950 hover:bg-yellow-500 disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
}