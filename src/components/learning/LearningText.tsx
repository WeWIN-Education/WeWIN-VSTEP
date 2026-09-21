import { Fragment } from "react";
import { LinkifiedText } from "@/components/ui/LinkifiedText";

function Inline({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}><LinkifiedText>{part.startsWith("`") ? part.slice(1, -1) : part}</LinkifiedText></Fragment>)}</>;
}

/** A small, escaped-text renderer for the supported lesson template; never executes HTML. */
export function LearningText({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) { nodes.push(<h2 key={i} className="text-lg font-bold text-ink"><Inline text={heading[2]} /></h2>); continue; }
    const list = /^(?:-\s+|\d+\.\s+)/.test(line);
    if (list) {
      const ordered = /^\d+\./.test(line);
      const pattern = ordered ? /^\d+\.\s+/ : /^-\s+/;
      const entries = [];
      const start = i;
      while (i < lines.length && pattern.test(lines[i].trim())) {
        const value = lines[i].trim().replace(pattern, "");
        entries.push(<li key={i}><Inline text={value.replace(/^\[ \]\s*/, "")} /></li>);
        i++;
      }
      i--;
      nodes.push(ordered ? <ol key={start} className="list-decimal space-y-2 pl-5">{entries}</ol> : <ul key={start} className="list-disc space-y-2 pl-5">{entries}</ul>);
      continue;
    }
    nodes.push(<p key={i}><Inline text={line} /></p>);
  }
  return <div className="space-y-3 break-words text-sm leading-7">{nodes}</div>;
}
