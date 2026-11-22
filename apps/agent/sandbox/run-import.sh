#!/usr/bin/env bash
set -euo pipefail

# Instalar Claude Code
npm i -g @anthropic-ai/claude-code

# Crear directorio de trabajo
mkdir -p /work

# Configurar cliente MCP HTTP
cat <<EOF > /work/mcp.json
{
  "mcpServers": {
    "nodomics": {
      "type": "http",
      "url": "${AGENT_URL}/sandbox/mcp",
      "headers": {
        "Authorization": "Bearer ${JOB_TOKEN}"
      }
    }
  }
}
EOF

# Ejecutar Claude Code
claude -p "$PROMPT" \
  --output-format json \
  --mcp-config /work/mcp.json \
  --allowedTools "Bash,Read,Write,Edit,Glob,Grep,mcp__nodomics__*" || true
