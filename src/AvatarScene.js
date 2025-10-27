import { useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { VideoTexture } from "three";

export default function AvatarScene({ speaking }) {
  const videoRef = useRef(document.createElement("video"));

  useEffect(() => {
    const video = videoRef.current;
    video.src = "/avatar.mp4"; // Place your MP4 video in public folder
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.play();
  }, []);

  // Play/pause video based on speaking
  useEffect(() => {
    const video = videoRef.current;
    if (speaking) {
      video.play();
    } else {
      video.pause();
    }
  }, [speaking]);

  return (
    <Canvas style={{ height: 200, width: 200 }}>
      <ambientLight intensity={0.5} />
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial map={new VideoTexture(videoRef.current)} />
      </mesh>
    </Canvas>
  );
}
