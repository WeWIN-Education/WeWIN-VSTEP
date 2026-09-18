import "server-only";
import type { VstepTest1Public } from "./vstep-test-1-public";
import type { VstepPrivateData } from "./vstep-paper";
export function examReview(paper:VstepTest1Public,privateData:VstepPrivateData,answers:Record<string,unknown>,bookmarkedQuestionIds:ReadonlySet<string>=new Set()) {
  return [...paper.listening.parts.flatMap(p=>p.questions),...paper.reading.passages.flatMap(p=>p.questions)].map(question=>{
    const key=privateData.answerKey[question.id];
    const expected=key ? String.fromCharCode(65+key.correctIndex) : "?";
    const selected=typeof answers[question.id]==="string" ? String(answers[question.id]) : null;
    const correctText=question.options[expected.charCodeAt(0)-65];
    const selectedText=selected ? question.options[selected.charCodeAt(0)-65] : null;
    const passage=paper.reading.passages.find(p=>p.questions.some(q=>q.id===question.id));
    return {...question,selectedAnswer:selected?`${selected}. ${selectedText}`:null,correctAnswer:`${expected}. ${correctText}`,isCorrect:selected===expected,bookmarked:bookmarkedQuestionIds.has(question.id),
      explanation:undefined,passage:passage?.text,audioUrl:paper.listening.parts.find(p=>p.questions.some(q=>q.id===question.id))?.audioUrl};
  });
}
