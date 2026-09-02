import { eq } from "drizzle-orm"
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite"
import { plans as table } from "../../db/schema.ts"
import type { PlanRecord, PlanRepository } from "../types.ts"
import { allocateId } from "./ids.ts"
import { sqlite } from "../../db/client.ts"
import type { CookEvent, NutrientGoal, WeeklyPlan } from "@wc/types"

type Schema = typeof import("../../db/schema.ts")
type DB = BunSQLiteDatabase<Schema>

function toRow(plan: PlanRecord) {
  return {
    id:          plan.id,
    mode:        plan.mode,
    cook_events: JSON.stringify(plan.cookEvents),
    goals:       JSON.stringify(plan.goals),
    created_at:  plan.created_at,
    updated_at:  plan.updated_at,
  }
}

function fromRow(row: typeof table.$inferSelect): PlanRecord {
  return {
    id:          row.id,
    mode:        row.mode as WeeklyPlan["mode"],
    cookEvents:  JSON.parse(row.cook_events) as CookEvent[],
    goals:       JSON.parse(row.goals) as NutrientGoal[],
    created_at:  row.created_at,
    updated_at:  row.updated_at,
  }
}

export class DrizzlePlanRepository implements PlanRepository {
  constructor(private db: DB) {}

  async findAll(): Promise<PlanRecord[]> {
    const rows = await this.db.select().from(table)
    return rows.map(fromRow)
  }

  async findById(id: string): Promise<PlanRecord | null> {
    const rows = await this.db.select().from(table).where(eq(table.id, id))
    return rows[0] ? fromRow(rows[0]) : null
  }

  async create(plan: WeeklyPlan): Promise<PlanRecord> {
    const now = new Date().toISOString().slice(0, 10)
    const record: PlanRecord = {
      ...plan,
      id:         allocateId(sqlite, "PLAN"),
      created_at: now,
      updated_at: now,
    }
    await this.db.insert(table).values(toRow(record))
    return record
  }

  async update(id: string, patch: Partial<Pick<WeeklyPlan, "mode" | "cookEvents" | "goals">>): Promise<PlanRecord | null> {
    const existing = await this.findById(id)
    if (!existing) return null
    const updated: PlanRecord = {
      ...existing,
      ...patch,
      updated_at: new Date().toISOString().slice(0, 10),
    }
    await this.db.update(table).set(toRow(updated)).where(eq(table.id, id))
    return updated
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id)
    if (!existing) return false
    await this.db.delete(table).where(eq(table.id, id))
    return true
  }
}
