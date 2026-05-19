FROM oven/bun:1 AS deps

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl tini \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV GBRAIN_HOME=/data/ebrain
ENV PORT=3131

EXPOSE 3131

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["bun", "src/cli.ts", "serve", "--http", "--bind", "0.0.0.0", "--port", "3131", "--suppress-bootstrap-token"]
