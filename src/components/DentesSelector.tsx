import React from "react";
import { IconX } from "@tabler/icons-react";

interface DentesSelectorProps {
  selectedTeeth: string[];
  onChange?: (teeth: string[]) => void;
  required?: boolean;
  readOnly?: boolean;
}

const UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
const UPPER_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"];
const LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"];
const LOWER_LEFT = ["31", "32", "33", "34", "35", "36", "37", "38"];

export function DentesSelector({
  selectedTeeth,
  onChange,
  required,
  readOnly = false,
}: DentesSelectorProps) {
  function toggleTooth(tooth: string) {
    if (readOnly || !onChange) return;
    if (selectedTeeth.includes(tooth)) {
      onChange(selectedTeeth.filter((t) => t !== tooth));
    } else {
      onChange([...selectedTeeth, tooth].sort((a, b) => Number(a) - Number(b)));
    }
  }

  function renderToothButton(tooth: string) {
    const isSelected = selectedTeeth.includes(tooth);
    return (
      <button
        key={tooth}
        type="button"
        disabled={readOnly}
        onClick={() => toggleTooth(tooth)}
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md text-[11px] sm:text-xs font-mono font-medium transition flex items-center justify-center shrink-0 select-none ${
          isSelected
            ? "bg-primary text-white font-bold shadow-xs scale-105"
            : readOnly
            ? "bg-surface-2/60 border border-border/50 text-muted-foreground/70"
            : "bg-surface-2 border border-border text-foreground hover:border-primary/50 hover:bg-surface-1"
        }`}
        title={`Dente ${tooth}`}
      >
        {tooth}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">
          Dentes (Numeração FDI) {required && <span className="text-error">*</span>}
        </label>
        <span className="text-[11px] text-muted-foreground">
          {selectedTeeth.length} dente(s) selecionado(s)
        </span>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 p-3 overflow-x-auto">
        <div className="min-w-[520px] space-y-2">
          {/* Arcada Superior */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center mb-1">
              Arcada Superior
            </div>
            <div className="flex items-center justify-center gap-1 sm:gap-1.5">
              <div className="flex gap-1">
                {UPPER_RIGHT.map(renderToothButton)}
              </div>
              <div className="w-px h-6 bg-border mx-1" />
              <div className="flex gap-1">
                {UPPER_LEFT.map(renderToothButton)}
              </div>
            </div>
          </div>

          {/* Divisor das arcadas */}
          <div className="border-t border-border/60 my-1" />

          {/* Arcada Inferior */}
          <div>
            <div className="flex items-center justify-center gap-1 sm:gap-1.5">
              <div className="flex gap-1">
                {LOWER_RIGHT.map(renderToothButton)}
              </div>
              <div className="w-px h-6 bg-border mx-1" />
              <div className="flex gap-1">
                {LOWER_LEFT.map(renderToothButton)}
              </div>
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center mt-1">
              Arcada Inferior
            </div>
          </div>
        </div>
      </div>

      {/* Chips de seleção */}
      {selectedTeeth.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground mr-1">Selecionados:</span>
          {selectedTeeth.map((tooth) => (
            <span
              key={tooth}
              className="inline-flex items-center gap-1 rounded-md bg-primary-tint border border-primary/20 px-2 py-0.5 text-xs font-mono font-medium text-primary"
            >
              {tooth}
              {!readOnly && onChange && (
                <button
                  type="button"
                  onClick={() => toggleTooth(tooth)}
                  className="hover:opacity-75"
                  title={`Remover dente ${tooth}`}
                >
                  <IconX size={12} />
                </button>
              )}
            </span>
          ))}
          {!readOnly && onChange && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-muted-foreground hover:text-error underline ml-2"
            >
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
