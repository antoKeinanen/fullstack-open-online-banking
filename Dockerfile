FROM golang:1.25.4-trixie AS base


RUN apt-get update
RUN apt-get install nodejs npm -y
RUN npm install -g pnpm bun

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

COPY . /app/
WORKDIR /app


RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts
RUN go work sync
RUN pnpm run generate-protobuf


