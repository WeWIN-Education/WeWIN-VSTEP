export async function openMicrophone(timeoutMs = 20000): Promise<MediaStream> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("Micro cần HTTPS hoặc localhost. Hãy mở bài bằng Chrome, Edge hoặc Brave.");
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).then(stream=>{
        if(expired){stream.getTracks().forEach(track=>track.stop());throw new Error("Yêu cầu micro đã hết thời gian.");}
        return stream;
      }),
      new Promise<never>((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(new Error("Trình duyệt chưa cấp quyền micro. Bấm biểu tượng quyền bên thanh địa chỉ, cho phép micro rồi thử lại."));},timeoutMs);}),
    ]);
  } catch(error) {
    if(error instanceof DOMException){
      if(error.name==="NotAllowedError")throw new Error("Quyền micro đang bị chặn. Cho phép micro cho trang này trong trình duyệt rồi thử lại.");
      if(error.name==="NotFoundError")throw new Error("Không tìm thấy micro. Hãy kết nối hoặc chọn thiết bị ghi âm.");
      if(error.name==="NotReadableError")throw new Error("Không mở được micro. Đóng ứng dụng đang dùng micro rồi thử lại.");
    }
    throw error;
  } finally {if(timer)clearTimeout(timer);}
}
