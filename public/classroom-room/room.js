/* React 18 required by Zoom lives only in this document. VSTEP remains on React 19. */
(() => {
  const origin = location.origin,
    base = `${origin}/zoom/6.5.0`,
    state = document.getElementById("state");
  let client,
    mobile,
    joined = false,
    running = false;
  function report(type, message) {
    parent.postMessage({ type, message }, origin);
  }
  function script(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = resolve;
      el.onerror = () => reject(new Error("Không tải được thành phần Zoom."));
      document.head.append(el);
    });
  }
  async function join(data) {
    if (running) return;
    running = true;
    try {
      if (!isSecureContext)
        throw new Error("Camera/mic cần HTTPS hoặc localhost.");
      document.body.classList.toggle("dark", data.theme === "dark");
      await script(`${base}/lib/vendor/react.min.js`);
      await script(`${base}/lib/vendor/react-dom.min.js`);
      mobile = data.mobile;
      if (mobile) {
        for (const f of [
          "redux.min.js",
          "redux-thunk.min.js",
          "react-redux.min.js",
          "lodash.min.js",
        ])
          await script(`${base}/lib/vendor/${f}`);
        await script(`${base}/zoomus-websdk.umd.min.js`);
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = `${base}/ui/zoom-meetingsdk.css`;
        document.head.append(css);
        ZoomMtg.setZoomJSLib(`${base}/lib`, "/av");
        ZoomMtg.preLoadWasm();
        ZoomMtg.prepareWebSDK();
        await ZoomMtg.i18n.load("vi-VN");
        await ZoomMtg.init({
          leaveUrl: `${origin}/classroom-room/left.html`,
          patchJsMedia: false,
          debug: false,
          defaultView: "speaker",
          theme: data.theme,
          disableRecord: true,
          isSupportPolling: false,
          isSupportBreakout: false,
          disableInvite: true,
        });
        ZoomMtg.inMeetingServiceListener("onMeetingStatus", ({ status }) => {
          if (status === 2) {
            joined = true;
            state.hidden = true;
            document
              .getElementById("zmmtg-root")
              ?.removeAttribute("aria-hidden");
            report("wewin-zoom-connected");
          } else if (status === 3) {
            joined = false;
            report("wewin-zoom-closed", "Kết nối Zoom đã đóng.");
          }
        });
        state.hidden = true;
        report("wewin-zoom-waiting");
        await new Promise((resolve, reject) =>
          ZoomMtg.join({
            signature: data.signature,
            meetingNumber: data.meetingNumber,
            userName: data.userName,
            passWord: data.password,
            customerKey: data.customerKey,
            ...(data.zak ? { zak: data.zak } : {}),
            success: resolve,
            error: reject,
          }),
        );
        joined = true;
        document.getElementById("zmmtg-root")?.removeAttribute("aria-hidden");
        // The SDK preloads a hidden whiteboard modal which can hide the live room
        // from assistive technology. Keep real visible modals' focus isolation.
        let accessibilityFrame = 0;
        const accessibility = new MutationObserver(() => {
          cancelAnimationFrame(accessibilityFrame);
          accessibilityFrame = requestAnimationFrame(() => {
            if (!joined) return;
            const modalOpen = [
              ...document.querySelectorAll(".ReactModal__Content"),
            ].some((el) =>
              el.checkVisibility({
                checkOpacity: true,
                checkVisibilityCSS: true,
              }),
            );
            if (!modalOpen)
              document
                .getElementById("zmmtg-root")
                ?.removeAttribute("aria-hidden");
          });
        });
        accessibility.observe(document.body, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["aria-hidden", "class", "style"],
        });
        addEventListener("pagehide", () => accessibility.disconnect(), {
          once: true,
        });
        report("wewin-zoom-connected");
      } else {
        await script(`${base}/zoomus-websdk-embedded.umd.min.js`);
        client = ReactWidgets.createClient();
        const videoSize = () => ({
          width: Math.max(320, innerWidth - 4),
          height: Math.max(300, ((innerWidth - 4) * 9) / 16),
        });
        await client.init({
          zoomAppRoot: document.getElementById("zoom-root"),
          assetPath: `${base}/lib/av`,
          language: "vi-VN",
          patchJsMedia: false,
          debug: false,
          maximumVideosInGalleryView: 9,
          leaveOnPageUnload: true,
          customize: {
            video: {
              defaultViewType: "speaker",
              isResizable: false,
              viewSizes: {
                default: videoSize(),
                ribbon: videoSize(),
              },
            },
          },
        });
        addEventListener("resize", () => {
          const size = videoSize();
          client.updateVideoOptions({
            viewSizes: { default: size, ribbon: size },
          });
          // Gallery needs more width than one half of the WEWIN split view.
          if (joined && innerWidth < 720) client.setViewType("speaker");
        });
        client.on("connection-change", (e) => {
          if (e.state === "Closed") {
            joined = false;
            report(
              "wewin-zoom-closed",
              "Kết nối đã đóng. Vào lại bằng cùng thiết bị để tiếp tục.",
            );
          }
        });
        await client.join({
          signature: data.signature,
          meetingNumber: data.meetingNumber,
          userName: data.userName,
          password: data.password,
          customerKey: data.customerKey,
          ...(data.zak ? { zak: data.zak } : {}),
        });
        // Zoom adds its own controls and ribbon around the video area.
        // Report the actual widget height so the parent never clips those controls.
        const widget = document.querySelector('[role="region"]');
        if (widget)
          new ResizeObserver(() =>
            report(
              "wewin-zoom-size",
              Math.ceil(widget.getBoundingClientRect().height) + 8,
            ),
          ).observe(widget);
      }
      if (!mobile) {
        joined = true;
        state.hidden = true;
        report("wewin-zoom-connected");
      }
    } catch (e) {
      state.textContent =
        "Không vào được Zoom. Bạn có thể thử lại hoặc mở ứng dụng Zoom.";
      report("wewin-zoom-error", e.message || "Không vào được Zoom.");
    }
  }
  addEventListener("message", async (event) => {
    if (event.origin !== origin || event.source !== parent) return;
    if (event.data?.type === "wewin-zoom-join") await join(event.data.context);
    if (event.data?.type === "wewin-zoom-theme")
      document.body.classList.toggle("dark", event.data.theme === "dark");
    if (event.data?.type === "wewin-zoom-leave") {
      try {
        if (joined) {
          if (mobile) await ZoomMtg.leaveMeeting({ confirm: false });
          else await client.leaveMeeting();
        }
        joined = false;
        report("wewin-zoom-left");
      } catch {
        report(
          "wewin-zoom-error",
          "Không rời được phòng. Hãy đóng kết nối và thử lại.",
        );
      }
    }
  });
  report("wewin-zoom-ready");
})();
