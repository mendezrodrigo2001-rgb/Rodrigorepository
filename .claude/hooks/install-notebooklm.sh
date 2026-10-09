#!/bin/bash
# Cloud sessions start from a fresh container: install the notebooklm-py CLI
# used by the notebooklm-setup / notebooklm-query skills.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
command -v notebooklm >/dev/null 2>&1 || pip install -q notebooklm-py >/dev/null 2>&1
exit 0
