"use client";

const STEPS = [
  { number: 1, label: "条件入力" },
  { number: 2, label: "規約承認" },
  { number: 3, label: "情報入力" },
  { number: 4, label: "決済" },
];

export default function StepIndicator({
  currentStep,
}: {
  currentStep: number;
}) {
  return (
    <nav className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center space-x-4">
        {STEPS.map((step, index) => {
          const isActive = step.number === currentStep;
          const isDone = step.number < currentStep;
          return (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    isActive
                      ? "bg-[#2D4030] text-white"
                      : isDone
                        ? "bg-[#2D4030]/60 text-white"
                        : "bg-gray-300 text-white opacity-40"
                  }`}
                >
                  {isDone ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`text-xs mt-2 transition-all ${
                    isActive
                      ? "font-bold text-[#2D4030]"
                      : isDone
                        ? "text-[#2D4030]/60"
                        : "opacity-40"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 h-1 mb-4 mx-1 rounded-full transition-all ${
                    isDone ? "bg-[#2D4030]/60" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
