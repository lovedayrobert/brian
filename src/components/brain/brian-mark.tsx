/** Brian's mark: a brain drawn in hairlines, like the big one on his screen. */
export function BrianMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={(size * 24) / 32} viewBox="0 0 32 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 14.5C3.2 12.8 3.3 8.2 6.8 6.4 7.8 3.4 11.6 2.1 14.6 3.1 16.8 1.6 20.8 1.7 22.9 3.6 26.7 3.6 29.3 6.5 28.9 9.9 30.4 12.3 29.1 15.8 26.1 16.3 25 18.8 22 19.8 19.6 18.8L18.3 21.6H15.8L16.1 18.4C13.2 19.4 10.2 18.9 8.7 16.9 7.3 17.1 6.1 16 6 14.5Z" />
      <path d="M10.2 6.8C12 7.9 12.1 9.9 10.6 11.3" />
      <path d="M15 3.4C14.4 5.9 16.5 7.4 15.6 9.8 14.9 11.8 16.5 13.3 18.6 13" />
      <path d="M21 3.9C20.1 6.4 22.4 8 24.6 7.4" />
      <path d="M24.2 10.4C22.6 11.9 23.6 14.4 26.1 14.4" />
      <path d="M9.4 13.9C11.4 13.4 13 14.9 13 16.7" />
      <path d="M19.4 9.6C20.6 10.8 20.2 12.5 21.6 13.3" />
    </svg>
  );
}

/** The mark with the name, for headers. */
export function BrianLogo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <BrianMark size={30} />
      <span className="text-[17px] font-semibold leading-none tracking-tight">Brian</span>
    </span>
  );
}
