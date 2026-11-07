"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useGLStage } from "./gl-stage";

type GLImageProps = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  unfold?: boolean;
  ripple?: boolean;
};

export function GLImage({
  src,
  alt,
  sizes,
  className = "",
  priority = false,
  unfold = false,
  ripple = false,
}: GLImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const stage = useGLStage();

  useEffect(() => {
    const image = imageRef.current;
    if (!image || !stage) return;
    return stage.register(image, { unfold });
  }, [stage, src, unfold]);

  return (
    <div className={`media-frame ${className}`}>
      <Image
        ref={imageRef}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        crossOrigin="anonymous"
        className="gl-image__dom"
        data-ripple={ripple ? "true" : "false"}
      />
    </div>
  );
}
