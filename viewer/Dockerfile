
# ─────────────────────────────────────────────────────────────────
#  Viewer (React + Vite) — Multi-stage Dockerfile
#  Targets: development (Vite HMR) | production (static build)
# ─────────────────────────────────────────────────────────────────

# ── Base ──────────────────────────────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

# ── Install dependencies ──────────────────────────────────────────
FROM base AS deps

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# ── Development: Vite HMR server ─────────────────────────────────
FROM deps AS development

ENV NODE_ENV=development

# node_modules stays in the named volume — see docker-compose.yml
# Source is bind-mounted at runtime

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ── Build: compile static assets ─────────────────────────────────
FROM deps AS builder

COPY . .

ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ── Production: serve with nginx ─────────────────────────────────
FROM nginx:1.25-alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
