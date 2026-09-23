// A small deformable image mesh: cape, head and wrists move locally without cutout seams.
// This animates the supplied 2D poses; it does not reconstruct hidden limbs or a 3D rig.
const vertexSource = `
attribute vec2 a_uv;
varying vec2 v_uv;
uniform float u_time;
uniform float u_pose;
uniform vec4 u_hands;
float region(vec2 p, vec2 center, vec2 radius) {
  vec2 d = (p - center) / radius;
  return exp(-dot(d, d) * 2.0);
}
void main() {
  vec2 p = a_uv;
  float t = u_time;
  float breath = sin(t * 2.3);
  float body = region(p, vec2(.53, .61), vec2(.24, .22));
  p.y -= breath * .004 * body;
  p.x += (p.x - .53) * breath * .018 * body;
  float cape = region(a_uv, vec2(.19,.63), vec2(.20,.22))
             + region(a_uv, vec2(.84,.68), vec2(.13,.16));
  float wave = sin(t * 3.2 + a_uv.y * 16.0 + a_uv.x * 9.0);
  p.x += wave * .011 * cape;
  p.y += cos(t * 2.7 + a_uv.x * 17.0) * .008 * cape;
  float head = region(a_uv, vec2(.53,.31), vec2(.32,.32));
  float nod = sin(t * 1.8) * (u_pose == 2.0 ? .025 : .008);
  vec2 neck = p - vec2(.53,.53);
  p += vec2(-neck.y, neck.x) * nod * head;
  float handL = region(a_uv, u_hands.xy, vec2(.13,.14));
  float handR = region(a_uv, u_hands.zw, vec2(.13,.14));
  float gesture = sin(min(t / 1.0, 1.0) * 3.14159265);
  float reach = u_pose == 3.0 || u_pose == 5.0 ? .023 * gesture : .006 * sin(t * 2.3);
  if (u_pose == 11.0) reach = .012 * sin(t * 3.4);
  p.x += reach * (handR - handL);
  p.y -= (.006 * sin(t * 2.3) + gesture * .012) * (handL + handR);
  // Leave transparent room around the artwork for recoil and cape flutter.
  gl_Position = vec4((p.x - .5) * 1.8, (.5 - p.y) * 1.8, 0.0, 1.0);
  v_uv = a_uv;
}`;
const fragmentSource = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_image;
void main() { gl_FragColor = texture2D(u_image, v_uv); }
`;

export function createCharacterRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  let frame = 0, elapsed = 0, lastTime = 0, running = false, loaded = false, disposed = false;
  function dispose() {
    disposed = true;
    cancelAnimationFrame(frame);
    gl!.deleteBuffer(buffer);
    gl!.deleteTexture(texture);
    gl!.deleteProgram(program);
    shaders.forEach((shader) => gl!.deleteShader(shader));
  }
  try {
    if (!program || !buffer || !texture) throw new Error("WebGL resources unavailable");
    for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Shader unavailable");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Character shader failed");
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Character program failed");
    gl.useProgram(program);
    const vertices: number[] = [];
    const cells = 24;
    for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
      for (const [dx, dy] of [[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]]) vertices.push((x + dx) / cells, (y + dy) / cells);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_uv");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const time = gl.getUniformLocation(program, "u_time");
    const pose = gl.getUniformLocation(program, "u_pose");
    const hands = gl.getUniformLocation(program, "u_hands");
    function draw() {
      if (disposed || !loaded) return;
      const size = Math.max(1, Math.min(640, Math.round(canvas.clientWidth * Math.min(devicePixelRatio, 2))));
      if (canvas.width !== size) canvas.width = canvas.height = size;
      gl!.viewport(0, 0, size, size);
      gl!.uniform1f(time, elapsed);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.drawArrays(gl!.TRIANGLES, 0, vertices.length / 2);
    }
    function tick(now: number) {
      frame = 0;
      if (!running || disposed) return;
      // Limit GPU work to 30 frames/second, including high-refresh mobile screens.
      if (!lastTime || now - lastTime >= 1000 / 30 - 1) {
        elapsed += lastTime ? Math.min((now - lastTime) / 1000, .1) : 0;
        lastTime = now;
        draw();
      }
      frame = requestAnimationFrame(tick);
    }
    return {
      load(image: HTMLImageElement, index: number, anchors: readonly number[]) {
        if (disposed || gl.isContextLost()) return false;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.uniform1f(pose, index);
        gl.uniform4fv(hands, anchors);
        elapsed = 0;
        loaded = true;
        draw();
        return true;
      },
      setRunning(value: boolean) {
        running = value;
        lastTime = 0;
        cancelAnimationFrame(frame);
        frame = value && !disposed ? requestAnimationFrame(tick) : 0;
      },
      draw,
      dispose,
    };
  } catch {
    dispose();
    return null;
  }
}
