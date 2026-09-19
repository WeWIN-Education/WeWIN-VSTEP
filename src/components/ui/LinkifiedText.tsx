import type { ReactNode } from "react";

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<]+/gi;
const TRAILING_PUNCTUATION = /[.,!?;:'")\]}]+$/;

function splitTrailingPunctuation(value: string) {
  const match = value.match(TRAILING_PUNCTUATION);
  if (!match || match.index === undefined) return { url: value, trailing: "" };
  return { url: value.slice(0, match.index), trailing: match[0] };
}

type LinkifiedTextProps = {
  children: string | null | undefined;
  className?: string;
};

/** Turns URLs inside user/content text into safe external links. */
export function LinkifiedText({ children, className }: LinkifiedTextProps) {
  const text = children ?? "";
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let linkIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const { url, trailing } = splitTrailingPunctuation(raw);
    if (start > cursor) nodes.push(text.slice(cursor, start));

    if (url) {
      nodes.push(
        <a
          key={`url-${linkIndex}`}
          href={url.startsWith("www.") ? `https://${url}` : url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-semibold text-brand underline decoration-brand/40 underline-offset-2 hover:text-brand-dark"
        >
          {url}
        </a>,
      );
      linkIndex += 1;
    } else {
      nodes.push(raw);
    }
    if (trailing) nodes.push(trailing);
    cursor = start + raw.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <span className={className}>{nodes.length ? nodes : text}</span>;
}
