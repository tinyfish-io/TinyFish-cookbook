// Dark mode variant - full page background
export function BackgroundGradientSnippetDark() {
  return (
    <div className="fixed inset-0 -z-10 bg-neutral-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_560px_at_50%_200px,#38bdf8,transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#38bdf820_1px,transparent_1px),linear-gradient(to_bottom,#38bdf820_1px,transparent_1px)] bg-[size:18px_18px]" />
    </div>
  );
}

// Light mode variant - full page background with emerald blur
export default function BackgroundGradientSnippet() {
  return (
    <div className="fixed inset-0 -z-10 bg-white">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#d1d5db33_1px,transparent_1px),linear-gradient(to_bottom,#d1d5db33_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="absolute left-1/3 top-1/3 h-[500px] w-[500px] rounded-full bg-emerald-400 opacity-20 blur-[120px]" />
    </div>
  );
}
