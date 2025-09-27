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
