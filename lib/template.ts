import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

export async function fetchTemplateArrayBuffer(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Impossibile caricare il template DOCX");
  return await res.arrayBuffer();
}

/**
 * Riempie il template DOCX mantenendo formattazione/contenuto invariati:
 * sostituisce esclusivamente i placeholder {{...}} presenti nel file.
 */
export function renderDocxFromTemplate(templateArrayBuffer: ArrayBuffer, data: Record<string, any>) {
  const zip = new PizZip(templateArrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(data);

  const out = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return out as Blob;
}

export function downloadDocx(blob: Blob, filename: string) {
  saveAs(blob, filename);
}

export function downloadJson(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8" });
  saveAs(blob, filename);
}
