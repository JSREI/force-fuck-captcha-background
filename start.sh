#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$ROOT_DIR/electron-ui"
APP_NAME="${START_SERVICE_NAME:-force-captcha-frontend}"
PORT_FILE="$ROOT_DIR/.codex-service-port"
DEFAULT_PORT="9000"

if [ ! -f "$APP_DIR/package.json" ]; then
  echo "ERROR: Missing $APP_DIR/package.json"
  exit 1
fi

resolve_port() {
  if [ -n "${START_SERVICE_PORT:-}" ]; then
    echo "$START_SERVICE_PORT"
    return
  fi

  local config_port=""
  if [ -f "$APP_DIR/webpack.config.js" ]; then
    config_port="$(rg -oN "port:\\s*[0-9]+" "$APP_DIR/webpack.config.js" 2>/dev/null | head -n1 | rg -oN "[0-9]+" || true)"
  fi
  if [ -n "$config_port" ]; then
    echo "$config_port"
    return
  fi

  if [ -f "$PORT_FILE" ]; then
    local remembered
    remembered="$(tr -d '[:space:]' < "$PORT_FILE" || true)"
    if [[ "$remembered" =~ ^[0-9]+$ ]]; then
      echo "$remembered"
      return
    fi
  fi

  echo "$DEFAULT_PORT"
}

PORT="$(resolve_port)"
echo "$PORT" > "$PORT_FILE"

export PM2_HOME="${PM2_HOME:-$ROOT_DIR/.pm2}"
mkdir -p "$PM2_HOME"

pm2_json() {
  PM2_HOME="$PM2_HOME" pm2 jlist 2>/dev/null || echo "[]"
}

get_pm2_status() {
  local json
  json="$(pm2_json)"
  node -e '
const fs = require("fs");
const appName = process.argv[1];
let list = [];
try { list = JSON.parse(fs.readFileSync(0, "utf8")); } catch {}
const app = list.find((x) => x && x.name === appName);
process.stdout.write(app?.pm2_env?.status || "");
' "$APP_NAME" <<< "$json"
}

get_pm2_pid() {
  local json
  json="$(pm2_json)"
  node -e '
const fs = require("fs");
const appName = process.argv[1];
let list = [];
try { list = JSON.parse(fs.readFileSync(0, "utf8")); } catch {}
const app = list.find((x) => x && x.name === appName);
const pid = app?.pid;
process.stdout.write(pid && pid > 0 ? String(pid) : "");
' "$APP_NAME" <<< "$json"
}

is_descendant_of() {
  local child="$1"
  local ancestor="$2"
  local current="$child"
  while [ -n "$current" ] && [ "$current" != "1" ]; do
    if [ "$current" = "$ancestor" ]; then
      return 0
    fi
    current="$(ps -o ppid= -p "$current" 2>/dev/null | tr -d ' ' || true)"
  done
  return 1
}

print_diagnostics() {
  echo "=== pm2 status ==="
  PM2_HOME="$PM2_HOME" pm2 status || true
  echo "=== pm2 logs (last 120) ==="
  PM2_HOME="$PM2_HOME" pm2 logs "$APP_NAME" --nostream --lines 120 || true
  echo "=== port owner ==="
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN || true
}

clear_port_conflict() {
  local listener_pids
  listener_pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN || true)"
  if [ -z "$listener_pids" ]; then
    return
  fi

  local app_pid
  app_pid="$(get_pm2_pid)"

  for pid in $listener_pids; do
    if [ -n "$app_pid" ] && is_descendant_of "$pid" "$app_pid"; then
      continue
    fi
    kill -TERM "$pid" 2>/dev/null || true
  done

  sleep 2

  listener_pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN || true)"
  if [ -n "$listener_pids" ]; then
    for pid in $listener_pids; do
      if [ -n "$app_pid" ] && is_descendant_of "$pid" "$app_pid"; then
        continue
      fi
      kill -KILL "$pid" 2>/dev/null || true
    done
  fi
}

start_or_restart() {
  if PM2_HOME="$PM2_HOME" pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    PM2_HOME="$PM2_HOME" pm2 restart "$APP_NAME" --update-env
  else
    PM2_HOME="$PM2_HOME" pm2 start npm --name "$APP_NAME" --cwd "$APP_DIR" -- run dev:webpack -- --host 127.0.0.1 --port "$PORT"
  fi
}

validate_runtime() {
  local status
  status="$(get_pm2_status)"
  if [ "$status" != "online" ]; then
    echo "Validation failed: PM2 app status is '$status'"
    return 1
  fi

  local app_pid
  app_pid="$(get_pm2_pid)"
  if [ -z "$app_pid" ]; then
    echo "Validation failed: PM2 app pid is empty"
    return 1
  fi

  local listener_pid=""
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    listener_pid="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN | head -n1 || true)"
    if [ -n "$listener_pid" ] && is_descendant_of "$listener_pid" "$app_pid"; then
      break
    fi
    sleep 1
  done

  if [ -z "$listener_pid" ]; then
    echo "Validation failed: no listener on port $PORT"
    return 1
  fi
  if ! is_descendant_of "$listener_pid" "$app_pid"; then
    echo "Validation failed: listener pid $listener_pid is not owned by PM2 app pid $app_pid"
    return 1
  fi

  local code=""
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "http://127.0.0.1:$PORT/" || true)"
    if [[ "$code" =~ ^2|3 ]]; then
      break
    fi
    sleep 1
  done

  if [[ ! "$code" =~ ^2|3 ]]; then
    echo "Validation failed: HTTP probe on / returned $code"
    return 1
  fi

  return 0
}

attempt=1
max_attempts=2
while [ "$attempt" -le "$max_attempts" ]; do
  clear_port_conflict
  start_or_restart

  if validate_runtime; then
    break
  fi

  print_diagnostics
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "ERROR: startup failed after $max_attempts attempts"
    exit 1
  fi

  attempt=$((attempt + 1))
done

echo "service_name=$APP_NAME"
echo "service_url=http://127.0.0.1:$PORT/"
echo "frontend_url=http://127.0.0.1:$PORT/"
echo "health_url=http://127.0.0.1:$PORT/health"
echo "api_base_url=http://127.0.0.1:$PORT/api"
