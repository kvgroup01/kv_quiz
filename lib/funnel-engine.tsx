"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { DEFAULT_QUESTIONS, type FunnelData, type Option, type AreaContent } from "./funnel-schema";

const SCREEN_TRANSITION_MS = 260;
const APPLE_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

// Transição sequencial (a tela antiga termina de sair antes da nova
// começar a entrar — AnimatePresence com mode="wait"). Nada de posições
// absolutas/z-index com duas telas sobrepostas ao mesmo tempo: essa
// abordagem "cover" chegou a ficar visualmente travada em alguns
// navegadores/dispositivos, então trocamos por algo mais simples e à prova
// de bugs — só um fade com leve deslocamento horizontal.
const screenVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 16 : -16 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -16 : 16 })
};

// ---------- helpers de conteúdo ----------

function parseRich(str: string): string {
  return String(str || "")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, '<em class="accent">$1</em>');
}

function labelFrom(list: Option[], v: string | null): string {
  if (!v) return "";
  const f = list.find((o) => o.v === v);
  return f ? f.t : "";
}

const ORDER = [
  "area", "situacao", "urgencia", "aspiracao", "loading1",
  "honorarios", "dores", "ring", "trust", "compromisso", "result"
] as const;
type StepId = (typeof ORDER)[number];

const STANDARD_META_EVENTS = ["Lead", "Contact", "CompleteRegistration", "Schedule", "SubmitApplication", "StartTrial", "Subscribe"];

interface Answers {
  area: string | null;
  situacao: string | null;
  urgencia: string | null;
  aspiracao: string | null;
  honorarios: string | null;
  dores: string[];
  compromisso: string | null;
}

interface Utm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
}

