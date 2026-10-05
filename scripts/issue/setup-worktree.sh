#!/usr/bin/env bash
# Prepare an issue worktree. For each folder listed in template.config.json
# "worktreeCopy" (for example node_modules), clone it from the main checkout
# with copy-on-write when the lockfiles match; otherwise run "installCommand".
set -euo pipefail
here="$(git rev-parse --show-toplevel)"
main="$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')"
if [[ "$here" == "$main" ]]; then echo "Run this inside an issue worktree, not the main checkout." >&2; exit 1; fi
cd "$here"
cfg() { node -e 'const c=require("./template.config.json");const v=c[process.argv[1]];console.log(Array.isArray(v)?v.join("\n"):(v??""))' "$1"; }
lockfile="$(cfg lockfile)"
install="$(cfg installCommand)"
same_lock=false
if [[ -n "$lockfile" && -f "$main/$lockfile" ]] && cmp -s "$main/$lockfile" "$lockfile"; then same_lock=true; fi
need_install=false
copy_list="$(cfg worktreeCopy)"
# Nothing listed to copy means dependencies must come from the install command.
[[ -z "$copy_list" ]] && need_install=true
while IFS= read -r dir; do
  [[ -z "$dir" || -e "$dir" ]] && continue
  if $same_lock && [[ -d "$main/$dir" ]]; then
    mkdir -p "$(dirname "$dir")"
    cp -cR "$main/$dir" "$dir" 2>/dev/null || cp -R "$main/$dir" "$dir"
    echo "Cloned $dir from $main."
  else
    need_install=true
  fi
done <<< "$copy_list"
if $need_install && [[ -n "$install" ]]; then
  echo "Lockfile differs from the main checkout (or nothing to copy); running: $install"
  eval "$install"
fi
echo "Worktree ready: $here ($(git branch --show-current))"
