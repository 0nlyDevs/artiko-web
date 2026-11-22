#!/bin/sh
set -eu

fail() {
  printf 'check:versions: %s\n' "$1" >&2
  exit 1
}

pinned_version() {
  mise config get --file mise.toml "tools.$1" 2>/dev/null || true
}

command -v mise >/dev/null 2>&1 ||
  fail "mise not found on PATH: install mise (see README), then run 'mise install'"

pinned_node="$(pinned_version node)"
pinned_pnpm="$(pinned_version pnpm)"
[ -n "$pinned_node" ] || fail "no node version under [tools] in mise.toml"
[ -n "$pinned_pnpm" ] || fail "no pnpm version under [tools] in mise.toml"

active_node="$(node -v 2>/dev/null || true)"
[ "$active_node" = "v$pinned_node" ] ||
  fail "Node $pinned_node expected by mise.toml, found '${active_node:-none}': run 'mise install' and run Task from the mise environment"

package_manager="$(node -p 'require("./package.json").packageManager ?? ""' 2>/dev/null || true)"
case "$package_manager" in
  pnpm@*) ;;
  *) fail "packageManager in package.json must be pnpm@<version>, found '${package_manager:-none}'" ;;
esac
# Corepack may append an integrity hash: pnpm@10.16.0+sha512.<hex>
declared_pnpm="${package_manager#pnpm@}"
declared_pnpm="${declared_pnpm%%+*}"
[ "$declared_pnpm" = "$pinned_pnpm" ] ||
  fail "pnpm $pinned_pnpm in mise.toml differs from packageManager pnpm@$declared_pnpm in package.json"

active_pnpm="$(pnpm -v 2>/dev/null || true)"
[ "$active_pnpm" = "$pinned_pnpm" ] ||
  fail "pnpm $pinned_pnpm expected by mise.toml, found '${active_pnpm:-none}': run 'mise install' and run Task from the mise environment"
