import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionBadge } from "../src/components/classroom/shared";
afterEach(() => vi.useRealTimers());
it.each([
  ["SCHEDULED", "2026-10-07T06:00:00Z", "2026-10-07T07:00:00Z", "Đã qua giờ học"],
  ["SCHEDULED", "2026-10-10T06:00:00Z", "2026-10-10T07:00:00Z", "Sắp diễn ra"],
  ["SCHEDULED", "2026-10-09T06:00:00Z", "2026-10-09T07:00:00Z", "Đến giờ học"],
  ["CANCELED", "2026-10-07T06:00:00Z", "2026-10-07T07:00:00Z", "Đã hủy"],
  ["ENDED", "2026-10-07T06:00:00Z", "2026-10-07T07:00:00Z", "Đã kết thúc"],
])("labels a %s session using its schedule without inventing attendance", (status, startsAt, endsAt, label) => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-09T06:30:00Z"));
  expect(renderToStaticMarkup(createElement(SessionBadge, { session: { status, startsAt, endsAt } }))).toContain(label);
});
