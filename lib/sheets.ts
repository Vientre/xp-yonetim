/**
 * Google Sheets API client
 *
 * Sheet tab names → TABS constant in lib/constants.ts
 *
 * Each tab has a header row (row 1).
 * Data starts from row 2.
 * Column A is always the record ID.
 */

import { google } from "googleapis"
import { TABS } from "@/lib/constants"

// ─── Auth ────────────────────────────────────────────────────────────────────

function getAuth() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n")
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
}

async function getSheets() {
  const auth = getAuth()
  return google.sheets({ version: "v4", auth })
}

const SHEET_ID = () => {
  const id = process.env.GOOGLE_SHEET_ID
  if (!id) throw new Error("GOOGLE_SHEET_ID ortam değişkeni ayarlanmamış")
  return id
}

// ─── Base operations ─────────────────────────────────────────────────────────

/**
 * Get all data rows from a tab (skips header row 1).
 * Returns empty array if tab is empty.
 */
export async function getRows(tab: string): Promise<string[][]> {
  const sheets = await getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: `${tab}!A2:Z2000`,
  })
  return (res.data.values ?? []) as string[][]
}

/**
 * Append a new row to a tab.
 * All values are converted to strings.
 */
export async function appendRow(
  tab: string,
  values: (string | number | boolean | null | undefined)[]
): Promise<void> {
  const sheets = await getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: `${tab}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values.map((v) => String(v ?? ""))] },
  })
}

/**
 * Update an existing row by its 0-based data index (excludes header row).
 */
export async function updateRowByIndex(
  tab: string,
  rowIndex: number,
  values: (string | number | boolean | null | undefined)[]
): Promise<void> {
  const sheets = await getSheets()
  const sheetRow = rowIndex + 2 // +1 for 1-indexed, +1 for header
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `${tab}!A${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values.map((v) => String(v ?? ""))] },
  })
}

/**
 * Delete a row by its 0-based data index (excludes header row).
 * Uses batchUpdate to physically remove the row.
 */
export async function deleteRowByIndex(tab: string, rowIndex: number): Promise<void> {
  const sheets = await getSheets()
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID() })
  const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === tab)
  if (!sheet) throw new Error(`Tab bulunamadı: ${tab}`)

  const sheetId = sheet.properties?.sheetId
  const startIndex = rowIndex + 1 // +1 for header row (0-indexed sheet rows)

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex,
              endIndex: startIndex + 1,
            },
          },
        },
      ],
    },
  })
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** Find a row by its ID (column A). Returns the row and its 0-based index. */
export async function findRowById(
  tab: string,
  id: string
): Promise<{ row: string[]; index: number } | null> {
  const rows = await getRows(tab)
  const index = rows.findIndex((r) => r[0] === id)
  if (index === -1) return null
  return { row: rows[index], index }
}

// ─── Settings helpers ─────────────────────────────────────────────────────────

/** Read all key-value pairs from the Ayarlar tab. */
export async function getSettings(): Promise<Record<string, string>> {
  const rows = await getRows(TABS.SETTINGS)
  const result: Record<string, string> = {}
  for (const row of rows) {
    if (row[0]) result[row[0]] = row[1] ?? ""
  }
  return result
}

/** Write (upsert) a single setting. */
export async function setSetting(key: string, value: string): Promise<void> {
  const rows = await getRows(TABS.SETTINGS)
  const index = rows.findIndex((r) => r[0] === key)
  if (index !== -1) {
    await updateRowByIndex(TABS.SETTINGS, index, [key, value])
  } else {
    await appendRow(TABS.SETTINGS, [key, value])
  }
}

// ─── ID generation ────────────────────────────────────────────────────────────

/** Generate a unique ID using timestamp + random suffix. */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
