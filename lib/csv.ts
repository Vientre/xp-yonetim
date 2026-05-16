/**
 * Client-side CSV / Excel export helpers
 *
 * - UTF-8 BOM eklendiği için Excel'de Türkçe karakterler doğru gözükür
 * - Değerler arasındaki virgül/çift tırnak/yeni satır otomatik escape edilir
 */

type Cell = string | number | null | undefined

export function toCsv(rows: Cell[][], separator: "," | ";" = ";"): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = cell === null || cell === undefined ? "" : String(cell)
          if (s.includes(separator) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
            return `"${s.replace(/"/g, '""')}"`
          }
          return s
        })
        .join(separator)
    )
    .join("\r\n")
}

export function downloadCsv(filename: string, rows: Cell[][], separator: "," | ";" = ";") {
  const csv = toCsv(rows, separator)
  // BOM (﻿) → Excel UTF-8 olarak doğru açar
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
