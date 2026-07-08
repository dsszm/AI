#!/bin/bash
exec 3<>/dev/tcp/127.0.0.1/18080
printf "CONNECT %s:%s HTTP/1.1\r\nHost: %s:%s\r\n\r\n" "$1" "$2" "$1" "$2" >&3
read -r status <&3
while IFS= read -r line; do
    line="${line%$'\r'}"
    [ -z "$line" ] && break
done <&3
cat <&3 &
cat >&3
wait
