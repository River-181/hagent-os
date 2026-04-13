#!/bin/bash
# Thin shim for legacy Claude entrypoint.
exec bash .agent/adapters/claude/setup.sh "$@"
