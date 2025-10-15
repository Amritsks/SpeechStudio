<<<<<<< HEAD
// Text-to-Speech and Voice-to-Text React Component
// Single-file React component (default export) using Web Speech API
// Tailwind CSS classes used for styling (assumes Tailwind is available in the host app)

import React, { useEffect, useRef, useState } from "react";

export default function SpeechStudio() {
  const [text, setText] = useState("Hello — try typing or record some speech!");
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [lang, setLang] = useState("en-US");

  // SpeechRecognition state
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recogRef = useRef(null);

  // Refs for stable listeners
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    function loadVoices() {
      const v = synthRef.current.getVoices();
      setVoices(v);
      if (v.length && !selectedVoice) {
        // pick a default voice matching language if possible
        const match = v.find((x) => x.lang && x.lang.startsWith(lang));
        setSelectedVoice((match && match.name) || v[0].name);
      }
    }

    loadVoices();
    // some browsers fire voiceschanged
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [lang, selectedVoice]);

  // Text-to-speech
  function speakText(customText) {
    const utter = new SpeechSynthesisUtterance(customText ?? text);
    const chosen = voices.find((v) => v.name === selectedVoice);
    if (chosen) utter.voice = chosen;
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = pitch;

    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = (e) => {
      console.error("SpeechSynthesis error", e);
      setSpeaking(false);
    };

    // cancel any ongoing speech and speak
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  // Voice-to-text (SpeechRecognition)
  function initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const r = new SpeechRecognition();
    r.continuous = false; // stop on single result by default; can be toggled
    r.interimResults = true;
    r.lang = lang;

    r.onstart = () => setRecognizing(true);
    r.onend = () => setRecognizing(false);

    r.onerror = (e) => {
      console.error("SpeechRecognition error", e);
      setRecognizing(false);
    };

    r.onresult = (ev) => {
      let interim = "";
      let final = "";
      for (let i = ev.resultIndex; i < ev.results.length; ++i) {
        const res = ev.results[i];
        if (res.isFinal) final += res[0].transcript;
        else interim += res[0].transcript;
      }
      setTranscript((prev) => (final ? prev + final : prev));
      // show interim separately in UI by appending to transcript temporarily
      // we combine both for simplicity
      setTranscript((prev) => prev + (interim || ""));
    };

    return r;
  }

  function startRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser. Try Chrome/Edge on desktop or Chrome on Android.');
      return;
    }
    if (!recogRef.current) recogRef.current = initRecognition();
    if (!recogRef.current) return;

    // reset temporary transcript display
    setTranscript("");
    try {
      recogRef.current.lang = lang;
      recogRef.current.start();
    } catch (e) {
      // some browsers throw if start called twice quickly; recreate
      recogRef.current = initRecognition();
      recogRef.current && recogRef.current.start();
    }
  }

  function stopRecognition() {
    if (recogRef.current) {
      try { recogRef.current.stop(); } catch (e) { console.warn(e); }
    }
    setRecognizing(false);
  }

  // Helpers
  function appendTranscriptToText() {
    if (transcript.trim()) {
      setText((t) => (t ? t + "\n" + transcript : transcript));
      setTranscript("");
    }
  }

  // small utility: download transcript or text
  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Speech Studio — Text ↔ Speech</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Text area + TTS controls */}
        <section className="p-4 bg-white rounded-2xl shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Text → Speech</h2>

          <label className="block text-sm">Language</label>
          <select value={lang} onChange={(e)=> setLang(e.target.value)} className="w-full mb-3 p-2 rounded border">
            {/* Common languages — user may add more */}
            <option value="en-US">English (US) - en-US</option>
            <option value="en-GB">English (UK) - en-GB</option>
            <option value="hi-IN">Hindi - hi-IN</option>
            <option value="es-ES">Spanish - es-ES</option>
            <option value="fr-FR">French - fr-FR</option>
            <option value="zh-CN">Chinese (Mandarin) - zh-CN</option>
          </select>

          <label className="block text-sm">Voice</label>
          <select
            className="w-full mb-3 p-2 rounded border"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
          >
            {voices.length === 0 && <option>Loading voices…</option>}
            {voices.map((v) => (
              <option key={v.name + v.lang} value={v.name}>
                {v.name} — {v.lang} {v.default ? "(default)" : ""}
              </option>
            ))}
          </select>

          <textarea
            className="w-full p-3 rounded border min-h-[140px] mb-3"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-sm">Rate: {rate.toFixed(1)}</label>
              <input type="range" min="0.5" max="2" step="0.1" value={rate} onChange={(e)=> setRate(Number(e.target.value))} />
            </div>
            <div className="flex-1">
              <label className="block text-sm">Pitch: {pitch.toFixed(1)}</label>
              <input type="range" min="0.5" max="2" step="0.1" value={pitch} onChange={(e)=> setPitch(Number(e.target.value))} />
            </div>
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-60" onClick={() => speakText(text)} disabled={speaking}>
              ▶ Speak
            </button>
            <button className="px-4 py-2 rounded border" onClick={stopSpeaking} disabled={!speaking}>
              ■ Stop
            </button>
            <button className="px-4 py-2 rounded border ml-auto" onClick={()=> downloadFile('speech-text.txt', text)}>Download</button>
          </div>
        </section>

        {/* Right: Voice recognition */}
        <section className="p-4 bg-white rounded-2xl shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Speech → Text</h2>

          <p className="text-sm text-gray-600 mb-2">
            Use your microphone to record speech. Supported in Chrome/Edge (desktop & Android). Safari support varies.
          </p>

          <div className="flex gap-2 mb-3">
            <button
              className={`px-4 py-2 rounded ${recognizing ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
              onClick={() => (recognizing ? stopRecognition() : startRecognition())}
            >
              {recognizing ? 'Stop Recording' : 'Start Recording'}
            </button>

            <button className="px-4 py-2 rounded border" onClick={appendTranscriptToText} disabled={!transcript}>
              ➕ Add to Text
            </button>

            <button className="px-4 py-2 rounded border ml-auto" onClick={() => downloadFile('transcript.txt', transcript)} disabled={!transcript}>
              Download Transcript
            </button>
          </div>

          <label className="block text-sm">Live Transcript</label>
          <div className="min-h-[160px] p-3 rounded border bg-gray-50 whitespace-pre-wrap overflow-auto">{transcript || <span className="text-gray-400">— nothing yet —</span>}</div>

          <div className="mt-4">
            <label className="block text-sm">Recognized language (for better accuracy)</label>
            <select value={lang} onChange={(e)=> setLang(e.target.value)} className="w-full mt-2 p-2 rounded border">
              <option value="en-US">English (US) - en-US</option>
              <option value="en-GB">English (UK) - en-GB</option>
              <option value="hi-IN">Hindi - hi-IN</option>
              <option value="es-ES">Spanish - es-ES</option>
            </select>
          </div>
        </section>
      </div>

      {/* Footer: quick helpers */}
      <div className="mt-6 p-4 bg-white rounded-2xl shadow-sm">
        <h3 className="font-semibold mb-2">Quick actions</h3>
        <div className="flex gap-2 flex-wrap">
          <button className="px-3 py-2 rounded border" onClick={() => setText("")}>Clear Text</button>
          <button className="px-3 py-2 rounded border" onClick={() => setTranscript("")}>Clear Transcript</button>
          <button className="px-3 py-2 rounded border" onClick={() => { setText((t)=> t + '\n' + transcript); setTranscript(""); }}>Append Transcript to Text</button>
          <button className="px-3 py-2 rounded border" onClick={() => speakText(transcript)} disabled={!transcript}>Speak Transcript</button>
        </div>

        <p className="mt-3 text-sm text-gray-600">Notes: This app uses our browser's built-in Speech Synthesis and Speech Recognition engines — quality & available voices vary by browser and OS.</p>
      </div>
    </div>
  );
}
=======
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

  // Initialize positions
  useEffect(() => {
    for (let i = 0; i < particleCount; i++) {
      positions.current[i * 3] = (Math.random() - 0.5) * 10; // x
      positions.current[i * 3 + 1] = (Math.random() - 0.5) * 2; // y
      positions.current[i * 3 + 2] = (Math.random() - 0.5) * 5; // z
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

  // Initialize microphone
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

  // Text-to-Speech
  const speakText = (message) => {
    let ttsLang = lang === "bho-IN" ? "hi-IN" : lang;
    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = ttsLang;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang === ttsLang);
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
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
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
            {/* <option value="bho-IN">Bhojpuri</option> */}
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
>>>>>>> 1308c04 (Final commit)
