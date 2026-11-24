"use client";

import React, { useEffect, useRef, useState } from "react";

export interface NoteTable {
  id: string;
  rows: string[][];
}

export interface CardNotePayload {
  html: string;
  tables: NoteTable[];
}

const NOTE_PREFIX = "__LFNOTE__:";

export const NOTE_TEXT_COLORS = [
  { name: "เทาเข้ม", hex: "#334155" },
  { name: "แดง", hex: "#DC2626" },
  { name: "น้ำเงิน", hex: "#2563EB" },
  { name: "เขียว", hex: "#059669" },
  { name: "ส้ม", hex: "#D97706" },
  { name: "ม่วง", hex: "#7C3AED" },
] as const;

function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

export function parseCardNote(raw?: string): CardNotePayload {
  if (!raw || !raw.trim()) {
    return { html: "", tables: [] };
  }
  if (raw.startsWith(NOTE_PREFIX)) {
    try {
      const parsed = JSON.parse(raw.slice(NOTE_PREFIX.length));
      return {
        html: typeof parsed.html === "string" ? parsed.html : "",
        tables: Array.isArray(parsed.tables) ? parsed.tables : [],
      };
    } catch {
      return { html: "", tables: [] };
    }
  }
  // Legacy plain-text note
  return { html: escapeHtmlText(raw), tables: [] };
}

export function serializeCardNote(payload: CardNotePayload): string {
  const hasText = stripHtmlToText(payload.html).length > 0;
  const hasTables = payload.tables.length > 0;
  if (!hasText && !hasTables) {
    return "";
  }
  return NOTE_PREFIX + JSON.stringify(payload);
}

export function hasCardNoteContent(raw?: string): boolean {
  if (!raw || !raw.trim()) return false;
  const parsed = parseCardNote(raw);
  return stripHtmlToText(parsed.html).length > 0 || parsed.tables.length > 0;
}

export function getNotePlainText(raw?: string): string {
  if (!raw || !raw.trim()) return "";
  const parsed = parseCardNote(raw);
  const text = stripHtmlToText(parsed.html);
  const tableBadge =
    parsed.tables.length > 0
      ? `[ตาราง ${parsed.tables.length} อัน]`
      : "";
  return [text, tableBadge].filter(Boolean).join(" ");
}

interface EditableCellProps {
  cellKey: string;
  initialHtml: string;
  isHeader: boolean;
  onChangeHtml: (html: string) => void;
}

function EditableCell({ cellKey, initialHtml, isHeader, onChangeHtml }: EditableCellProps) {
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cellRef.current && cellRef.current.innerHTML !== initialHtml) {
      cellRef.current.innerHTML = initialHtml;
    }
    // Only reset innerHTML when cell identity changes (e.g. new word / structural change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellKey]);

  return (
    <div
      ref={cellRef}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onChangeHtml((e.currentTarget as HTMLDivElement).innerHTML)}
      data-placeholder={isHeader ? "หัวข้อ..." : "..."}
      className={`min-w-[72px] min-h-[30px] px-2.5 py-1.5 text-xs outline-none focus:bg-amber-50/40 transition break-words whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300 ${
        isHeader ? "font-bold text-slate-700" : "font-normal text-slate-700"
      }`}
    />
  );
}

interface CardNoteEditorProps {
  wordId: string;
  rawValue: string;
  onSave: (wordId: string, serialized: string) => void;
}

