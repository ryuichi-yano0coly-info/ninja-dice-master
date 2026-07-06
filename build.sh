#!/bin/bash
# Recompile src/app.jsx -> app.js (classic React.createElement runtime)
cd "$(dirname "$0")"
./node_modules/.bin/babel src/app.jsx -o app.js && echo "✅ built app.js ($(wc -c < app.js)b)"
