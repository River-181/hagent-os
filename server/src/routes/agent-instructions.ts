import { Router } from "express"
import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { eq } from "drizzle-orm"

const AGENT_DATA_DIR = join(import.meta.dirname, "../../data/agents")

function agentDir(agentId: string): string {
  return join(AGENT_DATA_DIR, agentId)
}

function templateDir(agentType: string): string {
  return join(AGENT_DATA_DIR, agentType)
}

function readFilesFromDir(dir: string): { filename: string; content: string }[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((filename) => ({
      filename,
      content: readFileSync(join(dir, filename), "utf-8"),
    }))
}

export function agentInstructionsRoutes(db: Db): Router {
  const router = Router()

  // GET /api/agents/:id/instructions
  router.get("/:id/instructions", async (req, res) => {
    const { id } = req.params

    const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.id, id))
    if (!agent) { res.status(404).json({ error: "Agent not found" }); return }

    const agentType = agent.agentType ?? "orchestrator"

    // Per-agent directory takes priority; fall back to type-based template
    let files = readFilesFromDir(agentDir(id))
    if (files.length === 0) {
      files = readFilesFromDir(templateDir(agentType))
    }

    res.json({ files, agentType })
  })

  // GET /api/agents/:id/instructions/:filename
  router.get("/:id/instructions/:filename", async (req, res) => {
    const { id, filename } = req.params

    const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.id, id))
    if (!agent) { res.status(404).json({ error: "Agent not found" }); return }

    const agentType = agent.agentType ?? "orchestrator"

    // Try per-agent path first, then fall back to type template
    const perAgentPath = join(agentDir(id), filename)
    const templatePath = join(templateDir(agentType), filename)

    if (existsSync(perAgentPath)) {
      const content = readFileSync(perAgentPath, "utf-8")
      res.json({ filename, content })
      return
    }

    if (existsSync(templatePath)) {
      const content = readFileSync(templatePath, "utf-8")
      res.json({ filename, content })
      return
    }

    res.status(404).json({ error: "File not found" })
  })

  // PUT /api/agents/:id/instructions/:filename — always writes to per-agent dir
  router.put("/:id/instructions/:filename", async (req, res) => {
    const { id, filename } = req.params
    const { content } = req.body as { content: string }

    const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.id, id))
    if (!agent) { res.status(404).json({ error: "Agent not found" }); return }

    const dir = agentDir(id)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    const filePath = join(dir, filename)
    writeFileSync(filePath, content, "utf-8")
    res.json({ filename, content })
  })

  return router
}
