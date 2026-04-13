# HagentOS — AI 학원 운영 에이전트 플랫폼

> KEG 2026 바이브코딩 콘테스트 출품작 | 팀: 이승보 + 김주용

---

## 🎯 한 줄 설명

학원 원장이 카카오·텔레그램으로 질문하면 AI 에이전트 팀이 케이스를 처리하고, 승인이 필요한 사항만 원장에게 올려 결재받는 운영 플랫폼.

---

## 🔴 라이브 데모

> **라이브 URL**: https://hagent-os.up.railway.app

**심사위원 가이드** → [`JUDGE_DEMO.md`](./JUDGE_DEMO.md)

---

## 🧠 AI 에이전트 팀

| 에이전트 | 역할 |
|---------|------|
| **Orchestrator** | 지시 분류 → 에이전트 라우팅 |
| **Complaint** | 학부모 민원·상담 처리, 답변 초안 |
| **Scheduler** | 결석·보강·일정 변경, 카카오 안내 |
| **Retention** | 이탈 위험 감지, 재등록 유도 |
| **Notification** | 결제·수강료 안내 |

각 에이전트는 **SOUL.md**(역할 정의) · **HEARTBEAT.md**(주기 태스크) · **memory JSON**(누적 인사이트)을 보유하고 학원 상황을 기억합니다.

---

## 📱 채널 연동

- **카카오채널** — 학부모 메시지 → 케이스 자동 생성 → AI 처리 → 카카오 답장
- **텔레그램** — 운영자 메시지 → 케이스 생성 → AI 응답 → 봇 답장
- **웹 UI** — 원장 대시보드 (케이스·학생·일정·문서·승인)

---

## 🚀 빠른 시작

### DEMO_MODE (API 키 불필요)

```bash
git clone https://github.com/River-181/hagent-os
cd hagent-os
cp .env.example .env
# .env: DEMO_MODE=true 설정

pnpm install
pnpm dev
```

기본 개발 URL:

- UI: `http://localhost:5174`
- API: `http://localhost:3200`

`DEMO_MODE=true` → Anthropic API 키 없이 mock AI 응답으로 전체 플로우 체험.

### 로컬 빌드 검증

```bash
pnpm build
cd server && node dist/index.js
cd ui && npx vite preview --port 5174
```

### 실제 AI 사용

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...    # 미설정 시 embedded PostgreSQL 사용

pnpm install
pnpm dev
```

프로덕션 형태로 확인하려면 `pnpm build` 후 `server/dist/index.js`와 `vite preview --port 5174`를 사용.

---

## 📋 환경변수

```bash
PORT=3200                        # 서버 포트
DATABASE_URL=                    # PostgreSQL (미설정 → embedded)
ANTHROPIC_API_KEY=               # Claude API (미설정 → mock 응답)
DEMO_MODE=false                  # true = API 키 없이 mock 모드
DEPLOYMENT_MODE=local_trusted    # local_trusted | authenticated
```

`.env.example` 파일 참조.

---

## 🏗️ 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | React 19 + Vite + TypeScript + Tailwind |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 17 + Drizzle ORM |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Package | pnpm workspace (monorepo) |

---

## 📂 구조

```
hagent-os/
├── ui/              React 프론트엔드
├── server/
│   ├── src/routes/       API 엔드포인트
│   ├── src/services/     AI 오케스트레이션
│   └── src/data/         데모 시드 데이터
├── packages/
│   ├── db/               Drizzle 스키마
│   └── shared/           공유 타입
├── skills/               k-skill 패키지 레지스트리
├── Dockerfile
└── railway.toml
```

---

## 🤖 AI 활용

- **Claude Code CLI** — 기획·구현·리뷰 전 과정 (세션 로그: `.agent/system/`)
- **Codex** — 서버 라우트, 서비스 레이어 병렬 구현
- **Anthropic Claude API** — 실제 에이전트 추론 엔진
- AI 기획 문서: `.agent/system/` 디렉터리 (공모전 권장 사항 준수)

---

## 🔗 링크

- GitHub: [River-181/hagent-os](https://github.com/River-181/hagent-os)
- 심사 가이드: [JUDGE_DEMO.md](./JUDGE_DEMO.md)
- 설계 문서: [docs/design/ui-harness.md](./docs/design/ui-harness.md)
