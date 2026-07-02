import { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line-hairline bg-surface dark:border-white/10 dark:bg-[#161615]">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-line-hairline text-xs text-ink-muted dark:border-white/10">{children}</thead>;
}

export function Th({ children }: { children?: ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>;
}

export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} className={`border-b border-line-hairline last:border-0 dark:border-white/10 ${onClick ? "cursor-pointer hover:bg-plane dark:hover:bg-white/5" : ""}`}>
      {children}
    </tr>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="p-10 text-center text-sm text-ink-muted">{message}</div>;
}