function readUtm(): Utm {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Utm = {};
  (["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const).forEach((k) => {
    const v = p.get(k);
    if (v) out[k] = v;
  });
  return out;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function initMetaPixel(pixelId: string) {
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

function computeScore(urgencia: string | null, doresCount: number, compromisso: string | null): number {
  let score = 55;
  if (urgencia === "antigo" || urgencia === "recente") score += 15;
  if (doresCount >= 2) score += 12;
  if (compromisso === "alto") score += 10;
  return Math.min(score, 96);
}

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; id?: string; [k: string]: unknown }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: true, ...data };
  } catch (e) {
    console.error("[Radar Jurídico] falha ao enviar pra " + url, e);
    return { ok: false };
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------- componentes pequenos ----------

function OptionRow({
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

function SingleSelect({
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

// ---------- motor principal ----------

export default function FunnelEngine({ data, previewMode }: { data: FunnelData; previewMode?: boolean }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [stack, setStack] = useState<StepId[]>([]);
  const [direction, setDirection] = useState(1);
  const navLocked = useRef(false);
  const [answers, setAnswers] = useState<Answers>({
    area: null, situacao: null, urgencia: null, aspiracao: null, honorarios: null, dores: [], compromisso: null
  });
  const [loadingDone, setLoadingDone] = useState(false);
  const [ringDone, setRingDone] = useState(false);
  const utmRef = useRef<Utm>({});

  const step = ORDER[stepIndex];
  const areaData: AreaContent | null = answers.area ? data.areas[answers.area] : null;

  useEffect(() => {
    if (previewMode) return;
    utmRef.current = readUtm();
    initMetaPixel(data.config.metaPixelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trava a navegação enquanto a transição de tela está rolando: sem isso, um
  // clique duplo (ou um clique perdido na tela saindo, durante o fade) podia
  // disparar duas respostas/avanços em sequência.
  function withNavLock(fn: () => void) {
    if (navLocked.current) return;
    navLocked.current = true;
    fn();
    // mode="wait" faz a saída terminar antes da entrada começar, então o
    // tempo total até a nova tela assentar é o dobro da duração de cada uma.
    setTimeout(() => { navLocked.current = false; }, SCREEN_TRANSITION_MS * 2);
  }

  function goTo(id: StepId) {
    withNavLock(() => {
      setDirection(1);
      setStack((s) => [...s, step]);
      setStepIndex(ORDER.indexOf(id));
    });
  }
  function goBack() {
    withNavLock(() => {
      setDirection(-1);
      setStack((s) => {
        if (s.length === 0) return s;
        const copy = [...s];
        const prev = copy.pop()!;
        setStepIndex(ORDER.indexOf(prev));
        return copy;
      });
    });
  }

  const progressPct = Math.round(((stepIndex + 1) / ORDER.length) * 100);

  function fireEvent(kind: "leadQualificado" | "duvidaCapturada", extra: Record<string, unknown>) {
    const evName = data.eventos[kind];
    if (!evName || previewMode) return;
    const params = {
      area: areaData?.label || null,
      situacao: areaData ? labelFrom(areaData.situacaoOpts, answers.situacao) : null,
      urgencia: labelFrom(data.urgencia, answers.urgencia)
    };
    // Mesmo id usado nas duas pontas (Pixel no navegador + Conversions API
    // no servidor) pro Meta deduplicar em vez de contar o evento em dobro.
    const eventId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    try {
      const w = window as any;
      if (w.fbq) {
        if (STANDARD_META_EVENTS.includes(evName)) w.fbq("track", evName, params, { eventID: eventId });
        else w.fbq("trackCustom", evName, params, { eventID: eventId });
      }
    } catch {
      /* noop */
    }
    postJson("/api/conversion", {
      evento: evName,
      event_id: eventId,
      funil: data.slug,
      enviado_em: new Date().toISOString(),
      utm: utmRef.current,
      fbp: readCookie("_fbp"),
      fbc: readCookie("_fbc"),
      ...params,
      ...extra
    });
  }

  // ---------- telas ----------

  function renderArea() {
    const keys = data.areaOrder?.length ? data.areaOrder : Object.keys(data.areas);
    return (
      <div className="screen">
        <div className="avatar-row">
          <span className="hand">{data.hero.greeting}</span>
        </div>
        <h1 className="headline" dangerouslySetInnerHTML={{ __html: parseRich(data.hero.headline) }} />
        <p className="sub">{data.hero.subheadline}</p>
        <div className="trust-pill">
          💬 <span dangerouslySetInnerHTML={{ __html: parseRich(data.hero.trustNote) }} />
        </div>
        <div className="q-card">
          <h2>{keys.length === 1 ? "Vamos começar?" : "Qual é a sua área?"}</h2>
          <p className="hint">{keys.length === 1 ? "toca pra continuar ✨" : "toca pra escolher ✨"}</p>
          <div className="opt-list">
            {keys.map((k) => {
              const a = data.areas[k];
              if (!a) return null;
              return (
                <OptionRow
                  key={k}
                  chip={a.chip || "•"}
                  label={a.selectorText || a.label}
                  selected={answers.area === k}
                  onClick={() => { setAnswers((s) => ({ ...s, area: k })); goTo("situacao"); }}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderLoading() {
    return <LoadingScreen done={loadingDone} onDone={() => setLoadingDone(true)} onContinue={() => goTo("honorarios")} />;
  }

  function renderRing() {
    const score = computeScore(answers.urgencia, answers.dores.length, answers.compromisso);
    return <RingScreen score={score} done={ringDone} onDone={() => setRingDone(true)} onContinue={() => goTo("trust")} />;
  }

  function renderDores() {
    if (!areaData) return null;
    return (
      <div className="screen">
        <h2 className="plain-q">{areaData.doresQ}</h2>
        <p className="plain-note">Pode marcar mais de uma.</p>
        <div className="opt-list">
          {areaData.doresOpts.map((o) => {
            const sel = answers.dores.includes(o.v);
            return (
              <OptionRow
                key={o.v}
                chip={o.icon || "•"}
                label={o.t}
                selected={sel}
                checkbox
                onClick={() =>
                  setAnswers((s) => ({
                    ...s,
                    dores: sel ? s.dores.filter((v) => v !== o.v) : [...s.dores, o.v]
                  }))
                }
              />
            );
          })}
        </div>
        <button className="cta" disabled={answers.dores.length === 0} onClick={() => goTo("ring")}>
          Continuar →
        </button>
      </div>
    );
  }

  function renderTrust() {
    return (
      <div className="screen">
        <p className="eyebrow">COMO FUNCIONA</p>
        <h2 className="plain-q">Fale com quem entende do assunto</h2>
        <div className="trust-list">
          <div className="trust-item"><span className="mark">✓</span><span>Avaliação inicial sem custo, direto com um advogado</span></div>
          <div className="trust-item"><span className="mark">✓</span><span>Atendimento 100% online, sem sair de casa</span></div>
          <div className="trust-item"><span className="mark">✓</span><span>Sem compromisso, você decide depois de entender seu caso</span></div>
          <div className="trust-item">
            <span className="mark">✓</span>
            <span>{data.config.lawyerName} <span className="oab-tag">{data.config.oab}</span></span>
          </div>
        </div>
        <button className="cta" onClick={() => goTo("compromisso")}>Continuar →</button>
      </div>
    );
  }

  function buildWhatsAppMessage(nome?: string) {
    if (!areaData) return "";
    const situ = labelFrom(areaData.situacaoOpts, answers.situacao);
    const dores = answers.dores.map((v) => labelFrom(areaData.doresOpts, v));
    const urgencia = labelFrom(data.urgencia, answers.urgencia);
    let msg = nome ? `Olá! Meu nome é ${nome} e fiz a pré-triagem no site.\n` : "Olá! Fiz a pré-triagem no site.\n";
    msg += "Área: " + areaData.label + "\n";
    msg += "Situação: " + situ + "\n";
    if (dores.length) msg += "Principais pontos: " + dores.join(", ") + "\n";
    msg += "Tempo do ocorrido: " + urgencia + "\n";
    msg += answers.compromisso === "duvida" || answers.compromisso === "baixo"
      ? "Ainda tenho dúvidas antes de decidir, gostaria de entender melhor."
      : "Gostaria de falar com um advogado sobre o meu caso o quanto antes.";
    return msg;
  }

  function renderResult() {
    if (!areaData) return null;
    const highIntent = answers.compromisso === "alto" || answers.compromisso === "medio";
    const score = computeScore(answers.urgencia, answers.dores.length, answers.compromisso);

    if (highIntent) {
      return (
        <div className="screen">
          <div className="result-banner">
            <p className="eyebrow">PRÉ-TRIAGEM CONCLUÍDA</p>
            <h2>Seu caso está pronto pra ser avaliado por um advogado.</h2>
            <p>Reunimos o essencial da sua situação pra você não precisar explicar tudo de novo no WhatsApp.</p>
          </div>
          <div className="badge-pill">🎯 {score}% de prioridade de atendimento</div>
          <div className="profile-card">
            <span className="eyebrow">RESUMO DO SEU CASO</span>
            <h3>{areaData.label} · {labelFrom(areaData.situacaoOpts, answers.situacao)}</h3>
            <p>
              Tempo do ocorrido: {labelFrom(data.urgencia, answers.urgencia)}.{" "}
              {answers.dores.length ? "Principais pontos: " + answers.dores.map((v) => labelFrom(areaData.doresOpts, v)).join(", ") + "." : ""}
            </p>
          </div>
          <div className="insight-row">⚖️ Uma avaliação de caso real depende sempre da análise de documentos e provas.</div>
          <div className="insight-row">💬 Só falta seu nome e WhatsApp pra gente já te conectar com o atendente, com esse resumo pronto.</div>
          <LeadContactForm
            previewMode={!!previewMode}
            buildWaLink={(nome) => "https://wa.me/" + data.config.whatsappNumber + "?text=" + encodeURIComponent(buildWhatsAppMessage(nome))}
            onSubmit={async (form) => {
              const payload = {
                tipo: "qualificado",
                funil: data.slug,
                enviado_em: new Date().toISOString(),
                area: areaData.label,
                situacao: labelFrom(areaData.situacaoOpts, answers.situacao),
                urgencia: labelFrom(data.urgencia, answers.urgencia),
                dores: answers.dores.map((v) => labelFrom(areaData.doresOpts, v)),
                compromisso: labelFrom(data.compromisso, answers.compromisso),
                utm: utmRef.current,
                nome: form.nome,
                whatsapp: form.whatsapp,
                pergunta_texto: null,
                pergunta_audio_base64: null,
                pergunta_audio_mime: null
              };
              const result = previewMode ? { ok: true } : await postJson("/api/lead", payload);
              fireEvent("leadQualificado", {
                nome: form.nome,
                whatsapp: form.whatsapp,
                lead_id: result?.id,
                situacao: labelFrom(areaData.situacaoOpts, answers.situacao),
                dores: answers.dores.map((v) => labelFrom(areaData.doresOpts, v)),
                prioridade: score
              });
              return result;
            }}
          />
          <p className="disclaimer">
            Esta pré-triagem é uma ferramenta de organização de informações e não constitui consulta, parecer ou aconselhamento jurídico.
            A existência de direito e as chances de êxito só podem ser avaliadas por um advogado, caso a caso, com base na análise de documentos.
            <br />{data.config.firmName} · {data.config.lawyerName} · {data.config.oab}
          </p>
        </div>
      );
    }

    return (
      <div className="screen">
        <p className="eyebrow">ANTES DE VOCÊ DECIDIR</p>
        <h2 className="plain-q">Sem problema, deixa eu tirar suas dúvidas mais comuns primeiro.</h2>
        <div className="faq">
          <div className="faq-item"><b>Quanto custa a avaliação?</b><span>A avaliação inicial do seu caso não tem custo.</span></div>
          <div className="faq-item"><b>Preciso pagar algo adiantado?</b><span>Depende do caso: em muitas situações os honorários só são combinados se houver um resultado a receber. Isso é explicado na conversa.</span></div>
          <div className="faq-item"><b>Quanto tempo demora um processo assim?</b><span>Varia muito de caso a caso, o advogado consegue te dar uma expectativa real depois de ver a documentação.</span></div>
        </div>
        <DoubtCapture
          previewMode={!!previewMode}
          onSubmit={async (form) => {
            const payload = {
              tipo: "duvida",
              funil: data.slug,
              enviado_em: new Date().toISOString(),
              area: areaData.label,
              situacao: labelFrom(areaData.situacaoOpts, answers.situacao),
              urgencia: labelFrom(data.urgencia, answers.urgencia),
              dores: answers.dores.map((v) => labelFrom(areaData.doresOpts, v)),
              compromisso: labelFrom(data.compromisso, answers.compromisso),
              utm: utmRef.current,
              nome: form.nome,
              whatsapp: form.whatsapp,
              pergunta_texto: form.texto || null,
              pergunta_audio_base64: form.audioBase64 || null,
              pergunta_audio_mime: form.audioMime || null
            };
            const result = previewMode ? { ok: true } : await postJson("/api/lead", payload);
            fireEvent("duvidaCapturada", { nome: form.nome, whatsapp: form.whatsapp, lead_id: result?.id });
            return result;
          }}
        />
        <p className="disclaimer">
          Esta pré-triagem é uma ferramenta de organização de informações e não constitui consulta, parecer ou aconselhamento jurídico.
          <br />{data.config.firmName} · {data.config.lawyerName} · {data.config.oab}
        </p>
      </div>
    );
  }

  let body: React.ReactNode = null;
  switch (step) {
    case "area": body = renderArea(); break;
    case "situacao":
      body = areaData ? (
        <SingleSelect question={areaData.situacaoQ} opts={areaData.situacaoOpts} value={answers.situacao}
          onPick={(v) => { setAnswers((s) => ({ ...s, situacao: v })); goTo("urgencia"); }} />
      ) : null;
      break;
    case "urgencia":
      body = (
        <SingleSelect question={data.urgenciaQ || DEFAULT_QUESTIONS.urgenciaQ} opts={data.urgencia} value={answers.urgencia}
          note="Prazos legais variam de caso a caso, por isso essa informação importa."
          onPick={(v) => { setAnswers((s) => ({ ...s, urgencia: v })); goTo("aspiracao"); }} />
      );
      break;
    case "aspiracao":
      body = (
        <SingleSelect question={data.aspiracaoQ || DEFAULT_QUESTIONS.aspiracaoQ} opts={data.aspiracao} value={answers.aspiracao}
          onPick={(v) => { setAnswers((s) => ({ ...s, aspiracao: v })); goTo("loading1"); }} />
      );
      break;
    case "loading1": body = renderLoading(); break;
    case "honorarios":
      body = (
        <div className="screen">
          <SingleSelect question={data.honorariosQ || DEFAULT_QUESTIONS.honorariosQ} opts={data.honorarios} value={answers.honorarios}
            onPick={(v) => { setAnswers((s) => ({ ...s, honorarios: v })); goTo("dores"); }} />
          <div className="fact-card show" style={{ marginTop: 14 }}>
            <div className="chip">💡</div>
            <span>Em muitos casos como esse, a avaliação inicial não tem custo, e os honorários costumam ser combinados diretamente com o advogado, em geral como percentual sobre o valor recuperado. Os detalhes exatos são explicados na conversa.</span>
          </div>
        </div>
      );
      break;
    case "dores": body = renderDores(); break;
    case "ring": body = renderRing(); break;
    case "trust": body = renderTrust(); break;
    case "compromisso":
      body = (
        <SingleSelect
          question={data.compromissoQ || DEFAULT_QUESTIONS.compromissoQ}
          opts={data.compromisso} value={answers.compromisso}
          onPick={(v) => { setAnswers((s) => ({ ...s, compromisso: v })); goTo("result"); }} />
      );
      break;
    case "result": body = renderResult(); break;
  }

  return (
    <div id="app-shell">
      <div id="progress-track"><div id="progress-fill" style={{ width: progressPct + "%" }} /></div>
      <div id="topbar">
        {stack.length > 0 && (
          <button id="back-btn" type="button" onClick={goBack}>← Voltar</button>
        )}
      </div>
      <div id="stage">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={screenVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: SCREEN_TRANSITION_MS / 1000, ease: APPLE_EASE }}
            style={{ width: "100%" }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------- loading screen ----------

function LoadingScreen({ done, onDone, onContinue }: { done: boolean; onDone: () => void; onContinue: () => void }) {
  const DURATION = 2400; // ms totais da barra, do 0% ao 100%
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

  const facts = [
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
      {facts.map((f, i) => (
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

function RingScreen({ score, done, onDone, onContinue }: { score: number; done: boolean; onDone: () => void; onContinue: () => void }) {
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

interface ContactForm { nome: string; whatsapp: string }

function LeadContactForm({
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

interface DoubtForm { nome: string; whatsapp: string; texto: string; audioBase64?: string; audioMime?: string }

function DoubtCapture({ onSubmit, previewMode }: { onSubmit: (f: DoubtForm) => Promise<{ ok: boolean; demo?: boolean }>; previewMode: boolean }) {
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
