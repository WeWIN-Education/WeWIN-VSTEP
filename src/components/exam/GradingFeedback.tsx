const labels: Record<string, string> = {
  task_fulfillment: "Đáp ứng đề",
  organization: "Tổ chức bài",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
  fluency_coherence: "Độ trôi chảy",
  pronunciation: "Phát âm",
};

export function GradingFeedback({ value }: { value: unknown }) {
  if (!Array.isArray(value)) return null;

  return <div className="mt-5 space-y-4">{value.map((raw, index) => {
    const report = asRecord(raw);
    if (!report) return null;
    const feedback = asRecord(report.direct_feedback_vi) ?? {};
    const criteria = asRecord(report.scores) ?? asRecord(report.criteria) ?? {};
    const title = gradingReportTitle(report);
    const score = typeof report.task_score === "number" ? `${report.task_score}/10` : "Chưa đủ dữ liệu";
    const limiters = firstStringArray(feedback.three_main_score_limiters) ?? firstStringArray(feedback.top_priorities);
    const nextRequirements = firstStringArray(feedback.next_score_requirements);

    return <article key={String(report.id ?? index)} className="rounded-2xl bg-surface p-5"><h3 className="font-bold text-brand">{title} · {score}</h3>{typeof feedback.current_reality === "string" ? <p className="mt-2 text-sm">{feedback.current_reality}</p> : null}<div className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(criteria).map(([key, rawCriterion]) => { const criterion = asRecord(rawCriterion); if (!criterion) return null; return <div key={key} className="rounded-xl bg-white p-3 text-sm"><b>{labels[key] ?? key}: {typeof criterion.score === "number" ? criterion.score : "—"}</b>{typeof criterion.evidence === "string" ? <p className="mt-1 text-ink-muted">{criterion.evidence}</p> : null}</div>; })}</div>{typeof feedback.why_not_higher === "string" ? <p className="mt-3 text-sm"><b>Vì sao chưa cao hơn:</b> {feedback.why_not_higher}</p> : null}{typeof feedback.highest_priority_fix === "string" ? <p className="mt-3 text-sm"><b>Ưu tiên cải thiện:</b> {feedback.highest_priority_fix}</p> : null}{limiters?.length ? <div className="mt-3 text-sm"><b>Điểm cần ưu tiên:</b><ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">{limiters.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}{nextRequirements?.length ? <div className="mt-3 text-sm"><b>Để tiến bộ ở bước tiếp theo:</b><ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">{nextRequirements.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}</article>;
  })}</div>;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function firstStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value as string[] : undefined;
}

function gradingReportTitle(report: Record<string, unknown>) {
  const raw = String(report.task_type ?? report.part ?? report.id ?? "Phần thi").toLowerCase();
  const skill = raw.includes("speak") || raw.includes("part") && !raw.includes("task") ? "Nói" : "Viết";
  const number = raw.match(/(?:task|part)[-_ ]?(\d+)/)?.[1];
  return number ? `${skill} · Phần ${number}` : skill;
}
