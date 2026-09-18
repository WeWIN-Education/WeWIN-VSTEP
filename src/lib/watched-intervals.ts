export type Interval=[number,number];
export function mergeIntervals(input:Interval[],duration:number):Interval[]{
  const sorted=input.filter(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(Number.isFinite)&&pair[1]>pair[0]).map(([a,b])=>[Math.max(0,a),Math.min(duration,b)] as Interval).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  const result:Interval[]=[];
  for(const interval of sorted){const last=result.at(-1);if(last && interval[0]<=last[1]+0.1)last[1]=Math.max(last[1],interval[1]);else result.push([...interval]);}
  return result;
}
export function watchedSeconds(intervals:Interval[]){return intervals.reduce((sum,[a,b])=>sum+b-a,0);}
