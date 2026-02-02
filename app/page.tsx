"use client";

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { InputField } from "@/components/InputField";
import { TextAreaField } from "@/components/TextAreaField";
import { Toggle } from "@/components/Toggle";
import { StepIndicator } from "@/components/StepIndicator";
import { Modal } from "@/components/Modal";
import { LABEL_COMPLESSITA, TABELLA_CAUTELARE, TABELLA_PRINCIPALE, type Complessita } from "@/lib/tabelle";
import { calcolaRiduzioneTerzo, calcolaRimborso15, cpa4, euro, iva22, percentualeAssistiti, sommaFasi } from "@/lib/calcoli";
import { downloadDocx, downloadJson, fetchTemplateArrayBuffer, renderDocxFromTemplate } from "@/lib/template";
import { initialFormState, type AssistitoExtra, type FormState, type TipoAssistito, type TipoDifensore } from "@/types/form";
import { renderAsync } from "docx-preview";

type Action =
  | { type: "set"; key: keyof FormState; value: any }
  | { type: "setFase"; area: "principale"; key: keyof FormState["fasiRichieste"]; value: boolean }
  | { type: "setFaseCaut"; key: keyof FormState["fasiCautelare"]; value: boolean }
  | { type: "addAssistito" }
  | { type: "removeAssistito"; idx: number }
  | { type: "updateAssistito"; idx: number; key: keyof AssistitoExtra; value: string };

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case "set":
      return { ...state, [action.key]: action.value };
    case "setFase":
      return { ...state, fasiRichieste: { ...state.fasiRichieste, [action.key]: action.value } };
    case "setFaseCaut":
      return { ...state, fasiCautelare: { ...state.fasiCautelare, [action.key]: action.value } };
    case "addAssistito":
      return { ...state, assistitiMultipli: [...state.assistitiMultipli, { cognome: "", nome: "", luogoNascita: "", dataNascita: "" }] };
    case "removeAssistito":
      return { ...state, assistitiMultipli: state.assistitiMultipli.filter((_, i) => i !== action.idx) };
    case "updateAssistito":
      return {
        ...state,
        assistitiMultipli: state.assistitiMultipli.map((a, i) => (i === action.idx ? { ...a, [action.key]: action.value } : a)),
      };
    default:
      return state;
  }
}

