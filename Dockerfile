############################
# Build container
############################
FROM registry.cto.ai/official_images/node:latest AS dep

WORKDIR /ops

RUN apt update && apt install -y python && mkdir lib

ADD package.json .
RUN npm install
RUN npx modclean -release && rm modclean*.log

ADD . .

RUN npm run build && rm -rf /ops/src package-lock.json .dockerignore && mv /ops/lib/templates /ops/lib/src/ && mv /ops/lib/src/* /ops/lib/ && rm -r /ops/lib/src/

############################
# Final container
############################
FROM registry.cto.ai/official_images/node:latest

WORKDIR /ops

# RUN apt update && apt install git make && npm install -g typescript && npm install -g ts-node @types/node && rm -rf /var/lib/apt/lists/*
RUN apt update && apt install -y git make ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=dep /ops .
