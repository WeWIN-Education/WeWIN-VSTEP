"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import catalog from "@/data/grammar-catalog.json";
import styles from "./grammar.module.css";

type Lesson = { id: string; number: number; slug: string; title: string; summary: string; passed: number | null };
const searchable = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

export function GrammarCatalog({ lessons }: { lessons: Lesson[] }) {
  const [group, setGroup] = useState("all"), [query, setQuery] = useState("");
  const groupOf = (number: number) => catalog.topics.find(topic => topic.number === number)?.group;
  const visible = lessons.filter(lesson => (group === "all" || groupOf(lesson.number) === group) && searchable(`${lesson.number} ${lesson.title} ${lesson.summary}`).includes(searchable(query.trim())));
  return <section aria-label="Danh mục chuyên đề" className="space-y-5">
    <label className="relative block max-w-xl"><span className="mb-2 block text-sm font-semibold">Tìm chuyên đề</span><Search className="pointer-events-none absolute bottom-3.5 left-4 size-5 text-ink-muted" aria-hidden="true" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} className={`${styles.input} !pl-12`} placeholder="Tên hoặc số chuyên đề…" /></label>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Nhóm kiến thức">{[{ id: "all", title: "Tất cả" }, ...catalog.groups].map(item => {
      const count = lessons.filter(lesson => item.id === "all" || groupOf(lesson.number) === item.id).length;
      return <button key={item.id} type="button" className={styles.chip} aria-pressed={group === item.id} onClick={() => setGroup(item.id)}>{item.title}<span className="ml-2 text-xs tabular-nums">{count}</span></button>;
    })}</div>
    <p className="text-sm text-ink-muted" role="status">{visible.length} chuyên đề{group !== "all" ? ` · ${catalog.groups.find(item => item.id === group)?.title}` : ""}</p>
    {!visible.length ? <div className={styles.panel}><h2 className="font-bold">Chưa tìm thấy chuyên đề phù hợp</h2><p className="mt-2 text-sm text-ink-muted">Thử tên ngắn hơn hoặc chọn lại nhóm kiến thức.</p><button type="button" className="mt-3 min-h-11 font-semibold text-brand" onClick={() => { setGroup("all"); setQuery(""); }}>Xóa bộ lọc</button></div> : <div className={styles.grid}>{visible.map(lesson => <article key={lesson.id} className={`${styles.panel} flex flex-col gap-4`}>
      <div className="flex items-center justify-between gap-2"><BookOpen className="size-6 shrink-0 text-brand" aria-hidden="true" /><span className={styles.pill}>Chuyên đề {String(lesson.number).padStart(2, "0")}</span></div>
      <h2 className="text-xl font-bold">{lesson.title}</h2><p className="flex-1 text-sm leading-relaxed text-ink-muted">{lesson.summary}</p>
      {lesson.passed !== null && <p className="text-sm text-brand">{lesson.passed} bài đã đạt</p>}
      <Link prefetch={false} className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand" href={`/grammar/${lesson.slug}`}>Mở chuyên đề<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
    </article>)}</div>}
  </section>;
}
