FROM node:lts AS builder

RUN set -ex \
    && apt-get -y update \
    && apt-get -y install curl build-essential libasound2-dev \
    && apt-get -y clean \
    && rm -rf /var/lib/apt/lists/*

USER node
RUN mkdir /home/node/app
WORKDIR /home/node/app

RUN curl -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --target wasm32-unknown-unknown
ENV PATH="/home/node/.cargo/bin:$PATH"
ENV CARGO_UNSTABLE_SPARSE_REGISTRY="true"
RUN curl -sSf https://rustwasm.github.io/wasm-pack/installer/init.sh | sh

RUN cargo install --git https://github.com/SpiralP/chatsounds-cli.git

COPY --chown=node:node . .

RUN set -ex \
    && npm install \
    && npm run build:wasm \
    && npm run build


FROM node:lts

RUN set -ex \
    && apt-get -y update \
    && apt-get -y install tini ffmpeg libasound2 \
    && apt-get -y clean \
    && rm -rf /var/lib/apt/lists/*

USER node
RUN mkdir /home/node/app
WORKDIR /home/node/app

COPY --from=builder /home/node/.cargo/bin/chatsounds-cli /usr/bin/
COPY --from=builder --chown=node:node /home/node/app/dist ./dist
COPY --from=builder --chown=node:node /home/node/app/dist-node ./dist-node
COPY --chown=node:node ./package.json ./package.json


EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production
CMD [ "tini", "--", "node", "./dist-node/discord-embed-proxy.js" ]
