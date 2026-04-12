// Korean national law API integration (국가법령정보센터 Open API)
// Docs: https://open.law.go.kr/LSO/openApi/guide.do

const LAW_SEARCH_BASE = "http://www.law.go.kr/DRF/lawSearch.do"
const LAW_SERVICE_BASE = "http://www.law.go.kr/DRF/lawService.do"
const REQUEST_TIMEOUT_MS = 5_000
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

// In-memory result cache keyed by `${oc}:${query}`
interface CacheEntry {
  result: KoreanLawLookupResult
  expiresAt: number
}
const cache = new Map<string, CacheEntry>()

export interface KoreanLawLookupResult {
  source: "korean-law-mcp"
  query: string
  installed: boolean
  connected: boolean
  degraded: boolean
  missingEnv: string[]
  routeTool?: string | null
  summary?: string | null
  detail?: string | null
  error?: string | null
}

function truncate(text: string, max = 700) {
  return text.length > max ? `${text.slice(0, max).trim()}...` : text
}

function getOC(): string {
  return process.env.LAW_GO_KR_OC || process.env.LAW_OC || ""
}

export function getKoreanLawEnvStatus() {
  const oc = getOC()
  return {
    installed: true, // HTTP-based, always "installed"
    connected: Boolean(oc),
    apiKey: oc,
    missingEnv: oc ? [] : ["LAW_GO_KR_OC"],
  }
}

export function buildComplaintLawQuery(title: string, description: string) {
  const source = `${title}\n${description}`.trim()
  if (!source) return null

  if (/환불|환급|해지|수강료/.test(source)) {
    return "학원 수강료 환불 기준과 학원법 관련 규정"
  }
  if (/강사|근로|급여|해고|휴게|근무/.test(source)) {
    return "학원 강사 근로기준법 및 근로조건 관련 규정"
  }
  if (/학원법|법적|규정|위법|소송|영업|운영 현황|설립|등록|교습비/.test(source)) {
    return `${title} ${description}`.trim()
  }
  return null
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timer)
  }
}

interface LawSearchItem {
  법령ID?: string
  법령명한글?: string
  법령구분명?: string
  시행일자?: string
  [key: string]: unknown
}

interface LawSearchResponse {
  LawSearch?: {
    law?: LawSearchItem | LawSearchItem[]
    totalCnt?: string | number
  }
}

interface LawArticle {
  조문내용?: string
  조문제목?: string
  [key: string]: unknown
}

interface LawServiceResponse {
  법령?: {
    기본정보?: {
      법령명한글?: string
      시행일자?: string
    }
    조문?: {
      조문단위?: LawArticle | LawArticle[]
    }
  }
}

async function searchLaw(oc: string, query: string): Promise<LawSearchItem | null> {
  const url = `${LAW_SEARCH_BASE}?OC=${encodeURIComponent(oc)}&target=law&type=JSON&query=${encodeURIComponent(query)}`
  const response = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS)
  if (!response.ok) {
    throw new Error(`law search HTTP ${response.status}`)
  }
  const data = (await response.json()) as LawSearchResponse
  const lawList = data?.LawSearch?.law
  if (!lawList) return null
  const items = Array.isArray(lawList) ? lawList : [lawList]
  return items[0] ?? null
}

async function fetchLawDetail(oc: string, lawId: string): Promise<string | null> {
  const url = `${LAW_SERVICE_BASE}?OC=${encodeURIComponent(oc)}&target=law&type=JSON&ID=${encodeURIComponent(lawId)}`
  const response = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS)
  if (!response.ok) {
    throw new Error(`law detail HTTP ${response.status}`)
  }
  const data = (await response.json()) as LawServiceResponse
  const lawName = data?.법령?.기본정보?.법령명한글 ?? ""
  const articles = data?.법령?.조문?.조문단위
  if (!articles) return lawName || null

  const articleList = Array.isArray(articles) ? articles : [articles]
  const lines: string[] = []
  if (lawName) lines.push(`[${lawName}]`)

  for (const article of articleList.slice(0, 5)) {
    const title = article.조문제목 ?? ""
    const content = article.조문내용 ?? ""
    if (title) lines.push(title)
    if (content) lines.push(content)
    if (lines.length >= 6) break
  }

  return lines.slice(0, 6).join("\n").trim() || lawName || null
}

export async function lookupKoreanLaw(query: string): Promise<KoreanLawLookupResult> {
  const oc = getOC()

  if (!oc) {
    return {
      source: "korean-law-mcp",
      query,
      installed: true,
      connected: false,
      degraded: true,
      missingEnv: ["LAW_GO_KR_OC"],
      error: "LAW_GO_KR_OC is not configured",
    }
  }

  const cacheKey = `${oc}:${query}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result
  }

  try {
    const firstResult = await searchLaw(oc, query)
    if (!firstResult) {
      const result: KoreanLawLookupResult = {
        source: "korean-law-mcp",
        query,
        installed: true,
        connected: true,
        degraded: false,
        missingEnv: [],
        summary: "검색 결과 없음",
        detail: null,
        error: null,
      }
      cache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS })
      return result
    }

    const lawName = firstResult.법령명한글 ?? ""
    const lawId = firstResult.법령ID ?? ""

    let detail: string | null = null
    if (lawId) {
      detail = await fetchLawDetail(oc, lawId)
    }

    const summary = detail
      ? truncate(detail, 420)
      : lawName
        ? `[${lawName}] 검색 완료`
        : "법령 검색 완료"

    const result: KoreanLawLookupResult = {
      source: "korean-law-mcp",
      query,
      installed: true,
      connected: true,
      degraded: false,
      missingEnv: [],
      routeTool: null,
      summary,
      detail: detail ? truncate(detail, 1_200) : null,
      error: null,
    }
    cache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS })
    return result
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "법령 API 호출 실패"
    return {
      source: "korean-law-mcp",
      query,
      installed: true,
      connected: true,
      degraded: true,
      missingEnv: [],
      error: errorMsg,
    }
  }
}
