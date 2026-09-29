#!/bin/sh
# Runs the night.mjs suite under three device timezones and checks that the
# output fingerprint is identical in all of them. Exit code 1 on any failure.
cd "$(dirname "$0")" || exit 1
status=0
first=""
for tz in UTC America/Los_Angeles Asia/Tokyo; do
  out=$(TZ="$tz" node --test --test-reporter=tap night.test.mjs 2>&1)
  code=$?
  tests=$(printf '%s\n' "$out" | sed -n 's/^# tests //p')
  pass=$(printf '%s\n' "$out" | sed -n 's/^# pass //p')
  fail=$(printf '%s\n' "$out" | sed -n 's/^# fail //p')
  device=$(printf '%s\n' "$out" | sed -n 's/^ *# device timezone in this run: //p' | head -n 1)
  fp=$(printf '%s\n' "$out" | sed -n 's/^ *# fingerprint sha256=//p' | head -n 1)
  printf 'TZ=%-20s tests=%s pass=%s fail=%s exit=%s\n' "$tz" "$tests" "$pass" "$fail" "$code"
  printf '  device: %s\n  fingerprint: %s\n' "$device" "$fp"
  [ "$code" -eq 0 ] || { status=1; printf '%s\n' "$out" | grep -E '^not ok|^ *not ok' | head -n 20; }
  if [ -z "$first" ]; then first="$fp"; elif [ "$fp" != "$first" ]; then echo "  FINGERPRINT MISMATCH"; status=1; fi
done
[ "$status" -eq 0 ] && echo "ALL TIMEZONES PASS, fingerprints identical" || echo "FAILED"
exit "$status"
