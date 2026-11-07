"use client";

import {
  Camera,
  Mesh,
  Plane,
  Program,
  Renderer,
  Texture,
  Transform,
} from "ogl";
import Lenis from "lenis";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

type ImageOptions = {
  unfold?: boolean;
};

type GLStageContextValue = {
  register: (image: HTMLImageElement, options: ImageOptions) => () => void;
};

type PlaneRecord = {
  image: HTMLImageElement;
  mesh: Mesh;
  texture: Texture;
  uniforms: {
    uImageAspect: { value: number };
    uPlaneAspect: { value: number };
    uVelocity: { value: number };
    uRgbScale: { value: number };
    uUnfold: { value: number };
    uZoom: { value: number };
    uMouse: { value: Float32Array };
    uHoverTime: { value: number };
  };
  hoverStarted: number | null;
  unfoldStartedAt: number | null;
};

const GLStageContext = createContext<GLStageContextValue | null>(null);

const vertexShader = `
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uUnfold;
uniform float uVelocity;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 transformed = position;
  transformed.y *= uUnfold;
  transformed.z += sin(uv.y * 3.14159265) * uVelocity * 0.004;
  transformed.z += sin(uv.y * 3.14159265) * (1.0 - uUnfold) * 0.18;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

const fragmentShader = `
precision highp float;
uniform sampler2D tMap;
uniform float uImageAspect;
uniform float uPlaneAspect;
uniform float uVelocity;
uniform float uRgbScale;
uniform float uZoom;
uniform vec2 uMouse;
uniform float uHoverTime;
varying vec2 vUv;

vec2 coverUv(vec2 uv) {
  float ratio = uImageAspect / uPlaneAspect;
  if (ratio > 1.0) {
    uv.x = (uv.x - 0.5) / ratio + 0.5;
  } else {
    uv.y = (uv.y - 0.5) * ratio + 0.5;
  }
  return (uv - 0.5) / uZoom + 0.5;
}

