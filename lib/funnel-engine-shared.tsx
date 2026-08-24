"use client";

// Peças de UI/animação/integração usadas pelo motor antigo (funnel-engine.tsx,
// sequência fixa) E pelo motor novo (funnel-graph-engine.tsx, grafo
// editável). Extraído sem alterar nenhuma lógica — puro recorte de código,
// pra não duplicar ~250 linhas já corretas (e testadas em produção) entre os
// dois motores.

import { useEffect, useRef, useState } from "react";
import type { Variants } from "framer-motion";
import type { Option } from "./funnel-schema";

export const SCREEN_TRANSITION_MS = 260;
export const APPLE_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

export const screenVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 16 : -16 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -16 : 16 })
};

export const STANDARD_META_EVENTS = ["Lead", "Contact", "CompleteRegistration", "Schedule", "SubmitApplication", "StartTrial", "Subscribe"];

export function parseRich(str: string): string {
  return String(str || "")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, '<em class="accent">$1</em>');
}

export function labelFrom(list: Option[], v: string | null): string {
  if (!v) return "";
  const f = list.find((o) => o.v === v);
  return f ? f.t : "";
}

export interface Utm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
}

export function readUtm(): Utm {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Utm = {};
  (["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const).forEach((k) => {
    const v = p.get(k);
    if (v) out[k] = v;
  });
  return out;
}

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export function initMetaPixel(pixelId: string) {
  if (!pixelId || typeof window === "undefined") return;
  const w = window as any;
  if (w.fbq) return;
  try {
    (function (f: any, b: any, e: string, v: string, n: any, t: any, s: any) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js", null, null, null);
    w.fbq("init", pixelId);
    w.fbq("track", "PageView");
  } catch {
    // silencioso — normal em previews com CSP restrita
  }
}

export async function postJson(url: string, body: unknown): Promise<{ ok: boolean; id?: string; [k: string]: unknown }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: true, ...data };
  } catch (e) {
    console.error("[Radar Jurídico] falha ao enviar pra " + url, e);
    return { ok: false };
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------- componentes pequenos ----------

export function OptionRow({
  chip, label, selected, checkbox, onClick
}: { chip: string; label: string; selected: boolean; checkbox?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={"opt" + (selected ? " selected" : "")} onClick={onClick}>
      <span className="chip">{chip}</span>
      <span className="label">{label}</span>
      {checkbox && <span className="box">{selected ? "✓" : ""}</span>}
    </button>
  );
}

export function SingleSelect({
  question, note, opts, value, onPick
}: { question: string; note?: string; opts: Option[]; value: string | null; onPick: (v: string) => void }) {
  return (
    <div className="screen">
      <h2 className="plain-q">{question}</h2>
      {note ? <p className="plain-note">{note}</p> : <div style={{ height: 14 }} />}
      <div className="opt-list">
        {opts.map((o) => (
          <OptionRow key={o.v} chip={o.icon || "•"} label={o.t} selected={value === o.v} onClick={() => onPick(o.v)} />
        ))}
      </div>
    </div>
  );
}

// ---------- loading screen ----------

export interface LoadingFact {
  chip: string;
  t: string;
}

export function LoadingScreen({
  done, onDone, onContinue, durationMs, facts
}: { done: boolean; onDone: () => void; onContinue: () => void; durationMs?: number; facts?: LoadingFact[] }) {
  const DURATION = durationMs || 2400; // ms totais da barra, do 0% ao 100%
  const [pct, setPct] = useState(done ? 100 : 0);
  const [barDone, setBarDone] = useState(done);
  const [shown, setShown] = useState(done ? [true, true, true] : [false, false, false]);

  useEffect(() => {
    if (done) return;
    // Dispara a transição CSS de largura numa tacada só (0% -> 100%, ao longo
    // de DURATION), em vez de ficar incrementando o estado a cada intervalo
    // (o que fazia a barra "pular" em degraus visíveis).
    const raf = requestAnimationFrame(() => setPct(100));
    const t1 = setTimeout(() => setShown((s) => [true, s[1], s[2]]), DURATION * 0.28);
    const t2 = setTimeout(() => setShown((s) => [s[0], true, s[2]]), DURATION * 0.58);
    const t3 = setTimeout(() => setShown((s) => [s[0], s[1], true]), DURATION * 0.85);
    const t4 = setTimeout(() => { setBarDone(true); onDone(); }, DURATION);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const activeFacts: LoadingFact[] = facts && facts.length ? facts : [
    { chip: "📄", t: "Cada caso depende da documentação e do histórico específico." },
    { chip: "⏳", t: "Prazos legais (prescrição) existem, quanto antes for avaliado, melhor." },
    { chip: "💬", t: "O primeiro passo é sempre uma conversa objetiva com um advogado." }
  ];

  return (
    <div className="screen">
      <div className="load-icon">🔎</div>
      <h2 className="plain-q" style={{ textAlign: "center" }}>
        Organizando sua <em className="accent">pré-triagem</em>...
      </h2>
      <div className="load-track">
        <div className="load-fill" style={{ width: pct + "%", transition: `width ${DURATION}ms cubic-bezier(0.22,0.61,0.36,1)` }} />
      </div>
      <p className="load-status">{barDone ? "Concluído ✓" : "Analisando suas respostas..."}</p>
      {activeFacts.map((f, i) => (
        <div key={i} className={"fact-card" + (shown[i] ? " show" : "")}>
          <div className="chip">{f.chip}</div>
          <span>{f.t}</span>
        </div>
      ))}
      {barDone && <button className="cta" onClick={onContinue}>Continuar →</button>}
    </div>
  );
}

// ---------- ring screen ----------

export function RingScreen({ score, done, onDone, onContinue }: { score: number; done: boolean; onDone: () => void; onContinue: () => void }) {
  const [shown, setShown] = useState(done ? score : 0);
  const r = 78;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    if (done) { setShown(score); return; }
    const t = setTimeout(() => {
      let v = 0;
      const iv = setInterval(() => {
        v = Math.min(v + 3, score);
        setShown(v);
        if (v >= score) { clearInterval(iv); onDone(); }
      }, 40);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, score]);

  const offset = circumference - (shown / 100) * circumference;

  return (
    <div className="screen">
      <p className="eyebrow" style={{ textAlign: "center" }}>DIAGNÓSTICO PARCIAL</p>
      <h2 className="plain-q" style={{ textAlign: "center" }}>Prioridade de <em className="accent">atendimento</em></h2>
      <div className="ring-wrap">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={r} fill="none" stroke="var(--progress-track)" strokeWidth="14" />
          <circle
            cx="90" cy="90" r={r} fill="none" stroke="url(#gradRing)" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={circumference.toFixed(1)} strokeDashoffset={offset.toFixed(1)}
            transform="rotate(-90 90 90)" style={{ transition: "stroke-dashoffset 1.6s ease" }}
          />
          <defs>
            <linearGradient id="gradRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--progress-fill-a)" />
              <stop offset="100%" stopColor="var(--progress-fill-b)" />
            </linearGradient>
          </defs>
          <text x="90" y="96" textAnchor="middle" fontFamily="Inter Tight, sans-serif" fontWeight={700} fontSize={30} fill="var(--purple-text)">
            {shown}%
          </text>
        </svg>
      </div>
      <p className="ring-label">Quanto antes você falar com um advogado, maiores as chances de não perder prazos importantes.</p>
      {(done || shown >= score) && <button className="cta" style={{ marginTop: 18 }} onClick={onContinue}>Continuar →</button>}
    </div>
  );
}

// ---------- captura de nome/whatsapp do lead qualificado ----------

export interface ContactForm { nome: string; whatsapp: string }

export function LeadContactForm({
  onSubmit, previewMode, buildWaLink
}: { onSubmit: (f: ContactForm) => Promise<{ ok: boolean; demo?: boolean }>; previewMode: boolean; buildWaLink: (nome: string) => string }) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sending, setSending] = useState(false);

  const canSubmit = nome.trim().length > 1 && whatsapp.trim().length >= 8;

  // Um clique só: salva o lead e já leva pro WhatsApp na mesma tela, sem
  // precisar de um segundo clique num link separado. Navegação na própria
  // aba (em vez de window.open numa nova aba) pra nunca esbarrar em bloqueio
  // de pop-up do navegador depois do await da chamada à API.
  async function handleSubmit() {
    if (!canSubmit || sending) return;
    setSending(true);
    const form = { nome: nome.trim(), whatsapp: whatsapp.trim() };
    await onSubmit(form);
    window.location.href = buildWaLink(form.nome);
  }

  return (
    <div className="doubt-box" style={{ marginTop: 6, marginBottom: 16 }}>
      <div className="field">
        <label>Seu nome</label>
        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como podemos te chamar?" />
      </div>
      <div className="field">
        <label>Seu WhatsApp</label>
        <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 91234-5678" />
      </div>
      <button className="cta whatsapp doubt-submit" disabled={!canSubmit || sending} onClick={handleSubmit}>
        {sending ? "Enviando..." : "Falar com um advogado no WhatsApp →"}
      </button>
      {previewMode && <p className="demo-note">🔧 Modo preview: nada é salvo de verdade, mas o link do WhatsApp abre normalmente.</p>}
    </div>
  );
}

// ---------- captura de dúvida (texto ou áudio) ----------

export interface DoubtForm { nome: string; whatsapp: string; texto: string; audioBase64?: string; audioMime?: string }

export function DoubtCapture({ onSubmit, previewMode }: { onSubmit: (f: DoubtForm) => Promise<{ ok: boolean; demo?: boolean }>; previewMode: boolean }) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [texto, setTexto] = useState("");
  const [sent, setSent] = useState<{ demo?: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof (window as any).MediaRecorder !== "undefined";

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function toggleRecording() {
    if (recording) { recorderRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        stopTracks();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        audioBlobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        setRecording(false);
      };
      rec.start();
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setAudioNote("Gravação de áudio indisponível neste navegador/preview, funciona normalmente quando publicado no seu domínio.");
    }
  }

  function redoAudio() {
    audioBlobRef.current = null;
    setAudioUrl(null);
  }

  const canSubmit = nome.trim().length > 1 && whatsapp.trim().length >= 8 && (texto.trim().length > 0 || !!audioBlobRef.current);

  async function handleSubmit() {
    setSending(true);
    let audioBase64: string | undefined, audioMime: string | undefined;
    if (audioBlobRef.current) {
      audioBase64 = await blobToBase64(audioBlobRef.current);
      audioMime = audioBlobRef.current.type;
    }
    const result = await onSubmit({ nome: nome.trim(), whatsapp: whatsapp.trim(), texto: texto.trim(), audioBase64, audioMime });
    setSent(result);
    setSending(false);
  }

  if (sent) {
    return (
      <div className="doubt-box">
        <h3 style={{ margin: "0 0 8px", fontSize: "1.05rem" }}>Pergunta recebida ✓</h3>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-soft)", lineHeight: 1.55 }}>
          Nossa equipe vai avaliar sua dúvida e só entra em contato pelo WhatsApp se fizer sentido pra você, assim priorizamos quem realmente precisa falar com um advogado agora.
        </p>
        {(sent.demo || previewMode) && (
          <p className="demo-note">🔧 Modo demonstração/preview: em produção isso cai direto no seu Kanban de dúvidas.</p>
        )}
      </div>
    );
  }

  return (
    <div className="doubt-box">
      <p className="lead-in">Ainda com dúvida? Escreve ou manda um áudio contando o que falta entender, a gente avalia e só te chama no WhatsApp se fizer sentido pra você.</p>
      <div className="field">
        <label>Sua dúvida</label>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex: quero saber se ainda dá tempo de entrar com o pedido..." />
        {audioSupported && (
          <div className="audio-rec">
            <button type="button" className={"mic-btn" + (recording ? " recording" : "")} onClick={toggleRecording}>
              {recording ? `⏺ Gravando ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} (toque pra parar)` : "🎤 Gravar áudio"}
            </button>
            {audioUrl && (
              <>
                <audio controls src={audioUrl} />
                <button type="button" className="audio-redo" onClick={redoAudio}>regravar</button>
              </>
            )}
          </div>
        )}
        {audioNote && <p className="audio-note">{audioNote}</p>}
      </div>
      <div className="field"><label>Seu nome</label><input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como podemos te chamar" /></div>
      <div className="field"><label>Seu WhatsApp</label><input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" /></div>
      <button className="cta doubt-submit" disabled={!canSubmit || sending} onClick={handleSubmit}>
        {sending ? "Enviando..." : "Enviar minha dúvida"}
      </button>
    </div>
  );
}
