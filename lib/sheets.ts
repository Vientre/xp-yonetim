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
import { randomUUID } from "node:crypto"
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

type SheetMetadataCache = {
  spreadsheetId: string
  expiresAt: number
  idsByTitle: Map<string, number>
}

let sheetMetadataCache: SheetMetadataCache | null = null

async function getSheetIds(forceRefresh = false): Promise<Map<string, number>> {
  const spreadsheetId = SHEET_ID()
  if (
    !forceRefresh &&
    sheetMetadataCache?.spreadsheetId === spreadsheetId &&
    sheetMetadataCache.expiresAt > Date.now()
  ) {
    return sheetMetadataCache.idsByTitle
  }

  const sheets = await getSheets()
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title)",
  })
  const idsByTitle = new Map<string, number>()
  for (const sheet of spreadsheet.data.sheets ?? []) {
    const title = sheet.properties?.title
    const sheetId = sheet.properties?.sheetId
    if (title && typeof sheetId === "number") idsByTitle.set(title, sheetId)
  }
  sheetMetadataCache = {
    spreadsheetId,
    expiresAt: Date.now() + 60_000,
    idsByTitle,
  }
  return idsByTitle
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
    range: `${quoteTab(tab)}!A2:Z`,
  })
  return (res.data.values ?? []) as string[][]
}

/**
 * Get all rows from a tab including the header row (row 1).
 * First row in the returned array is the header.
 */
export async function getAllRowsWithHeader(tab: string): Promise<string[][]> {
  const sheets = await getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: `${quoteTab(tab)}!A1:Z`,
  })
  return (res.data.values ?? []) as string[][]
}

function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`
}

function columnName(columnCount: number): string {
  if (columnCount < 1) throw new Error("En az bir sütun gerekli")
  let value = columnCount
  let result = ""
  while (value > 0) {
    value -= 1
    result = String.fromCharCode(65 + (value % 26)) + result
    value = Math.floor(value / 26)
  }
  return result
}

/**
 * Read multiple tabs in one Google Sheets request.
 * The returned object always contains every requested tab, using [] for empty tabs.
 */
export async function getRowsBatch<T extends readonly string[]>(
  tabs: T,
  options: { includeHeader?: boolean } = {}
): Promise<Record<T[number], string[][]>> {
  const result = {} as Record<T[number], string[][]>
  if (tabs.length === 0) return result

  const startRow = options.includeHeader ? 1 : 2
  const sheets = await getSheets()
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SHEET_ID(),
    ranges: tabs.map((tab) => `${quoteTab(tab)}!A${startRow}:Z`),
  })

  tabs.forEach((tab, index) => {
    result[tab as T[number]] = (response.data.valueRanges?.[index]?.values ?? []) as string[][]
  })
  return result
}

/** Return the current spreadsheet's tab names. */
export async function getTabNames(): Promise<string[]> {
  return Array.from((await getSheetIds()).keys())
}

/**
 * Ensure a tab exists. If it is missing, create it and write the header row.
 * Safe to call before first use of a newly introduced feature.
 */
export async function ensureTab(tab: string, headers: string[]): Promise<void> {
  const sheets = await getSheets()
  const spreadsheetId = SHEET_ID()
  const sheetIds = await getSheetIds()
  if (sheetIds.has(tab)) return

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tab } } }],
      },
    })
  } catch (error) {
    // A concurrent request may have created the same tab after our lookup.
    const refreshed = await getSheetIds(true)
    if (!refreshed.has(tab)) throw error
  }
  await getSheetIds(true)

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTab(tab)}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  })
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
    range: `${quoteTab(tab)}!A1`,
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
  const endColumn = columnName(values.length)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `${quoteTab(tab)}!A${sheetRow}:${endColumn}${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values.map((v) => String(v ?? ""))] },
  })
}

/**
 * Delete multiple rows by their 0-based data indices in a single batchUpdate.
 * Indices must be unique; they are sorted descending internally so deletions don't shift each other.
 */
export async function deleteRowsByIndices(tab: string, rowIndices: number[]): Promise<void> {
  if (rowIndices.length === 0) return
  const sheets = await getSheets()
  const sheetId = (await getSheetIds()).get(tab)
  if (sheetId === undefined) throw new Error(`Tab bulunamadı: ${tab}`)

  // Sort descending so each deletion doesn't affect the indices of later rows
  const sorted = [...new Set(rowIndices)].sort((a, b) => b - a)

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID(),
    requestBody: {
      requests: sorted.map((rowIndex) => {
        const startIndex = rowIndex + 1 // +1 for header row
        return {
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex, endIndex: startIndex + 1 },
          },
        }
      }),
    },
  })
}

/**
 * Delete a row by its 0-based data index (excludes header row).
 * Uses batchUpdate to physically remove the row.
 */
export async function deleteRowByIndex(tab: string, rowIndex: number): Promise<void> {
  const sheets = await getSheets()
  const sheetId = (await getSheetIds()).get(tab)
  if (sheetId === undefined) throw new Error(`Tab bulunamadı: ${tab}`)
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
  return settingsFromRows(rows)
}

/** Convert Ayarlar sheet rows into a key-value object. */
export function settingsFromRows(rows: string[][]): Record<string, string> {
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

/** Generate a collision-resistant record ID. */
export function generateId(): string {
  return randomUUID()
}
