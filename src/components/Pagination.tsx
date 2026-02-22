import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg bg-purple-900/50 backdrop-blur-sm border-2 border-pink-500/50 text-white hover:border-pink-400 hover:bg-purple-800/60 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-pink-500/50 disabled:hover:bg-purple-900/50 transition-all shadow-lg neon-border"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2">
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-10 h-10 rounded-lg transition-all shadow-lg ${
              currentPage === page
                ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white neon-border border-2 border-pink-400"
                : "bg-purple-900/50 backdrop-blur-sm border-2 border-pink-500/50 text-white hover:border-pink-400 hover:bg-purple-800/60 neon-border"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg bg-purple-900/50 backdrop-blur-sm border-2 border-pink-500/50 text-white hover:border-pink-400 hover:bg-purple-800/60 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-pink-500/50 disabled:hover:bg-purple-900/50 transition-all shadow-lg neon-border"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}