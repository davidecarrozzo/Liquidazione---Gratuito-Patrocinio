import type { Complessita } from "@/lib/tabelle";
import type { FasiPrincipale, FasiCautelare } from "@/lib/calcoli";

export type TipoDifensore = "fiducia" | "ufficio";
export type TipoAssistito = "imputato" | "parte_civile" | "persona_offesa";

export type AssistitoExtra = {
  cognome: string;
  nome: string;
  luogoNascita: string;
  dataNascita: string;
};

export type FormState = {
  rgt: string; rgnr: string; siamm: string;
  giudice: string; dataSentenza: string;
  numeroMod27: string; dataMod27: string;

  avvocato: string; cfAvvocato: string; pivaAvvocato: string; tipoDifensore: TipoDifensore;

  assistitoCognome: string; assistitoNome: string;
  assistitoLuogoNascita: string; assistitoDataNascita: string;
  assistitoResidenza: string; domiciliatoPressoDifensore: boolean;
  tipoAssistito: TipoAssistito;

  complessita: Complessita;
  fasiRichieste: FasiPrincipale;

  cautelarePresente: boolean;
  complessitaCautelare: Complessita;
  fasiCautelare: FasiCautelare;

  assistitiMultipli: AssistitoExtra[];

  motivazioneStudio: string;
  motivazioneIntroduttiva: string;
  motivazioneIstruttoria: string;
  motivazioneDecisionale: string;
  motivazioneAssistiti: string;
  motivazioneCautelare: string;
};

export const initialFormState: FormState = {
  rgt: "", rgnr: "", siamm: "",
  giudice: "", dataSentenza: "",
  numeroMod27: "", dataMod27: "",

  avvocato: "", cfAvvocato: "", pivaAvvocato: "", tipoDifensore: "fiducia",

  assistitoCognome: "", assistitoNome: "",
  assistitoLuogoNascita: "", assistitoDataNascita: "",
  assistitoResidenza: "", domiciliatoPressoDifensore: false,
  tipoAssistito: "imputato",

  complessita: "semplice",
  fasiRichieste: { studio: true, introduttiva: false, istruttoria: false, decisionale: true },

  cautelarePresente: false,
  complessitaCautelare: "semplice",
  fasiCautelare: { studio: false, introduttiva: false, decisionale: false },

  assistitiMultipli: [],

  motivazioneStudio: "",
  motivazioneIntroduttiva: "",
  motivazioneIstruttoria: "",
  motivazioneDecisionale: "",
  motivazioneAssistiti: "",
  motivazioneCautelare: "",
};
