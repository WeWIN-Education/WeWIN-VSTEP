export type YoutubePlayer = {getCurrentTime():number;getDuration():number;getPlayerState():number;getPlaybackRate():number;playVideo():void;pauseVideo():void;seekTo(seconds:number,allowSeekAhead:boolean):void;setPlaybackRate(rate:number):void;destroy():void};
type YoutubeApi = {Player:new(element:HTMLElement,options:{events:{onReady:()=>void;onError:()=>void}})=>YoutubePlayer};
declare global {interface Window {YT?:YoutubeApi;onYouTubeIframeAPIReady?:()=>void}}
let loading:Promise<YoutubeApi>|undefined;
export function loadYoutubeApi(){
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(!loading) loading=new Promise<YoutubeApi>((resolve,reject)=>{
    const previous=window.onYouTubeIframeAPIReady;
    const timeout=setTimeout(()=>{loading=undefined;reject(new Error("Không tải được trình phát YouTube."));},20000);
    window.onYouTubeIframeAPIReady=()=>{previous?.();clearTimeout(timeout);if(window.YT)resolve(window.YT);};
    const script=document.createElement("script");script.src="https://www.youtube.com/iframe_api";script.async=true;
    script.onerror=()=>{clearTimeout(timeout);loading=undefined;reject(new Error("Không kết nối được YouTube."));};document.head.append(script);
  });
  return loading;
}
