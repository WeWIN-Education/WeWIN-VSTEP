"use client";
import { Button } from "@/components/ui/Button";
export default function GrammarErrorPage({ reset }: { reset: () => void }) { return <div className="classroom-panel mx-auto max-w-2xl space-y-4"><h1 className="text-xl font-bold">Chưa tải được Ngữ pháp</h1><p className="text-sm text-ink-muted">Kết nối có thể đang gián đoạn. Tiến độ đã lưu vẫn được giữ nguyên.</p><Button size="lg" onClick={reset}>Thử tải lại</Button></div>; }
