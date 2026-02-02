export type FasiPrincipale = {
  studio: boolean;
  introduttiva: boolean;
  istruttoria: boolean;
  decisionale: boolean;
};

export type FasiCautelare = {
  studio: boolean;
  introduttiva: boolean;
  decisionale: boolean;
};

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function euro(n: number) {
  return round2(n).toFixed(2).replace(".", ",");
}

export function sommaFasi(tabella: Record<string, number>, fasi: Record<string, boolean>) {
  return Object.entries(fasi).reduce((acc, [k, v]) => acc + (v ? (tabella[k] ?? 0) : 0), 0);
}

export function calcolaRiduzioneTerzo(totale: number) {
  const rid = totale / 3;
  const ridTot = totale - rid;
  return { rid: round2(rid), ridTot: round2(ridTot) };
}

export function calcolaRimborso15(totaleRidotto: number) {
  return round2(totaleRidotto * 0.15);
}

/**
 * Maggiorazione art. 12 D.M. 55/2014:
 * +30% per ogni assistito fino a 10 soggetti, +10% oltre.
 * Ritorna percentuale totale (es. 0.6 = +60%).
 */
export function percentualeAssistiti(numSoggettiTotali: number) {
  const extra = Math.max(0, numSoggettiTotali - 1);
  if (extra <= 0) return 0;
  if (numSoggettiTotali <= 10) return extra * 0.3;
  return 9 * 0.3 + (numSoggettiTotali - 10) * 0.1;
}

export function cpa4(totale: number) {
  return round2(totale * 0.04);
}

export function iva22(base: number) {
  return round2(base * 0.22);
}
