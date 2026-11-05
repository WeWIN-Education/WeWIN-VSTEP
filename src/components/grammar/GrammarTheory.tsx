import Image from "next/image";
import { ArrowDown, ArrowRight, BookOpen, Lightbulb, Milk, Repeat2, Shapes, Sparkles, UserRound, UsersRound, Utensils } from "lucide-react";
import type { GrammarContent } from "@/lib/grammar-rules";
import { examplePair, theorySentences } from "./theory-format";
import styles from "./theory.module.css";

// Highlight phrases already present in the lesson, without adding grammar rules.
function Emphasis({ text }: { text: string }) {
  const pattern = /((?<![\p{L}])(?:How many|How much|am\/is\/are|he\/she\/it|doesn’t|does|who(?:m|se)?|which|that|person|people|child(?:ren)?|foot|feet|milk|paper|now|at the moment|Every Sunday|often|usually|today|Look!|Keep silent!|-s\/-es|-s|-es|-f\/-fe|-ves|-ing)(?![\p{L}]))/giu;
  return text.split(pattern).map((part, index) => index % 2 ? <strong key={index} className={styles.emphasis}>{part}</strong> : part);
}

function RuleIcon({ text }: { text: string }) {
  const Icon = /How many/i.test(text) ? UsersRound : /How much/i.test(text) ? Milk : /lặp lại|thói quen/i.test(text) ? Repeat2 : Lightbulb;
  return <Icon size={20} aria-hidden="true" />;
}

function PairExample({ before, after }: { before: string; after: string }) {
  const Icon = /\b(woman|man|person|child)\b/i.test(before) ? UserRound : /\bknife\b/i.test(before) ? Utensils : Shapes;
  return <details className={styles.pair}>
    <summary aria-label={`${before}. Bấm để xem dạng chuyển đổi`}>
      <span className={styles.pairFrom}>
        <Icon size={28} strokeWidth={1.6} aria-hidden="true" />
        <span>{before}</span>
      </span>
      <span className={styles.revealLabel}>Xem chuyển đổi <ArrowDown size={15} aria-hidden="true" /></span>
    </summary>
    <div className={styles.pairTo}><ArrowRight size={18} aria-hidden="true" /><span><span className={styles.pairIcons}><Icon size={22} strokeWidth={1.6} aria-hidden="true" />{/^two\s/i.test(after) && <Icon size={22} strokeWidth={1.6} aria-hidden="true" />}</span><strong>{after}</strong></span></div>
  </details>;
}

export function GrammarTheory({ theory }: Pick<GrammarContent, "theory">) {
  return <section className={styles.notebook} aria-labelledby="grammar-theory-title">
    <header className={styles.intro}>
      <div><span className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" /> HIỂU TRƯỚC · NHỚ LÂU HƠN</span><h2 id="grammar-theory-title">Ghi nhớ trước khi luyện</h2><p>Quy tắc ngắn. Ví dụ dễ nhớ.</p></div>
      <Image src="/brand/mascots/curious.webp" alt="" width={104} height={112} className={styles.mascot} sizes="104px" />
    </header>
    {theory.map((section, index) => {
      const rules = theorySentences(section.body);
      return <section className={styles.concept} key={`${index}-${section.title}`} aria-labelledby={`grammar-rule-${index}`}>
        <div className={styles.conceptHeading}><span className={styles.number}>{String(index + 1).padStart(2, "0")}</span><div><span className={styles.eyebrow}>GHI NHỚ TRƯỚC KHI LUYỆN</span><h3 id={`grammar-rule-${index}`}>{section.title}</h3></div></div>
        <div className={styles.rules}>
          {rules.map((rule, ruleIndex) => <div key={ruleIndex} className={styles.rule} data-tone={/How much/i.test(rule) ? "gold" : "blue"}>
            <span className={styles.ruleIcon}><RuleIcon text={rule} /></span><p><Emphasis text={rule} /></p>
          </div>)}
        </div>
        {section.examples.length > 0 && <div className={styles.examples}>
          <p className={styles.exampleHeading}><BookOpen size={17} aria-hidden="true" /> Nhìn ví dụ, nhớ cách dùng</p>
          <div className={styles.exampleGrid}>{section.examples.map((example, exampleIndex) => {
            const pair = examplePair(example);
            return pair ? <PairExample key={exampleIndex} {...pair} /> : <div className={styles.sentence} key={exampleIndex}><span className={styles.exampleNumber}>{String(exampleIndex + 1).padStart(2, "0")}</span><p lang="en"><Emphasis text={example} /></p></div>;
          })}</div>
        </div>}
      </section>;
    })}
  </section>;
}
