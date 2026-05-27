import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { courtsRegistry } from "@/data/courts";

interface CourtComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Combobox для выбора суда. Не используем Radix Popover потому что внутри Dialog
 * его focus-trap блокирует прокрутку колесом и списка нельзя пролистать.
 * Поэтому здесь обычный absolute-позиционированный div с native overflow-y-auto.
 */
export function CourtCombobox({ value, onChange, placeholder = "Выберите или введите суд" }: CourtComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Закрытие при клике вне.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Закрытие по Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courtsRegistry;
    return courtsRegistry.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  const exactExists = courtsRegistry.some((c) => c.toLowerCase() === query.trim().toLowerCase());
  const showCustomOption = query.trim().length > 0 && !exactExists;

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div
          className="absolute left-0 right-0 mt-1 z-50 rounded-md border bg-popover text-popover-foreground shadow-lg overflow-hidden"
          // блокируем bubble колеса вверх, иначе scroll-lock у Radix Dialog съедает событие
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Поиск */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск суда..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Список */}
          <div
            className="max-h-[280px] overflow-y-auto overscroll-contain py-1"
            style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(215,16%,70%) transparent" }}
          >
            {showCustomOption && (
              <button
                type="button"
                onClick={() => {
                  onChange(query.trim());
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                Использовать &laquo;{query.trim()}&raquo;
              </button>
            )}

            {filtered.length === 0 && !showCustomOption && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">Ничего не найдено</div>
            )}

            {filtered.length > 0 && (
              <div className="px-1 pt-1">
                <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">Справочник</div>
                {filtered.map((court) => (
                  <button
                    key={court}
                    type="button"
                    onClick={() => {
                      onChange(court);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                      value === court && "bg-accent/60",
                    )}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === court ? "opacity-100" : "opacity-0")} />
                    <span className="truncate text-left">{court}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
