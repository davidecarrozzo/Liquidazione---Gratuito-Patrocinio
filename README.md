# Liquidazione Gratuito Patrocinio – Tribunale di Brindisi (Sezione Penale)

Webapp React/Next.js a 5 step per compilare dati e calcolare importi (D.M. 55/2014) e generare:
- DOCX **identico al template** (sostituzione placeholder `{{...}}` con Docxtemplater)
- JSON con tutti i dati
- PDF tramite **Stampa / Salva come PDF** dal browser (la conversione DOCX→PDF automatica su Vercel non è standard senza servizi esterni)

## Avvio

```bash
npm i
npm run dev
```

Apri http://localhost:3000

## Template DOCX

Il file è in:
`/public/template-liquidazione.docx`

I placeholder devono essere nel formato `{{chiave}}`.

La mappatura chiave→valore è in `app/page.tsx` dentro `templateData`.
Se nel tuo DOCX i placeholder hanno nomi diversi, modifica SOLO `templateData`.

## Deploy Vercel

- Push su GitHub
- Import su Vercel
- Framework preset: Next.js
