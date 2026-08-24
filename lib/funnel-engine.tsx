"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_QUESTIONS, type FunnelData, type Option, type AreaContent } from "./funnel-schema";
import {
  SCREEN_TRANSITION_MS, APPLE_EASE, screenVariants, STANDARD_META_EVENTS,
  parseRich, labelFrom, readUtm, readCookie, initMetaPixel, postJson,
  OptionRow, SingleSelect, LoadingScreen, RingScreen, LeadContactForm, DoubtCapture,
  type Utm
} from "./funnel-engine-shared";

// ---------- helpers de conteúdo ----------

const ORDER = [
  "area", "situacao", "urgencia", "aspiracao", "loading1",
  "honorarios", "dores", "ring", "trust", "compromisso", "result"
] as const;
type StepId = (typeof ORDER)[number];

interface Answers {
  area: string | null;
  situacao: string | null;
  urgencia: string | null;
  aspiracao: string | null;
  honorarios: string | null;
  dores: string[];
  compromisso: string | null;
}

function computeScore(urgencia: string | null, doresCount: number, compromisso: string | null): number {
  let score = 55;
  if (urgencia === "antigo" || urgencia === "recente") score += 15;
  if (doresCount >= 2) score += 12;
  if (compromisso === "alto") score += 10;
  return Math.min(score, 96);
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
