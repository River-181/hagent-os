// v0.2.0
import { Router } from "express"
import { eq } from "drizzle-orm"
import mammoth from "mammoth"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { enrichDocuments } from "../services/document-links.js"

interface ImportFilePayload {
  fileName: string
  mimeType?: string
  contentBase64: string
  category?: string
}

function fileNameWithoutExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "")
}

function normalizeMarkdownImport(raw: string, fileName: string, category?: string) {
  const heading = raw.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return {
    title: heading || fileNameWithoutExtension(fileName) || "제목 없는 문서",
    body: raw.trim(),
    category: category || "general",
    tags: [],
  }
}

function normalizePlainTextImport(raw: string, fileName: string, category?: string) {
  const title = fileNameWithoutExtension(fileName) || "제목 없는 문서"
  return {
    title,
    body: `# ${title}\n\n${raw.trim()}`,
    category: category || "general",
    tags: [],
  }
}

function normalizeJsonImport(raw: string) {
  const parsed = JSON.parse(raw)
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.documents) ? parsed.documents : []
  return list
    .filter((item: unknown) => item && typeof item === "object")
    .map((item: any) => ({
      title: String(item.title ?? "제목 없는 문서"),
      body: String(item.body ?? ""),
      category: String(item.category ?? "general"),
      tags: Array.isArray(item.tags) ? item.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [],
    }))
}

async function parseImportFile(file: ImportFilePayload) {
  const lowerName = file.fileName.toLowerCase()
  const buffer = Buffer.from(file.contentBase64, "base64")

  if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) {
    return [normalizeMarkdownImport(buffer.toString("utf8"), file.fileName, file.category)]
  }

  if (lowerName.endsWith(".txt")) {
    return [normalizePlainTextImport(buffer.toString("utf8"), file.fileName, file.category)]
  }

  if (lowerName.endsWith(".json")) {
    return normalizeJsonImport(buffer.toString("utf8"))
  }

  if (lowerName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer })
    return [normalizeMarkdownImport(result.value.trim(), file.fileName, file.category)]
  }

  throw new Error(`Unsupported file type: ${file.fileName}`)
}