function SectionCard({ title, color, children }: { title: string; color: "blue" | "violet" | "green"; children: React.ReactNode }) {
  const border = color === "violet" ? "border-violet-400/25" : color === "green" ? "border-emerald-400/25" : "border-blue-400/25";
  const bg = color === "violet" ? "bg-violet-500/10" : color === "green" ? "bg-emerald-500/10" : "bg-blue-500/10";
  return (
    <div className={"rounded-2xl border " + border + " " + bg + " p-4 shadow-sm"}>
      <div className="text-sm font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}

export default function Page() {
  const [state, dispatch] = useReducer(reducer, initialFormState);
  const [step, setStep] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const templateBufRef = useRef<ArrayBuffer | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        templateBufRef.current = await fetchTemplateArrayBuffer("/template-liquidazione.docx");
      } catch (e: any) {
        setTemplateError(e?.message ?? "Errore template");
      }
    })();
  }, []);

  const principaleBase = useMemo(() => sommaFasi(TABELLA_PRINCIPALE[state.complessita], state.fasiRichieste), [state.complessita, state.fasiRichieste]);
  const principaleRid = useMemo(() => calcolaRiduzioneTerzo(principaleBase), [principaleBase]);
  const principaleSpese15 = useMemo(() => calcolaRimborso15(principaleRid.ridTot), [principaleRid.ridTot]);
  const principaleTot = useMemo(() => principaleRid.ridTot + principaleSpese15, [principaleRid.ridTot, principaleSpese15]);

  const cautelareBase = useMemo(() => {
    if (!state.cautelarePresente) return 0;
    return sommaFasi(TABELLA_CAUTELARE[state.complessitaCautelare], state.fasiCautelare);
  }, [state.cautelarePresente, state.complessitaCautelare, state.fasiCautelare]);
  const cautelareRid = useMemo(() => calcolaRiduzioneTerzo(cautelareBase), [cautelareBase]);
  const cautelareSpese15 = useMemo(() => calcolaRimborso15(cautelareRid.ridTot), [cautelareRid.ridTot]);
  const cautelareTot = useMemo(() => (state.cautelarePresente ? cautelareRid.ridTot + cautelareSpese15 : 0), [state.cautelarePresente, cautelareRid.ridTot, cautelareSpese15]);

  const numSoggetti = useMemo(() => 1 + state.assistitiMultipli.length, [state.assistitiMultipli.length]);
  const percAssistiti = useMemo(() => percentualeAssistiti(numSoggetti), [numSoggetti]);
  const maggiorazioneAssistiti = useMemo(() => (principaleTot + cautelareTot) * percAssistiti, [principaleTot, cautelareTot, percAssistiti]);

  const imponibile = useMemo(() => principaleTot + cautelareTot + maggiorazioneAssistiti, [principaleTot, cautelareTot, maggiorazioneAssistiti]);
  const cpa = useMemo(() => cpa4(imponibile), [imponibile]);
  const iva = useMemo(() => iva22(imponibile + cpa), [imponibile, cpa]);
  const totaleFinale = useMemo(() => imponibile + cpa + iva, [imponibile, cpa, iva]);

  const stepDone = useMemo(() => {
    const s1 = !!state.rgt && !!state.rgnr && !!state.giudice && !!state.avvocato && !!state.assistitoCognome && !!state.assistitoNome;
    const s2 = Object.values(state.fasiRichieste).some(Boolean);
    const s3 = !state.cautelarePresente || Object.values(state.fasiCautelare).some(Boolean);
    const s4 = true; // opzionale
    const s5 = true;
    return { 1: s1, 2: s2, 3: s3, 4: s4, 5: s5 } as Record<number, boolean>;
  }, [state]);

  const steps = useMemo(() => {
    return [
      { id: 1, title: "Dati generali", done: stepDone[1], reachable: true },
      { id: 2, title: "Importi principale", done: stepDone[2], reachable: stepDone[1] },
      { id: 3, title: "Cautelare", done: stepDone[3], reachable: stepDone[1] && stepDone[2] },
      { id: 4, title: "Assistiti multipli", done: stepDone[4], reachable: stepDone[1] && stepDone[2] },
      { id: 5, title: "Anteprima & genera", done: stepDone[5], reachable: stepDone[1] && stepDone[2] },
    ];
  }, [stepDone]);

  const goStep = useCallback((id: number) => setStep(id), []);

  const templateData = useMemo(() => {
    // Mappatura placeholder -> valori.
    // IMPORTANTE: questi nomi devono combaciare con i {{...}} del tuo template DOCX.
    // Se nel template hai chiavi diverse, cambia QUI (non la formattazione del DOCX).
    return {
      // Step 1
      rgt: state.rgt,
      rgnr: state.rgnr,
      siamm: state.siamm,
      dataSentenza: state.dataSentenza,
      numeroMod27: state.numeroMod27,
      dataMod27: state.dataMod27,
      giudice: state.giudice,
      avvocato: state.avvocato,
      cfAvvocato: state.cfAvvocato,
      pivaAvvocato: state.pivaAvvocato,
      tipoDifensore: state.tipoDifensore,
      assistitoCognome: state.assistitoCognome,
      assistitoNome: state.assistitoNome,
      assistitoLuogoNascita: state.assistitoLuogoNascita,
      assistitoDataNascita: state.assistitoDataNascita,
      assistitoResidenza: state.assistitoResidenza,
      domiciliatoPressoDifensore: state.domiciliatoPressoDifensore ? "Sì" : "No",
      tipoAssistito: state.tipoAssistito,

      // Motivazioni
      motivazioneStudio: state.motivazioneStudio,
      motivazioneIntroduttiva: state.motivazioneIntroduttiva,
      motivazioneIstruttoria: state.motivazioneIstruttoria,
      motivazioneDecisionale: state.motivazioneDecisionale,
      motivazioneAssistiti: state.motivazioneAssistiti,
      motivazioneCautelare: state.motivazioneCautelare,

      // Calcoli (se li hai come placeholder nel template)
      complessita: state.complessita,
      complessitaLabel: LABEL_COMPLESSITA[state.complessita],
      principaleBase: euro(principaleBase),
      principaleRiduzione: euro(principaleRid.rid),
      principaleRidotto: euro(principaleRid.ridTot),
      principaleSpese15: euro(principaleSpese15),
      principaleTotale: euro(principaleTot),

      cautelarePresente: state.cautelarePresente ? "Sì" : "No",
      complessitaCautelare: state.complessitaCautelare,
      complessitaCautelareLabel: LABEL_COMPLESSITA[state.complessitaCautelare],
      cautelareBase: euro(cautelareBase),
      cautelareRiduzione: euro(cautelareRid.rid),
      cautelareRidotto: euro(cautelareRid.ridTot),
      cautelareSpese15: euro(cautelareSpese15),
      cautelareTotale: euro(cautelareTot),

      numSoggetti: String(numSoggetti),
      percentualeAssistiti: (percAssistiti * 100).toFixed(0) + "%",
      maggiorazioneAssistiti: euro(maggiorazioneAssistiti),

      imponibile: euro(imponibile),
      cpa4: euro(cpa),
      iva22: euro(iva),
      totaleFinale: euro(totaleFinale),

      // Lista assistiti extra (se nel template usi loop docxtemplater: {#assistitiMultipli} ... {/assistitiMultipli})
      assistitiMultipli: state.assistitiMultipli.map((a) => ({
        cognome: a.cognome,
        nome: a.nome,
        luogoNascita: a.luogoNascita,
        dataNascita: a.dataNascita,
      })),
    };
  }, [
    state,
    principaleBase,
    principaleRid.rid,
    principaleRid.ridTot,
    principaleSpese15,
    principaleTot,
    cautelareBase,
    cautelareRid.rid,
    cautelareRid.ridTot,
    cautelareSpese15,
    cautelareTot,
    numSoggetti,
    percAssistiti,
    maggiorazioneAssistiti,
    imponibile,
    cpa,
    iva,
    totaleFinale,
  ]);

  const onPreview = useCallback(async () => {
    try {
      setPreviewOpen(true);
      if (!previewRef.current) return;
      previewRef.current.innerHTML = "";
      const buf = templateBufRef.current;
      if (!buf) throw new Error(templateError ?? "Template non caricato");

      const blob = renderDocxFromTemplate(buf, templateData);

      // render DOCX in HTML per preview
      await renderAsync(blob, previewRef.current, undefined, {
        className: "docx",
        inWrapper: true,
      });
    } catch (e: any) {
      alert(e?.message ?? "Errore anteprima");
    }
  }, [templateData, templateError]);

  const onGenerateDocx = useCallback(() => {
    try {
      const buf = templateBufRef.current;
      if (!buf) throw new Error(templateError ?? "Template non caricato");
      const blob = renderDocxFromTemplate(buf, templateData);
      downloadDocx(blob, "Liquidazione_Gratuito_Patrocinio_Brindisi.docx");
    } catch (e: any) {
      alert(e?.message ?? "Errore generazione DOCX");
    }
  }, [templateData, templateError]);

  const onGenerateJson = useCallback(() => {
    downloadJson(state, "liquidazione_gratuito_patrocinio.json");
  }, [state]);

  const Header = (
    <div className="sticky top-0 z-10 backdrop-blur border-b border-white/10 bg-oltremare-950/70">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-200/80">TRIBUNALE DI BRINDISI - Sezione Penale</div>
          <div className="text-lg font-semibold">Liquidazione Gratuito Patrocinio</div>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reset
          </button>
          <button
            className="rounded-xl bg-blue-500/80 px-3 py-2 text-sm hover:bg-blue-500"
            onClick={onGenerateJson}
            type="button"
          >
            Scarica JSON
          </button>
        </div>
      </div>
    </div>
  );

  const FooterNav = (
    <div className="flex items-center justify-between gap-2 pt-4">
      <button
        type="button"
        onClick={() => setStep((s) => Math.max(1, s - 1))}
        className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
      >
        Indietro
      </button>
      <button
        type="button"
        onClick={() => setStep((s) => Math.min(5, s + 1))}
        className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
      >
        Avanti
      </button>
    </div>
  );

  return (
    <div>
      {Header}
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <StepIndicator steps={steps} active={step} onGo={goStep} />

        {templateError ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm">
            <div className="font-semibold mb-1">Attenzione: template DOCX non caricato</div>
            <div className="text-slate-200/80">
              Assicurati che il file sia in <code className="px-1 py-0.5 rounded bg-black/30">/public/template-liquidazione.docx</code>.
            </div>
            <div className="text-slate-200/80 mt-2">{templateError}</div>
          </div>
        ) : null}

        {step === 1 && (
          <div className="space-y-4">
            <SectionCard title="Procedimento" color="blue">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <InputField label="N. R.G.T." value={state.rgt} onChange={(v) => dispatch({ type: "set", key: "rgt", value: v })} />
                <InputField label="N. R.G.N.R." value={state.rgnr} onChange={(v) => dispatch({ type: "set", key: "rgnr", value: v })} />
                <InputField label="N. SIAMM" value={state.siamm} onChange={(v) => dispatch({ type: "set", key: "siamm", value: v })} />
                <InputField label="Data udienza/sentenza" type="date" value={state.dataSentenza} onChange={(v) => dispatch({ type: "set", key: "dataSentenza", value: v })} />
              </div>
            </SectionCard>

            <SectionCard title="Ammissione G.P." color="blue">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InputField label="N. Mod. 27" value={state.numeroMod27} onChange={(v) => dispatch({ type: "set", key: "numeroMod27", value: v })} />
                <InputField label="Data decreto ammissione" type="date" value={state.dataMod27} onChange={(v) => dispatch({ type: "set", key: "dataMod27", value: v })} />
              </div>
            </SectionCard>

            <SectionCard title="Giudice" color="blue">
              <InputField label="Nome completo con titolo" value={state.giudice} onChange={(v) => dispatch({ type: "set", key: "giudice", value: v })} />
            </SectionCard>

            <SectionCard title="Avvocato" color="blue">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <InputField label="Nome e Cognome" value={state.avvocato} onChange={(v) => dispatch({ type: "set", key: "avvocato", value: v })} />
                <label className="block">
                  <div className="text-xs font-semibold text-slate-200/90 mb-1">Tipo</div>
                  <select
                    value={state.tipoDifensore}
                    onChange={(e) => dispatch({ type: "set", key: "tipoDifensore", value: e.target.value as TipoDifensore })}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400/60"
                  >
                    <option value="fiducia">Fiducia</option>
                    <option value="ufficio">Ufficio</option>
                  </select>
                </label>
                <InputField label="Codice Fiscale" value={state.cfAvvocato} onChange={(v) => dispatch({ type: "set", key: "cfAvvocato", value: v })} />
                <InputField label="P. IVA" value={state.pivaAvvocato} onChange={(v) => dispatch({ type: "set", key: "pivaAvvocato", value: v })} />
              </div>
            </SectionCard>

            <SectionCard title="Assistito" color="blue">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <InputField label="Cognome" value={state.assistitoCognome} onChange={(v) => dispatch({ type: "set", key: "assistitoCognome", value: v })} />
                <InputField label="Nome" value={state.assistitoNome} onChange={(v) => dispatch({ type: "set", key: "assistitoNome", value: v })} />
                <InputField label="Luogo di nascita" value={state.assistitoLuogoNascita} onChange={(v) => dispatch({ type: "set", key: "assistitoLuogoNascita", value: v })} />
                <InputField label="Data di nascita" type="date" value={state.assistitoDataNascita} onChange={(v) => dispatch({ type: "set", key: "assistitoDataNascita", value: v })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <InputField label="Residenza" value={state.assistitoResidenza} onChange={(v) => dispatch({ type: "set", key: "assistitoResidenza", value: v })} />
                <Toggle
                  label="Domiciliato presso il difensore"
                  checked={state.domiciliatoPressoDifensore}
                  onChange={(v) => dispatch({ type: "set", key: "domiciliatoPressoDifensore", value: v })}
                  color="blue"
                />
                <label className="block">
                  <div className="text-xs font-semibold text-slate-200/90 mb-1">Qualità</div>
                  <select
                    value={state.tipoAssistito}
                    onChange={(e) => dispatch({ type: "set", key: "tipoAssistito", value: e.target.value as TipoAssistito })}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400/60"
                  >
                    <option value="imputato">Imputato</option>
                    <option value="parte_civile">Parte civile</option>
                    <option value="persona_offesa">Persona offesa</option>
                  </select>
                </label>
              </div>
            </SectionCard>

            <SectionCard title="Motivazioni (per fase)" color="blue">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextAreaField label="Studio" value={state.motivazioneStudio} onChange={(v) => dispatch({ type: "set", key: "motivazioneStudio", value: v })} />
                <TextAreaField label="Introduttiva" value={state.motivazioneIntroduttiva} onChange={(v) => dispatch({ type: "set", key: "motivazioneIntroduttiva", value: v })} />
                <TextAreaField label="Istruttoria" value={state.motivazioneIstruttoria} onChange={(v) => dispatch({ type: "set", key: "motivazioneIstruttoria", value: v })} />
                <TextAreaField label="Decisionale" value={state.motivazioneDecisionale} onChange={(v) => dispatch({ type: "set", key: "motivazioneDecisionale", value: v })} />
              </div>
            </SectionCard>

            {FooterNav}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <SectionCard title="Importi - Procedimento principale (D.M. 55/2014 - Allegato A)" color="blue">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="block">
                  <div className="text-xs font-semibold text-slate-200/90 mb-1">Complessità</div>
                  <select
                    value={state.complessita}
                    onChange={(e) => dispatch({ type: "set", key: "complessita", value: e.target.value as Complessita })}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400/60"
                  >
                    <option value="semplice">Semplice</option>
                    <option value="medio">Medio</option>
                    <option value="complesso">Complesso</option>
                  </select>
                </label>

                <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(["studio", "introduttiva", "istruttoria", "decisionale"] as const).map((k) => (
                    <label key={k} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={state.fasiRichieste[k]}
                        onChange={(e) => dispatch({ type: "setFase", area: "principale", key: k, value: e.target.checked })}
                        className="accent-blue-400"
                      />
                      <span className="capitalize">{k}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-slate-200/70 text-xs">Totale fasi</div>
                    <div className="font-semibold">€ {euro(principaleBase)}</div>
                  </div>
                  <div>
                    <div className="text-slate-200/70 text-xs">Riduzione 1/3 (art. 106-bis)</div>
                    <div className="font-semibold">- € {euro(principaleRid.rid)}</div>
                  </div>
                  <div>
                    <div className="text-slate-200/70 text-xs">Totale ridotto</div>
                    <div className="font-semibold">€ {euro(principaleRid.ridTot)}</div>
                  </div>
                  <div>
                    <div className="text-slate-200/70 text-xs">Rimborso spese 15%</div>
                    <div className="font-semibold">+ € {euro(principaleSpese15)}</div>
                  </div>
                </div>
                <div className="mt-3 text-right text-sm">
                  <span className="text-slate-200/70 mr-2">Totale principale:</span>
                  <span className="text-base font-semibold">€ {euro(principaleTot)}</span>
                </div>
              </div>
            </SectionCard>
            {FooterNav}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <SectionCard title="Subprocedimento cautelare (D.M. 55/2014 - Allegato B)" color="violet">
              <Toggle
                label="Attiva cautelare"
                checked={state.cautelarePresente}
                onChange={(v) => dispatch({ type: "set", key: "cautelarePresente", value: v })}
                color="violet"
              />

              {state.cautelarePresente ? (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="block">
                      <div className="text-xs font-semibold text-slate-200/90 mb-1">Complessità cautelare</div>
                      <select
                        value={state.complessitaCautelare}
                        onChange={(e) => dispatch({ type: "set", key: "complessitaCautelare", value: e.target.value as Complessita })}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400/60"
                      >
                        <option value="semplice">Semplice</option>
                        <option value="medio">Medio</option>
                        <option value="complesso">Complesso</option>
                      </select>
                    </label>

                    <div className="md:col-span-2 grid grid-cols-3 gap-2">
                      {(["studio", "introduttiva", "decisionale"] as const).map((k) => (
                        <label key={k} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={state.fasiCautelare[k]}
                            onChange={(e) => dispatch({ type: "setFaseCaut", key: k, value: e.target.checked })}
                            className="accent-violet-400"
                          />
                          <span className="capitalize">{k}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <TextAreaField
                    label="Motivazione cautelare"
                    value={state.motivazioneCautelare}
                    onChange={(v) => dispatch({ type: "set", key: "motivazioneCautelare", value: v })}
                  />

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-slate-200/70 text-xs">Totale fasi</div>
                        <div className="font-semibold">€ {euro(cautelareBase)}</div>
                      </div>
                      <div>
                        <div className="text-slate-200/70 text-xs">Riduzione 1/3</div>
                        <div className="font-semibold">- € {euro(cautelareRid.rid)}</div>
                      </div>
                      <div>
                        <div className="text-slate-200/70 text-xs">Totale ridotto</div>
                        <div className="font-semibold">€ {euro(cautelareRid.ridTot)}</div>
                      </div>
                      <div>
                        <div className="text-slate-200/70 text-xs">Rimborso spese 15%</div>
                        <div className="font-semibold">+ € {euro(cautelareSpese15)}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-right text-sm">
                      <span className="text-slate-200/70 mr-2">Totale cautelare:</span>
                      <span className="text-base font-semibold">€ {euro(cautelareTot)}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </SectionCard>

            {FooterNav}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <SectionCard title="Assistiti multipli (art. 12 D.M. 55/2014)" color="green">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-semibold mb-2">Assistito principale</div>
                <div className="text-sm text-slate-200/80">
                  {state.assistitoCognome} {state.assistitoNome} — {state.assistitoLuogoNascita} — {state.assistitoDataNascita || "—"}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-200/80">
                  Soggetti totali: <span className="font-semibold">{numSoggetti}</span> — Maggiorazione:{" "}
                  <span className="font-semibold">{(percAssistiti * 100).toFixed(0)}%</span>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "addAssistito" })}
                  className="rounded-xl bg-emerald-500/80 px-3 py-2 text-sm hover:bg-emerald-500"
                >
                  Aggiungi assistito
                </button>
              </div>

              {state.assistitiMultipli.length ? (
                <div className="mt-4 space-y-3">
                  {state.assistitiMultipli.map((a, idx) => (
                    <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold">Assistito aggiuntivo #{idx + 1}</div>
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "removeAssistito", idx })}
                          className="rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/15"
                        >
                          Rimuovi
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <InputField label="Cognome" value={a.cognome} onChange={(v) => dispatch({ type: "updateAssistito", idx, key: "cognome", value: v })} />
                        <InputField label="Nome" value={a.nome} onChange={(v) => dispatch({ type: "updateAssistito", idx, key: "nome", value: v })} />
                        <InputField label="Luogo nascita" value={a.luogoNascita} onChange={(v) => dispatch({ type: "updateAssistito", idx, key: "luogoNascita", value: v })} />
                        <InputField label="Data nascita" type="date" value={a.dataNascita} onChange={(v) => dispatch({ type: "updateAssistito", idx, key: "dataNascita", value: v })} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4">
                <TextAreaField
                  label="Motivazione assistiti"
                  value={state.motivazioneAssistiti}
                  onChange={(v) => dispatch({ type: "set", key: "motivazioneAssistiti", value: v })}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-slate-200/70 text-xs">Base (principale + cautelare)</div>
                    <div className="font-semibold">€ {euro(principaleTot + cautelareTot)}</div>
                  </div>
                  <div>
                    <div className="text-slate-200/70 text-xs">Maggiorazione</div>
                    <div className="font-semibold">€ {euro(maggiorazioneAssistiti)}</div>
                  </div>
                  <div>
                    <div className="text-slate-200/70 text-xs">Totale imponibile parziale</div>
                    <div className="font-semibold">€ {euro(principaleTot + cautelareTot + maggiorazioneAssistiti)}</div>
                  </div>
                </div>
              </div>
            </SectionCard>
            {FooterNav}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <SectionCard title="Riepilogo & Generazione" color="blue">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold mb-2">Dati</div>
                  <div className="text-sm text-slate-200/80 space-y-1">
                    <div>R.G.T.: <span className="font-semibold">{state.rgt || "—"}</span></div>
                    <div>R.G.N.R.: <span className="font-semibold">{state.rgnr || "—"}</span></div>
                    <div>Giudice: <span className="font-semibold">{state.giudice || "—"}</span></div>
                    <div>Avv.: <span className="font-semibold">{state.avvocato || "—"}</span> ({state.tipoDifensore})</div>
                    <div>Assistito: <span className="font-semibold">{state.assistitoCognome} {state.assistitoNome}</span></div>
                    <div>Cautelare: <span className="font-semibold">{state.cautelarePresente ? "Sì" : "No"}</span></div>
                    <div>Assistiti totali: <span className="font-semibold">{numSoggetti}</span></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold mb-2">Totali</div>
                  <div className="text-sm text-slate-200/80 space-y-1">
                    <div>Principale: <span className="font-semibold">€ {euro(principaleTot)}</span></div>
                    <div>Cautelare: <span className="font-semibold">€ {euro(cautelareTot)}</span></div>
                    <div>Maggiorazione assistiti: <span className="font-semibold">€ {euro(maggiorazioneAssistiti)}</span></div>
                    <div className="pt-2 border-t border-white/10">Imponibile: <span className="font-semibold">€ {euro(imponibile)}</span></div>
                    <div>+ 4% CPA: <span className="font-semibold">€ {euro(cpa)}</span></div>
                    <div>+ 22% IVA: <span className="font-semibold">€ {euro(iva)}</span></div>
                    <div className="pt-2 border-t border-white/10 text-base">
                      Totale finale: <span className="font-semibold">€ {euro(totaleFinale)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onPreview}
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                >
                  Anteprima (modal)
                </button>

                <button
                  type="button"
                  onClick={onGenerateDocx}
                  className="rounded-xl bg-blue-500/80 px-4 py-2 text-sm hover:bg-blue-500"
                >
                  Genera DOCX (template)
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                  title="Usa 'Salva come PDF' nella finestra di stampa"
                >
                  Stampa / Salva PDF
                </button>
              </div>
            </SectionCard>
          </div>
        )}

        <div className="text-xs text-slate-200/60">
          Suggerimento: se alcuni placeholder del tuo DOCX non vengono riempiti, aggiorna la mappa in <code className="px-1 py-0.5 rounded bg-black/30">app/page.tsx</code>{" "}
          (oggetto <code className="px-1 py-0.5 rounded bg-black/30">templateData</code>) usando i nomi esatti tra <code className="px-1 py-0.5 rounded bg-black/30">{"{{ }}"}</code>.
        </div>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Anteprima decreto (dal template DOCX)">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="text-xs text-slate-200/70">
            Preview renderizzata dal DOCX. Per ottenere un PDF: clicca “Stampa / Salva PDF” e scegli “Salva come PDF”.
          </div>
          <button className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15" onClick={() => window.print()}>
            Stampa / PDF
          </button>
        </div>
        <div ref={previewRef} className="bg-white text-black rounded-xl p-3 overflow-auto" />
        <style jsx global>{`
          @media print {
            body { background: white !important; color: black !important; }
            .docx-wrapper { background: white !important; padding: 0 !important; }
          }
          .docx-wrapper { background: white; }
        `}</style>
      </Modal>
    </div>
  );
}