void main() {
  vec2 uv = coverUv(vUv);
  vec2 delta = uv - uMouse;
  float distanceToMouse = length(delta);
  float ripple = sin(distanceToMouse * 18.0 - uHoverTime * 6.0)
    * 0.02
    * exp(-uHoverTime * 3.0);
  if (uHoverTime < 0.0) ripple = 0.0;
  uv += normalize(delta + vec2(0.00001)) * ripple;

  vec2 offset = vec2(0.0, uVelocity * 0.0012 * uRgbScale);
  float red = texture2D(tMap, uv + offset).r;
  float green = texture2D(tMap, uv).g;
  float blue = texture2D(tMap, uv - offset).b;
  vec4 color = vec4(red, green, blue, texture2D(tMap, uv).a);
  gl_FragColor = color;
}
`;

export function useGLStage() {
  return useContext(GLStageContext);
}

export function GLStage({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef(new Map<HTMLImageElement, ImageOptions>());

  const register = useCallback(
    (image: HTMLImageElement, options: ImageOptions) => {
      imagesRef.current.set(image, options);
      window.dispatchEvent(new Event("gl-image-register"));
      return () => imagesRef.current.delete(image);
    },
    [],
  );

  const contextValue = useMemo(() => ({ register }), [register]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let renderer: Renderer;

    try {
      renderer = new Renderer({
        canvas,
        alpha: true,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
        premultipliedAlpha: false,
      });
    } catch (error) {
      console.warn("WebGL is unavailable; showing static images instead.", error);
      return;
    }

    const gl = renderer.gl;
    const camera = new Camera(gl);
    camera.position.set(0, 0, 1000);
    camera.perspective({
      aspect: window.innerWidth / window.innerHeight,
      fov: 45,
      near: 0.1,
      far: 2000,
    });

    const scene = new Transform();
    const records = new Map<HTMLImageElement, PlaneRecord>();
    const pointer = { x: -1, y: -1 };
    let targetVelocity = 0;
    let smoothVelocity = 0;
    let frameId = 0;
    let lenisFrameId = 0;
    let lastTimestamp = 0;
    let isPageVisible = !document.hidden;
    let hasVisiblePlane = false;
    let disposed = false;

    const createRecord = (image: HTMLImageElement, options: ImageOptions) => {
      if (!image.complete || image.naturalWidth === 0 || records.has(image)) {
        return;
      }

      const texture = new Texture(gl, {
        generateMipmaps: false,
        minFilter: gl.LINEAR,
        magFilter: gl.LINEAR,
      });
      texture.image = image;
      const uniforms = {
        uImageAspect: { value: image.naturalWidth / image.naturalHeight },
        uPlaneAspect: { value: 1 },
        uVelocity: { value: 0 },
        uRgbScale: { value: window.innerWidth < 768 ? 0.5 : 1 },
        uUnfold: { value: options.unfold && !reducedMotion ? 0 : 1 },
        uZoom: { value: options.unfold && !reducedMotion ? 1.25 : 1 },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uHoverTime: { value: -1 },
      };
      const geometry = new Plane(gl, {
        width: 1,
        height: 1,
        widthSegments: window.innerWidth < 768 ? 16 : 32,
        heightSegments: window.innerWidth < 768 ? 16 : 32,
      });
      const program = new Program(gl, {
        vertex: vertexShader,
        fragment: fragmentShader,
        uniforms: { tMap: { value: texture }, ...uniforms },
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new Mesh(gl, { geometry, program });
      mesh.setParent(scene);
      records.set(image, {
        image,
        mesh,
        texture,
        uniforms,
        hoverStarted: null,
        unfoldStartedAt:
          options.unfold && !reducedMotion ? performance.now() : null,
      });
      image.dataset.glPlane = "ready";
    };

    const onScroll = ({ velocity }: { velocity: number }) => {
      targetVelocity = Math.max(-40, Math.min(40, velocity));
    };
    const lenis = reducedMotion ? null : new Lenis({ lerp: 0.1 });
    lenis?.on("scroll", onScroll);

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.perspective({
        aspect: width / height,
        fov: 45,
        near: 0.1,
        far: 2000,
      });
      const segments = width < 768 ? 16 : 32;
      for (const record of records.values()) {
        record.mesh.geometry.remove();
        record.mesh.geometry = new Plane(gl, {
          width: 1,
          height: 1,
          widthSegments: segments,
          heightSegments: segments,
        });
        record.uniforms.uRgbScale.value = width < 768 ? 0.5 : 1;
      }
      startRender();
    };

    const render = (timestamp: number) => {
      if (disposed || !isPageVisible || !hasVisiblePlane) {
        frameId = 0;
        return;
      }

      const delta = lastTimestamp === 0 ? 0 : timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      if (lenis) {
        smoothVelocity += (targetVelocity - smoothVelocity) * 0.1;
        if (delta > 80) smoothVelocity = 0;
      }

      let anyMoving = Math.abs(smoothVelocity) > 0.03;
      for (const [image, options] of imagesRef.current) {
        if (!image.isConnected) continue;
        if (!records.has(image)) {
          createRecord(image, options);
        }
      }

      for (const [image, record] of records) {
        if (!image.isConnected || !imagesRef.current.has(image)) {
          record.mesh.setParent(null);
          record.mesh.program.remove();
          record.mesh.geometry.remove();
          gl.deleteTexture(record.texture.texture);
          delete image.dataset.glPlane;
          records.delete(image);
          continue;
        }

        const rect = image.getBoundingClientRect();
        const visible =
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          rect.right > 0 &&
          rect.left < window.innerWidth;
        if (!visible || image.naturalWidth === 0) {
          record.mesh.scale.set(0, 0, 1);
          record.hoverStarted = null;
          record.uniforms.uHoverTime.value = -1;
          continue;
        }

        const worldHeight =
          2 * Math.tan((45 * Math.PI) / 360) * camera.position.z;
        const unitsPerPixel = worldHeight / window.innerHeight;
        record.mesh.position.set(
          (rect.left + rect.width / 2 - window.innerWidth / 2) *
            unitsPerPixel,
          (window.innerHeight / 2 - rect.top - rect.height / 2) *
            unitsPerPixel,
          0,
        );
        record.mesh.scale.set(
          rect.width * unitsPerPixel,
          rect.height * unitsPerPixel,
          1,
        );
        record.uniforms.uPlaneAspect.value = rect.width / rect.height;
        record.uniforms.uVelocity.value = smoothVelocity;

        const isHovered =
          image.dataset.ripple === "true" &&
          pointer.x >= rect.left &&
          pointer.x <= rect.right &&
          pointer.y >= rect.top &&
          pointer.y <= rect.bottom;
        if (isHovered) {
          record.hoverStarted ??= timestamp;
          record.uniforms.uMouse.value[0] = (pointer.x - rect.left) / rect.width;
          record.uniforms.uMouse.value[1] =
            1 - (pointer.y - rect.top) / rect.height;
          const age = (timestamp - record.hoverStarted) / 1000;
          record.uniforms.uHoverTime.value = age <= 0.9 ? age : -1;
        } else {
          record.hoverStarted = null;
          record.uniforms.uHoverTime.value = -1;
        }

        if (
          record.unfoldStartedAt !== null &&
          record.uniforms.uUnfold.value < 1
        ) {
          const progress = Math.min(
            1,
            (timestamp - record.unfoldStartedAt) / 1400,
          );
          record.uniforms.uUnfold.value =
            1 - Math.pow(1 - progress, 4);
          record.uniforms.uZoom.value = 1.25 - 0.25 * record.uniforms.uUnfold.value;
          anyMoving = progress < 1 || anyMoving;
        }
        anyMoving =
          anyMoving ||
          (isHovered && record.uniforms.uHoverTime.value >= 0);
      }

      renderer.render({ scene, camera });
      if (anyMoving || (!reducedMotion && records.size > 0)) {
        frameId = window.requestAnimationFrame(render);
      } else {
        frameId = 0;
      }
    };

    const startRender = () => {
      if (frameId === 0 && isPageVisible && hasVisiblePlane) {
        lastTimestamp = 0;
        frameId = window.requestAnimationFrame(render);
      }
    };

    const tickLenis = (timestamp: number) => {
      if (!lenis || !isPageVisible) {
        lenisFrameId = 0;
        return;
      }
      lenis.raf(timestamp);
      lenisFrameId = window.requestAnimationFrame(tickLenis);
    };

    const visibleImages = new Set<HTMLImageElement>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const image = entry.target as HTMLImageElement;
          if (entry.isIntersecting) visibleImages.add(image);
          else visibleImages.delete(image);
        });
        hasVisiblePlane = visibleImages.size > 0;
        if (hasVisiblePlane) startRender();
        else if (frameId) {
          window.cancelAnimationFrame(frameId);
          frameId = 0;
        }
      },
      { rootMargin: "120px 0px" },
    );

    const observeRegisteredImages = () => {
      for (const image of imagesRef.current.keys()) {
        if (!observed.has(image)) {
          observed.add(image);
          observer.observe(image);
        }
        if (!image.complete && !loadObserved.has(image)) {
          loadObserved.add(image);
          image.addEventListener("load", startRender, { once: true });
        } else {
          createRecord(image, imagesRef.current.get(image) ?? {});
        }
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const onVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (!isPageVisible && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
      if (!isPageVisible && lenisFrameId) {
        window.cancelAnimationFrame(lenisFrameId);
        lenisFrameId = 0;
      } else if (isPageVisible) {
        startRender();
        if (lenis && !lenisFrameId) {
          lenisFrameId = window.requestAnimationFrame(tickLenis);
        }
      }
    };

    const observed = new WeakSet<HTMLImageElement>();
    const loadObserved = new WeakSet<HTMLImageElement>();
    const onImageRegister = () => {
      observeRegisteredImages();
      startRender();
    };

    resize();
    observeRegisteredImages();
    window.addEventListener("gl-image-register", onImageRegister);
    window.addEventListener("scroll", startRender, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    canvas.parentElement?.setAttribute("data-ready", "true");
    startRender();
    if (lenis && isPageVisible) {
      lenisFrameId = window.requestAnimationFrame(tickLenis);
    }

    return () => {
      disposed = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      if (lenisFrameId) window.cancelAnimationFrame(lenisFrameId);
      observer.disconnect();
      window.removeEventListener("gl-image-register", onImageRegister);
      window.removeEventListener("scroll", startRender);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      lenis?.destroy();
      for (const record of records.values()) {
        record.mesh.setParent(null);
        record.mesh.program.remove();
        record.mesh.geometry.remove();
        gl.deleteTexture(record.texture.texture);
        delete record.image.dataset.glPlane;
      }
      canvas.parentElement?.removeAttribute("data-ready");
    };
  }, [register]);

  return (
    <GLStageContext.Provider value={contextValue}>
      <div className="gl-stage">
        <canvas
          ref={canvasRef}
          className="gl-stage__canvas"
          aria-hidden="true"
        />
        {children}
      </div>
    </GLStageContext.Provider>
  );
}
