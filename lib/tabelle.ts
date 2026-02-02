export type Complessita = "semplice" | "medio" | "complesso";

export const TABELLA_PRINCIPALE: Record<Complessita, Record<string, number>> = {
  semplice: { studio: 237, introduttiva: 284, istruttoria: 567, decisionale: 709 },
  medio: { studio: 473, introduttiva: 567, istruttoria: 1134, decisionale: 1418 },
  complesso: { studio: 710, introduttiva: 851, istruttoria: 1701, decisionale: 2127 },
};

export const TABELLA_CAUTELARE: Record<Complessita, Record<string, number>> = {
  semplice: { studio: 189, introduttiva: 615, decisionale: 709 },
  medio: { studio: 378, introduttiva: 1229, decisionale: 1418 },
  complesso: { studio: 567, introduttiva: 1844, decisionale: 2127 },
};

export const LABEL_COMPLESSITA: Record<Complessita, string> = {
  semplice: "Semplice",
  medio: "Medio",
  complesso: "Complesso",
};
