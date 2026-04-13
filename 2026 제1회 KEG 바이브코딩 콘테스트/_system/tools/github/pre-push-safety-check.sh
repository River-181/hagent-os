#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] checking tracked files against .gitignore-risk patterns"
git ls-files | rg -n '(^|/)(\.env|credentials\.json|auth\.json|runtime/|chrome-profiles/|profiles/)|\.(pem|p12|mobileprovision|cer|crt|pfx|key)$' && {
  echo "tracked secret/runtime-like files detected"
  exit 1
} || true

echo "[2/4] scanning staged diff for secret-like keywords"
git diff --cached -- . ':(exclude)_system/tools/uv.lock' ':(exclude)_system/tools/github/pre-push-safety-check.sh' | \
  rg -n --ignore-case '(api[_-]?key|secret[_-]?key|access[_-]?token|refresh[_-]?token|authorization:|bearer |client[_-]?secret|password=|passwd=|aws_access_key_id|aws_secret_access_key|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY|FIGMA_ACCESS_TOKEN|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+)' && {
    echo "possible secret found in staged diff"
    exit 1
  } || true

echo "[3/4] checking gitignore coverage for local runtime paths"
git check-ignore -q _system/tools/.env || {
  echo "_system/tools/.env is not ignored"
  exit 1
}
git check-ignore -q _system/tools/runtime/ || {
  echo "_system/tools/runtime/ is not ignored"
  exit 1
}

echo "[4/4] listing staged files for final human review"
git diff --cached --name-only

echo "pre-push safety check passed"