export default function CardNoteEditor({ wordId, rawValue, onSave }: CardNoteEditorProps) {
  const initialParsed = parseCardNote(rawValue);
  const [tables, setTables] = useState<NoteTable[]>(initialParsed.tables);
  const [activeColor, setActiveColor] = useState<string>(NOTE_TEXT_COLORS[0].hex);
  const [showTableCreator, setShowTableCreator] = useState(false);
  const [newRows, setNewRows] = useState(2);
  const [newCols, setNewCols] = useState(2);
  const [saveIndicator, setSaveIndicator] = useState<"saved" | "saving">("saved");

  const editorRef = useRef<HTMLDivElement>(null);
  const htmlRef = useRef<string>(initialParsed.html);
  const tablesRef = useRef<NoteTable[]>(initialParsed.tables);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWordIdRef = useRef<string>(wordId);

  // Sync editor DOM when switching to a different word or when cloud sync loads a note while empty
  useEffect(() => {
    const parsed = parseCardNote(rawValue);
    const wordChanged = lastWordIdRef.current !== wordId;

    if (wordChanged) {
      lastWordIdRef.current = wordId;
      htmlRef.current = parsed.html;
      tablesRef.current = parsed.tables;
      setTables(parsed.tables);
      setShowTableCreator(false);
      if (editorRef.current) {
        editorRef.current.innerHTML = parsed.html;
      }
      setSaveIndicator("saved");
    } else if (editorRef.current && !editorRef.current.matches(":focus")) {
      // If cloud sync updated the note while user isn't actively typing in it
      if (parsed.html !== htmlRef.current && stripHtmlToText(htmlRef.current) === "") {
        htmlRef.current = parsed.html;
        editorRef.current.innerHTML = parsed.html;
      }
      if (parsed.tables.length > 0 && tablesRef.current.length === 0) {
        tablesRef.current = parsed.tables;
        setTables(parsed.tables);
      }
    }
  }, [wordId, rawValue]);

  // Set initial HTML on first mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = htmlRef.current;
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const scheduleSave = (nextHtml: string, nextTables: NoteTable[], immediate = false) => {
    htmlRef.current = nextHtml;
    tablesRef.current = nextTables;
    const serialized = serializeCardNote({ html: nextHtml, tables: nextTables });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (immediate) {
      onSave(wordId, serialized);
      setSaveIndicator("saved");
      return;
    }

    setSaveIndicator("saving");
    debounceTimerRef.current = setTimeout(() => {
      onSave(wordId, serialized);
      setSaveIndicator("saved");
    }, 550);
  };

  const applyColor = (hex: string) => {
    setActiveColor(hex);
    try {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("foreColor", false, hex);
    } catch {
      // Ignore if browser blocks execCommand
    }
    if (editorRef.current) {
      scheduleSave(editorRef.current.innerHTML, tablesRef.current);
    }
  };

  const applyBold = () => {
    try {
      document.execCommand("bold");
    } catch {
      // Ignore
    }
    if (editorRef.current) {
      scheduleSave(editorRef.current.innerHTML, tablesRef.current);
    }
  };

  const handleCreateTable = () => {
    const rCount = Math.min(10, Math.max(1, newRows));
    const cCount = Math.min(6, Math.max(1, newCols));
    const newTable: NoteTable = {
      id: `tbl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rows: Array.from({ length: rCount }, () => Array.from({ length: cCount }, () => "")),
    };
    const updatedTables = [...tablesRef.current, newTable];
    setTables(updatedTables);
    setShowTableCreator(false);
    scheduleSave(htmlRef.current, updatedTables, true);
  };

  const updateCell = (tableIndex: number, rowIndex: number, colIndex: number, cellHtml: string) => {
    const updatedTables = tablesRef.current.map((tbl, tIdx) => {
      if (tIdx !== tableIndex) return tbl;
      const updatedRows = tbl.rows.map((row, rIdx) => {
        if (rIdx !== rowIndex) return row;
        const nextRow = [...row];
        nextRow[colIndex] = cellHtml;
        return nextRow;
      });
      return { ...tbl, rows: updatedRows };
    });
    tablesRef.current = updatedTables;
    scheduleSave(htmlRef.current, updatedTables);
  };

  const addTableRow = (tableIndex: number) => {
    const updatedTables = tablesRef.current.map((tbl, tIdx) => {
      if (tIdx !== tableIndex) return tbl;
      const colCount = tbl.rows[0]?.length || 2;
      return { ...tbl, rows: [...tbl.rows, Array.from({ length: colCount }, () => "")] };
    });
    setTables(updatedTables);
    scheduleSave(htmlRef.current, updatedTables, true);
  };

  const removeTableRow = (tableIndex: number) => {
    const updatedTables = tablesRef.current.map((tbl, tIdx) => {
      if (tIdx !== tableIndex || tbl.rows.length <= 1) return tbl;
      return { ...tbl, rows: tbl.rows.slice(0, -1) };
    });
    setTables(updatedTables);
    scheduleSave(htmlRef.current, updatedTables, true);
  };

  const addTableCol = (tableIndex: number) => {
    const updatedTables = tablesRef.current.map((tbl, tIdx) => {
      if (tIdx !== tableIndex) return tbl;
      if ((tbl.rows[0]?.length || 0) >= 6) return tbl;
      return { ...tbl, rows: tbl.rows.map((r) => [...r, ""]) };
    });
    setTables(updatedTables);
    scheduleSave(htmlRef.current, updatedTables, true);
  };

  const removeTableCol = (tableIndex: number) => {
    const updatedTables = tablesRef.current.map((tbl, tIdx) => {
      if (tIdx !== tableIndex || (tbl.rows[0]?.length || 0) <= 1) return tbl;
      return { ...tbl, rows: tbl.rows.map((r) => r.slice(0, -1)) };
    });
    setTables(updatedTables);
    scheduleSave(htmlRef.current, updatedTables, true);
  };

  const deleteTable = (tableIndex: number) => {
    const updatedTables = tablesRef.current.filter((_, idx) => idx !== tableIndex);
    setTables(updatedTables);
    scheduleSave(htmlRef.current, updatedTables, true);
  };

  const clearEntireNote = () => {
    if (!hasCardNoteContent(serializeCardNote({ html: htmlRef.current, tables: tablesRef.current }))) {
      return;
    }
    if (!confirm("ต้องการล้างโน๊ตและตารางของคำศัพท์นี้ทั้งหมดใช่หรือไม่?")) return;
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setTables([]);
    scheduleSave("", [], true);
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-white/95 rounded-xl p-3 sm:p-4 border border-[#E5DDD8] space-y-3 mt-2 shadow-2xs"
    >
      {/* Toolbar: Text Colors, Bold, Insert Table, Clear & Save status */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 mr-0.5">สี:</span>
          {NOTE_TEXT_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyColor(c.hex);
              }}
              className={`w-5 h-5 rounded-full border-2 transition cursor-pointer ${
                activeColor === c.hex
                  ? "border-slate-700 scale-110 shadow-xs"
                  : "border-white ring-1 ring-slate-200 hover:scale-110"
              }`}
              style={{ backgroundColor: c.hex }}
              title={`เปลี่ยนสีตัวอักษรเป็นสี${c.name}`}
            />
          ))}

          <div className="w-px h-4 bg-slate-200 mx-1" />

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              applyBold();
            }}
            className="px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-black transition cursor-pointer"
            title="ทำตัวหนา (Bold)"
          >
            B
          </button>

          <button
            type="button"
            onClick={() => setShowTableCreator((prev) => !prev)}
            className={`px-2.5 py-0.5 rounded-md border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
              showTableCreator
                ? "bg-[#F5F1EE] border-[#A28C89] text-[#A28C89]"
                : "bg-white border-slate-200 text-slate-600 hover:bg-[#F5F1EE]/60 hover:text-[#A28C89]"
            }`}
            title="แทรกตารางแบบกำหนดจำนวนแถวและคอลัมน์เอง"
          >
            <span>📊</span>
            <span>+ ตาราง</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-400">
            {saveIndicator === "saving" ? "กำลังบันทึก..." : "✓ บันทึกแล้ว"}
          </span>
          <button
            type="button"
            onClick={clearEntireNote}
            className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition cursor-pointer"
            title="ล้างโน๊ตของคำนี้ทั้งหมด"
          >
            ล้างโน๊ต
          </button>
        </div>
      </div>

      {/* Optional Table Creator Panel (Only shown when user clicks "+ ตาราง") */}
      {showTableCreator && (
        <div className="bg-[#FAF7F5] border border-[#E5DDD8] rounded-xl p-2.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap text-xs font-bold text-slate-700">
            <div className="flex items-center gap-1.5">
              <span>แถว:</span>
              <button
                type="button"
                onClick={() => setNewRows((r) => Math.max(1, r - 1))}
                className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="w-5 text-center">{newRows}</span>
              <button
                type="button"
                onClick={() => setNewRows((r) => Math.min(10, r + 1))}
                className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span>คอลัมน์:</span>
              <button
                type="button"
                onClick={() => setNewCols((c) => Math.max(1, c - 1))}
                className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="w-5 text-center">{newCols}</span>
              <button
                type="button"
                onClick={() => setNewCols((c) => Math.min(6, c + 1))}
                className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCreateTable}
              className="px-3 py-1 rounded-lg bg-[#A28C89] hover:bg-[#8E7774] text-white text-[11px] font-bold transition shadow-xs cursor-pointer"
            >
              สร้างตาราง ({newRows}×{newCols})
            </button>
            <button
              type="button"
              onClick={() => setShowTableCreator(false)}
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 text-[11px] font-bold transition cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Main Rich Text Note Input (Auto-expands cleanly with content) */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          scheduleSave((e.currentTarget as HTMLDivElement).innerHTML, tablesRef.current);
        }}
        data-placeholder="พิมพ์โน๊ต คำอธิบาย หรือทริคจำของคุณเองที่นี่... (ลากคลุมคำแล้วกดจุดสีด้านบนเพื่อเปลี่ยนสีได้)"
        className="min-h-[76px] w-full bg-[#FCFBF9] border border-[#E5DDD8] focus:border-[#B8A3A0] focus:bg-white rounded-xl px-3.5 py-2.5 text-sm text-slate-700 leading-relaxed outline-none transition whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:text-xs"
      />

      {/* Optional User-Created Tables (Only rendered if user clicked "+ ตาราง") */}
      {tables.length > 0 && (
        <div className="space-y-3 pt-1">
          {tables.map((tbl, tIdx) => (
            <div key={tbl.id} className="border border-[#E5DDD8] rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-[#FAF7F5] px-2.5 py-1.5 border-b border-[#E5DDD8] flex items-center justify-between flex-wrap gap-1.5">
                <span className="text-[10px] font-extrabold text-[#A28C89] uppercase tracking-wider">
                  📊 ตาราง {tables.length > 1 ? `#${tIdx + 1}` : ""} ({tbl.rows.length}×{tbl.rows[0]?.length || 0})
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => addTableRow(tIdx)}
                    className="px-1.5 py-0.5 rounded bg-white border border-slate-200 hover:border-[#A28C89] text-[10px] font-bold text-slate-600 cursor-pointer"
                  >
                    + แถว
                  </button>
                  {tbl.rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTableRow(tIdx)}
                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 hover:border-rose-300 text-[10px] font-bold text-slate-500 cursor-pointer"
                    >
                      - แถว
                    </button>
                  )}
                  {(tbl.rows[0]?.length || 0) < 6 && (
                    <button
                      type="button"
                      onClick={() => addTableCol(tIdx)}
                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 hover:border-[#A28C89] text-[10px] font-bold text-slate-600 cursor-pointer"
                    >
                      + คอลัมน์
                    </button>
                  )}
                  {(tbl.rows[0]?.length || 0) > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTableCol(tIdx)}
                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 hover:border-rose-300 text-[10px] font-bold text-slate-500 cursor-pointer"
                    >
                      - คอลัมน์
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteTable(tIdx)}
                    className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 hover:bg-rose-500 hover:text-white text-[10px] font-bold text-rose-600 transition cursor-pointer ml-1"
                  >
                    ลบตาราง
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <tbody>
                    {tbl.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={rIdx === 0 ? "bg-[#F5F1EE]/65" : "bg-white"}
                      >
                        {row.map((cellHtml, cIdx) => (
                          <td
                            key={cIdx}
                            className="border border-[#E5DDD8] p-0 align-top"
                          >
                            <EditableCell
                              cellKey={`${wordId}-${tbl.id}-${rIdx}-${cIdx}`}
                              initialHtml={cellHtml}
                              isHeader={rIdx === 0}
                              onChangeHtml={(html) => updateCell(tIdx, rIdx, cIdx, html)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
