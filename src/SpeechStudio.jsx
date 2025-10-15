import React, { useState, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Mic, Send } from "lucide-react";
import * as THREE from "three";

// Particle Wave Component
function VoiceParticles({ audioData }) {
  const pointsRef = useRef();
  const particleCount = 2000;
  const positions = useRef(new Float32Array(particleCount * 3));

  useEffect(() => {
    for (let i = 0; i < particleCount; i++) {
      positions.current[i * 3] = (Math.random() - 0.5) * 10;
      positions.current[i * 3 + 1] = (Math.random() - 0.5) * 2;
      positions.current[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const time = Date.now() * 0.002;
    const amp = (audioData.current || 0) / 150;
    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      positions.current[ix + 1] =
        Math.sin(time + positions.current[ix]) * amp * 5 + Math.sin(time * 0.5 + ix) * 0.2;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions.current}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors={false}
        color={new THREE.Color("hsl(" + Math.random() * 360 + ", 100%, 60%)")}
      />
    </points>
  );
}

export default function SpeechStudio() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [lang, setLang] = useState("en-US");
  const audioData = useRef(0);
  const recogRef = useRef(null);
  const [showVisualizer, setShowVisualizer] = useState(false);

  useEffect(() => {
    async function initMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateAudio = () => {
          analyser.getByteFrequencyData(dataArray);
          audioData.current = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          requestAnimationFrame(updateAudio);
        };
        updateAudio();
        setShowVisualizer(true);
      } catch {
        alert("Allow microphone access to see live particle effects.");
      }
    }
    initMic();
  }, []);

  const speakText = (message) => {
    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = lang;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang === lang);
    if (voice) utter.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    speakText(text);
    setText("");
  };

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech recognition not supported.");
    if (!recogRef.current) {
      recogRef.current = new SpeechRecognition();
      recogRef.current.continuous = false;
      recogRef.current.interimResults = false;
      recogRef.current.lang = lang;
      recogRef.current.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setMessages((prev) => [...prev, { role: "user", content: transcript }]);
        speakText(transcript);
      };
      recogRef.current.onend = () => (recogRef.current = null);
    }
    try {
      recogRef.current.start();
    } catch {
      console.warn("Recognition already started");
    }
  };

  return (
    <div className="min-h-screen relative bg-gray-900 flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Chat UI */}
      <div className="w-full max-w-2xl bg-gradient-to-r from-red-600 to-gray-600 rounded-3xl shadow-xl flex flex-col overflow-hidden border border-gray-800 mb-6 z-10 relative">
        <div className="flex-1 p-4 overflow-y-auto max-h-96 space-y-3">
          {messages.length === 0 && <p className="text-gray-400 text-center">No messages yet...</p>}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`px-4 py-2 rounded-lg max-w-xs break-words ${
                m.role === "user"
                  ? "bg-gradient-to-r from-red-600 to-gray-600 text-white self-end ml-auto"
                  : "bg-gradient-to-r from-red-600 to-gray-600 text-gray-900 self-start"
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 p-3 border-t bg-gradient-to-r from-red-600 to-gray-600">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="px-3 py-1 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-grey-300"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="hi-IN">Hindi</option>
          </select>

          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-2xl bg-gray-300 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />

          <button
            onClick={handleSend}
            className="p-3 rounded-full bg-gradient-to-r from-red-600 to-gray-600 hover:bg-indigo-500 text-white transition-transform transform hover:scale-105"
          >
            <Send size={20} />
          </button>

          <button
            onClick={startRecognition}
            className="p-3 rounded-full bg-gradient-to-r from-red-600 to-gray-600 hover:bg-green-500 text-white transition-transform transform hover:scale-105"
          >
            <Mic size={20} />
          </button>
        </div>
      </div>

      {/* Live Particle Visualizer */}
      {showVisualizer && (
        <Canvas className="absolute top-0 left-0 w-full h-full" camera={{ position: [0, 5, 15], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <VoiceParticles audioData={audioData} />
          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      )}
    </div>
  );
}
