/**
 * Activity logging - simplified version without database.
 * Logs are printed to console in development.
 */

interface LogOptions {
  userId: string
  action: string
  entityType: string
  entityId?: string
  businessId?: string
  description?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
}

export async function createLog(opts: LogOptions): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[LOG] ${opts.action} | ${opts.entityType}${opts.entityId ? "#" + opts.entityId : ""} | ${opts.description ?? ""} | user:${opts.userId}`
    )
  }
}
