import { siteOrigin, publicPaths } from "@/lib/site-pages";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const mainHostnames = new Set(["wewin.edu.vn", "www.wewin.edu.vn"]);
const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_content", "gclid", "wbraid", "gbraid"];
type Fields = Record<string, string | boolean | undefined>;
type GoogleTag = (command: string, name: string | Date, fields?: Fields) => void;
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: GoogleTag };

let previousLocation = "";
let previousPathname = "";

function pagePath(pathname: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  if (publicPaths.includes(path)) return path;
  if (/^\/toeic\/tests\/[^/]+$/.test(path)) return "/toeic/tests";
  if (/^\/exam\/vstep\/[^/]+$/.test(path)) return "/exam/test";
  if (/^\/(blog|grammar|video)\/[^/]+$/.test(path)) return path.replace(/\/[^/]+$/, "");
  if (/^\/vocabulary\/topics\//.test(path)) return "/vocabulary/topics";
  return null;
}

function pageLocation(path: string) {
  const url = new URL(path, siteOrigin);
  const query = new URLSearchParams(window.location.search);
  for (const key of campaignKeys) {
    const value = query.get(key);
    if (value && /^[a-z0-9_.+~-]{1,100}$/i.test(value)) url.searchParams.set(key, value);
  }
  return url.href;
}

function externalReferrer() {
  try {
    const url = new URL(document.referrer);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin + "/" : "";
  } catch {
    return "";
  }
}

function googleTag(path: string, location: string, referrer: string) {
  if (!measurementId || !/^G-[A-Z0-9]+$/.test(measurementId) || window.location.origin !== siteOrigin) return null;
  const browser = window as AnalyticsWindow;
  if (browser.gtag) return browser.gtag;
  browser.dataLayer ??= [];
  browser.gtag = function () {
    // eslint-disable-next-line prefer-rest-params -- Match the Google tag command queue format.
    browser.dataLayer?.push(arguments);
  };
  browser.gtag("js", new Date());
  browser.gtag("config", measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: location,
    page_referrer: referrer,
    page_title: path,
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
  document.head.append(script);
  return browser.gtag;
}

export function trackPageView(pathname: string) {
  const path = pagePath(pathname);
  if (!path) {
    previousLocation = "";
    previousPathname = "";
    return;
  }
  const location = pageLocation(path);
  if (previousPathname === pathname && previousLocation === location) return;
  const referrer = previousLocation || externalReferrer();
  const tag = googleTag(path, location, referrer);
  if (!tag) return;
  tag("event", "page_view", {
    page_location: location,
    page_referrer: referrer,
    page_title: path,
    send_to: measurementId,
  });
  previousLocation = location;
  previousPathname = pathname;
}

function trackEvent(name: string, path: string, fields: Fields) {
  const location = pageLocation(path);
  const referrer = externalReferrer();
  googleTag(path, location, referrer)?.("event", name, {
    ...fields,
    page_location: location,
    page_referrer: referrer,
    page_title: path,
    send_to: measurementId,
  });
}

export function trackExam(event: "exam_started" | "exam_completed", mode: string) {
  if (!/^(full|practice|listening|reading|writing|speaking|part_[1-7])$/.test(mode)) return;
  const path = pagePath(window.location.pathname);
  if (path === "/toeic/tests" || path === "/exam/test") trackEvent(event, path, { exam_mode: mode });
}

export function trackMainSiteClick(anchor: HTMLAnchorElement) {
  if (anchor.protocol !== "https:" || !mainHostnames.has(anchor.hostname)) return;
  const path = pagePath(window.location.pathname);
  if (path) trackEvent("main_site_click", path, { destination_host: anchor.hostname });
}
