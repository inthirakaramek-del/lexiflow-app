"use client";

import { useState, useMemo } from "react";
import { FOUNDATIONS_DATA, FoundationChapter } from "../data/foundationsData";

export default function FoundationsViewer() {
  const [selectedChapterId, setSelectedChapterId] = useState<string>("start_here");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [contentFilter, setContentFilter] = useState<"all" | "tables" | "mistakes" | "tips">("all");

  // Filter chapters based on search query
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return FOUNDATIONS_DATA;
    const q = searchQuery.toLowerCase().trim();
    return FOUNDATIONS_DATA.filter((ch) => ch.searchableText.includes(q));
  }, [searchQuery]);

  // Current active chapter
  const currentChapter = useMemo(() => {
    return (
      filteredChapters.find((ch) => ch.id === selectedChapterId) ||
      filteredChapters[0] ||
      FOUNDATIONS_DATA[0]
    );
  }, [filteredChapters, selectedChapterId]);

  // Parse lines into logical blocks: headings, tables, warnings, tips, normal text
  const formattedSections = useMemo(() => {
    if (!currentChapter) return [];
    const lines = currentChapter.lines;
    const sections: {
      type: "heading" | "subheading" | "warning" | "tip" | "text" | "bullet";
      content: string;
      sublines?: string[];
    }[] = [];

    let currentWarningLines: string[] | null = null;
    let currentTipLines: string[] | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Skip pure page numbers
      if (/^\d+$/.test(line) && line.length <= 2) continue;

      if (line.includes("จุดที่คนไทยมักพลาด")) {
        if (currentTipLines) {
          sections.push({ type: "tip", content: "เคล็ดลับ", sublines: currentTipLines });
          currentTipLines = null;
        }
        currentWarningLines = [];
        continue;
      }

      if (line.includes("เคล็ดลับ")) {
        if (currentWarningLines) {
          sections.push({ type: "warning", content: "จุดที่คนไทยมักพลาด", sublines: currentWarningLines });
          currentWarningLines = null;
        }
        currentTipLines = [];
        continue;
      }

      // Check if we hit a new major subsection while collecting warning or tip
      if (/^(\d+\.\d+|CHAPTER|REVIEW|START HERE)/.test(line)) {
        if (currentWarningLines) {
          sections.push({ type: "warning", content: "จุดที่คนไทยมักพลาด", sublines: currentWarningLines });
          currentWarningLines = null;
        }
        if (currentTipLines) {
          sections.push({ type: "tip", content: "เคล็ดลับ", sublines: currentTipLines });
          currentTipLines = null;
        }
      }

      if (currentWarningLines) {
        currentWarningLines.push(line);
        continue;
      }

      if (currentTipLines) {
        currentTipLines.push(line);
        continue;
      }

      if (/^CHAPTER\s+\d+|START HERE|REVIEW/i.test(line)) {
        sections.push({ type: "heading", content: line });
      } else if (/^\d+\.\d+/.test(line)) {
        sections.push({ type: "subheading", content: line });
      } else if (line.startsWith("•") || line.startsWith("-") || /^\d+\./.test(line)) {
        sections.push({ type: "bullet", content: line });
      } else {
        sections.push({ type: "text", content: line });
      }
    }

    if (currentWarningLines && currentWarningLines.length > 0) {
      sections.push({ type: "warning", content: "จุดที่คนไทยมักพลาด", sublines: currentWarningLines });
    }
    if (currentTipLines && currentTipLines.length > 0) {
      sections.push({ type: "tip", content: "เคล็ดลับ", sublines: currentTipLines });
    }

    return sections;
  }, [currentChapter]);

  return (
    <div className="flex-1 flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold tracking-wide w-fit">
            <span>📖</span>
            <span>คู่มือทางการจาก PDF ภาษาอังกฤษพื้นฐาน</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            English Foundations Guide
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            สรุปไวยากรณ์และโครงสร้างภาษาอังกฤษ 11 หัวข้อหลัก พร้อมตารางเปรียบเทียบ จุดที่คนไทยมักพลาด และเคล็ดลับการจำ
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col gap-2 w-full md:w-80">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา เช่น Tense, be, did, in/on/at..."
              className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 focus:border-emerald-400 rounded-2xl px-4 py-3 pl-10 text-sm text-white placeholder-slate-400 focus:outline-none transition-all shadow-inner"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-white text-xs bg-white/10 rounded-full w-5 h-5 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>พบ {filteredChapters.length} บทที่เกี่ยวข้อง</span>
            {searchQuery && <span className="text-emerald-400 font-semibold">กรองตามคำค้น</span>}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Chapter Selector + Right Content Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Chapter Navigation List */}
        <div className="lg:col-span-4 flex flex-col gap-3 bg-white/90 backdrop-blur-md border border-[#E5E0DC] rounded-3xl p-4 shadow-sm max-h-[800px] overflow-y-auto">
          <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>สารบัญบทเรียน (11 บท + สรุป)</span>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">
              {FOUNDATIONS_DATA.length} หัวข้อ
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {filteredChapters.map((ch) => {
              const isSelected = ch.id === currentChapter?.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChapterId(ch.id)}
                  className={`flex items-start gap-3 p-3 rounded-2xl text-left transition-all duration-200 border ${
                    isSelected
                      ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-700 shadow-md translate-x-1"
                      : "bg-transparent hover:bg-slate-50 text-slate-700 border-transparent hover:border-slate-200/60"
                  }`}
                >
                  <span className="text-xl p-1 bg-white/10 rounded-xl flex-shrink-0">{ch.icon}</span>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isSelected ? "bg-white/20 text-emerald-300" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {ch.tag}
                      </span>
                    </div>
                    <span className="text-xs font-bold truncate leading-snug">{ch.title}</span>
                    <span
                      className={`text-[11px] line-clamp-1 ${
                        isSelected ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {ch.summary}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Chapter Detailed Reader */}
        <div className="lg:col-span-8 flex flex-col gap-6 bg-white/95 backdrop-blur-md border border-[#E5E0DC] rounded-3xl p-6 sm:p-8 shadow-sm min-h-[700px]">
          {/* Chapter Top Title Card */}
          <div className="border-b border-slate-100 pb-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentChapter?.icon}</span>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs uppercase tracking-wider border border-indigo-100">
                  {currentChapter?.tag}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  หน้า PDF {currentChapter?.startPage}
                  {currentChapter?.endPage !== currentChapter?.startPage && `–${currentChapter?.endPage}`}
                </span>
              </div>

              {/* View filter tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setContentFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    contentFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  onClick={() => setContentFilter("mistakes")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    contentFilter === "mistakes"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-amber-600"
                  }`}
                >
                  ⚠️ จุดที่มักพลาด
                </button>
                <button
                  onClick={() => setContentFilter("tips")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    contentFilter === "tips"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-emerald-700"
                  }`}
                >
                  💡 เคล็ดลับ
                </button>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900">{currentChapter?.title}</h2>
            <p className="text-sm text-slate-500 leading-relaxed">{currentChapter?.summary}</p>
          </div>

          {/* Render Sections */}
          <div className="flex flex-col gap-4 text-slate-700">
            {formattedSections
              .filter((sec) => {
                if (contentFilter === "mistakes") return sec.type === "warning";
                if (contentFilter === "tips") return sec.type === "tip";
                return true;
              })
              .map((sec, idx) => {
                if (sec.type === "warning") {
                  return (
                    <div
                      key={idx}
                      className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-5 shadow-sm flex flex-col gap-2.5 my-2"
                    >
                      <div className="flex items-center gap-2 text-amber-800 font-extrabold text-sm">
                        <span className="text-lg">⚠️</span>
                        <span>จุดที่คนไทยมักพลาด (Common Thai Learner Mistakes)</span>
                      </div>
                      <div className="flex flex-col gap-2 text-xs sm:text-sm text-amber-950 font-medium pl-6 leading-relaxed">
                        {sec.sublines?.map((sub, sIdx) => (
                          <div key={sIdx} className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{sub}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (sec.type === "tip") {
                  return (
                    <div
                      key={idx}
                      className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-5 shadow-sm flex flex-col gap-2.5 my-2"
                    >
                      <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                        <span className="text-lg">💡</span>
                        <span>เคล็ดลับการจำและนำไปใช้ (Pro Tips)</span>
                      </div>
                      <div className="flex flex-col gap-2 text-xs sm:text-sm text-emerald-950 font-medium pl-6 leading-relaxed">
                        {sec.sublines?.map((sub, sIdx) => (
                          <div key={sIdx} className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{sub}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (sec.type === "subheading") {
                  return (
                    <h3
                      key={idx}
                      className="text-base sm:text-lg font-bold text-slate-800 mt-4 border-l-4 border-indigo-500 pl-3 py-0.5"
                    >
                      {sec.content}
                    </h3>
                  );
                }

                if (sec.type === "bullet") {
                  return (
                    <div key={idx} className="flex items-start gap-2.5 pl-2 text-sm text-slate-700">
                      <span className="text-indigo-500 font-bold mt-1 text-xs">◆</span>
                      <span className="leading-relaxed">{sec.content}</span>
                    </div>
                  );
                }

                return (
                  <p key={idx} className="text-sm leading-relaxed text-slate-600">
                    {sec.content}
                  </p>
                );
              })}
          </div>

          {/* Quick Chapter Navigation Prev / Next */}
          <div className="border-t border-slate-100 pt-6 mt-6 flex items-center justify-between text-xs font-bold text-slate-500">
            {(() => {
              const curIdx = FOUNDATIONS_DATA.findIndex((c) => c.id === currentChapter?.id);
              const prevCh = FOUNDATIONS_DATA[curIdx - 1];
              const nextCh = FOUNDATIONS_DATA[curIdx + 1];

              return (
                <>
                  {prevCh ? (
                    <button
                      onClick={() => setSelectedChapterId(prevCh.id)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all"
                    >
                      <span>←</span>
                      <span>บทก่อนหน้า ({prevCh.tag})</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  {nextCh ? (
                    <button
                      onClick={() => setSelectedChapterId(nextCh.id)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm"
                    >
                      <span>บทถัดไป ({nextCh.tag})</span>
                      <span>→</span>
                    </button>
                  ) : (
                    <div />
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
