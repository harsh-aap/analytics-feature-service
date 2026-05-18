# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# base (tst-base) lives at ./base — copy it first so yarn can resolve the
# "file:./base" reference in package.json before installing dependencies.
COPY base ./base
COPY package.json yarn.lock ./
RUN yarn install --non-interactive

COPY . .
RUN yarn build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine

RUN apk --no-cache add tini ca-certificates

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Run as a non-root user
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3002

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/bin/consumer.bin.js"]