export function documentRoutes(db: Db): Router {
  const router = Router()

  router.post("/documents/import-preview", async (req, res) => {
    try {
      const files = Array.isArray(req.body?.files) ? (req.body.files as ImportFilePayload[]) : []
      if (files.length === 0) {
        res.status(400).json({ error: "files required" })
        return
      }

      const documents = []
      for (const file of files) {
        const parsed = await parseImportFile(file)
        documents.push(
          ...parsed.map((doc: { title: string; body: string; category: string; tags: string[] }, index: number) => ({
            id: `import-${Date.now()}-${documents.length + index}`,
            ...doc,
          }))
        )
      }

      res.json({ documents })
    } catch (err) {
      res.status(400).json({ error: "Failed to parse import file" })
    }
  })

  // List documents for org
  router.get("/organizations/:orgId/documents", async (req, res) => {
    try {
      const [docs, cases, projects] = await Promise.all([
        db.select().from(schema.documents).where(eq(schema.documents.organizationId, req.params.orgId)),
        db.select().from(schema.cases).where(eq(schema.cases.organizationId, req.params.orgId)),
        db.select().from(schema.opsGroups).where(eq(schema.opsGroups.organizationId, req.params.orgId)),
      ])
      res.json(enrichDocuments(docs, { cases, projects }))
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch documents" })
    }
  })

  router.get("/cases/:id/documents", async (req, res) => {
    try {
      const [caseRecord] = await db.select().from(schema.cases).where(eq(schema.cases.id, req.params.id))
      if (!caseRecord) {
        res.status(404).json({ error: "Case not found" })
        return
      }

      const docs = (await db.select().from(schema.documents).where(eq(schema.documents.organizationId, caseRecord.organizationId)))
        .filter((doc: typeof schema.documents.$inferSelect) => Array.isArray(doc.tags) && doc.tags.includes(`case:${caseRecord.id}`))
      const projects = caseRecord.opsGroupId
        ? await db.select().from(schema.opsGroups).where(eq(schema.opsGroups.id, caseRecord.opsGroupId))
        : []
      res.json(enrichDocuments(docs, { cases: [caseRecord], projects }))
    } catch {
      res.status(500).json({ error: "Failed to fetch case documents" })
    }
  })

  // Get single document
  router.get("/documents/:id", async (req, res) => {
    try {
      const [doc] = await db.select().from(schema.documents)
        .where(eq(schema.documents.id, req.params.id))
      if (!doc) { res.status(404).json({ error: "Not found" }); return }
      const docTags = Array.isArray(doc.tags) ? doc.tags : []
      const [linkedCase, linkedProject] = await Promise.all([
        docTags.length > 0
          ? (async () => {
              const caseTag = docTags.find((tag: unknown) => typeof tag === "string" && tag.startsWith("case:"))
              return caseTag
                ? (await db.select().from(schema.cases).where(eq(schema.cases.id, caseTag.slice(5))))[0] ?? null
                : null
            })()
          : Promise.resolve(null),
        docTags.length > 0
          ? (async () => {
              const projectTag = docTags.find((tag: unknown) => typeof tag === "string" && tag.startsWith("project:"))
              return projectTag
                ? (await db.select().from(schema.opsGroups).where(eq(schema.opsGroups.id, projectTag.slice(8))))[0] ?? null
                : null
            })()
          : Promise.resolve(null),
      ])
      res.json(enrichDocuments([doc], {
        cases: linkedCase ? [linkedCase] : [],
        projects: linkedProject ? [linkedProject] : [],
      })[0])
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch document" })
    }
  })

  // Create document
  router.post("/organizations/:orgId/documents", async (req, res) => {
    try {
      const { title, category, body, tags } = req.body

      if (!title) {
        res.status(400).json({ error: "title required" })
        return
      }

      const [doc] = await db.insert(schema.documents).values({
        organizationId: req.params.orgId,
        title,
        category: category ?? "general",
        body: body ?? "",
        tags: tags ?? [],
      }).returning()
      res.status(201).json(enrichDocuments([doc])[0])
    } catch (err) {
      res.status(500).json({ error: "Failed to create document" })
    }
  })

  router.post("/cases/:id/documents", async (req, res) => {
    try {
      const [caseRecord] = await db.select().from(schema.cases).where(eq(schema.cases.id, req.params.id))
      if (!caseRecord) {
        res.status(404).json({ error: "Case not found" })
        return
      }

      const { title, category, body, tags, runId, documentType, status, version } = req.body as {
        title: string
        category?: string
        body?: string
        tags?: string[]
        runId?: string
        documentType?: string
        status?: string
        version?: string
      }

      if (!title?.trim()) {
        res.status(400).json({ error: "title required" })
        return
      }

      const nextTags = Array.from(
        new Set([
          ...(Array.isArray(tags) ? tags : []),
          `case:${caseRecord.id}`,
          ...(caseRecord.opsGroupId ? [`project:${caseRecord.opsGroupId}`] : []),
          ...(runId ? [`run:${runId}`] : []),
          ...(documentType ? [`artifact:${documentType}`] : []),
          ...(status ? [`status:${status}`] : []),
          ...(version ? [`version:${version}`] : []),
        ]),
      )

      const [doc] = await db
        .insert(schema.documents)
        .values({
          organizationId: caseRecord.organizationId,
          title: title.trim(),
          category: category ?? "artifact",
          body: body ?? "",
          tags: nextTags,
        })
        .returning()

      await db.insert(schema.activityEvents).values({
        organizationId: caseRecord.organizationId,
        actorType: "user",
        actorId: "case-detail",
        action: "document.created",
        entityType: "document",
        entityId: doc.id,
        entityTitle: doc.title,
        metadata: {
          caseId: caseRecord.id,
          runId: runId ?? null,
          documentType: documentType ?? null,
        } as Record<string, unknown>,
      })

      const projects = caseRecord.opsGroupId
        ? await db.select().from(schema.opsGroups).where(eq(schema.opsGroups.id, caseRecord.opsGroupId))
        : []
      res.status(201).json(enrichDocuments([doc], { cases: [caseRecord], projects })[0])
    } catch {
      res.status(500).json({ error: "Failed to create case document" })
    }
  })

  // Update document
  router.patch("/documents/:id", async (req, res) => {
    try {
      const allowedFields = ["title", "body", "category", "tags"] as const
      const updates: Record<string, unknown> = {}
      for (const f of allowedFields) {
        if (f in req.body) updates[f] = req.body[f]
      }
      const [updated] = await db.update(schema.documents)
        .set({ ...(updates as any), updatedAt: new Date() })
        .where(eq(schema.documents.id, req.params.id))
        .returning()
      if (!updated) { res.status(404).json({ error: "Not found" }); return }
      const updatedTags = Array.isArray(updated.tags) ? updated.tags : []
      const [linkedCase, linkedProject] = await Promise.all([
        updatedTags.length > 0
          ? (async () => {
              const caseTag = updatedTags.find((tag: unknown) => typeof tag === "string" && tag.startsWith("case:"))
              return caseTag
                ? (await db.select().from(schema.cases).where(eq(schema.cases.id, caseTag.slice(5))))[0] ?? null
                : null
            })()
          : Promise.resolve(null),
        updatedTags.length > 0
          ? (async () => {
              const projectTag = updatedTags.find((tag: unknown) => typeof tag === "string" && tag.startsWith("project:"))
              return projectTag
                ? (await db.select().from(schema.opsGroups).where(eq(schema.opsGroups.id, projectTag.slice(8))))[0] ?? null
                : null
            })()
          : Promise.resolve(null),
      ])
      res.json(enrichDocuments([updated], {
        cases: linkedCase ? [linkedCase] : [],
        projects: linkedProject ? [linkedProject] : [],
      })[0])
    } catch (err) {
      res.status(500).json({ error: "Failed to update document" })
    }
  })

  // Delete document
  router.delete("/documents/:id", async (req, res) => {
    try {
      await db.delete(schema.documents).where(eq(schema.documents.id, req.params.id))
      res.status(204).send()
    } catch (err) {
      res.status(500).json({ error: "Failed to delete document" })
    }
  })

  return router
}
