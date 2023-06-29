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
    && npm run build:wasm \
    && npm install \
    && npm run build


FROM node:lts

RUN set -ex \
    && apt-get -y update \
    && apt-get -y install libasound2 \
    && apt-get -y clean \
    && rm -rf /var/lib/apt/lists/*

USER node
RUN mkdir /home/node/app
WORKDIR /home/node/app

COPY --from=builder /home/node/.cargo/bin/chatsounds-cli .

COPY --chown=node:node . .

COPY --from=builder --chown=node:node /home/node/app/pkg ./pkg

RUN set -ex \
    && npm install --omit dev \
    && npm cache clean --force

COPY --from=builder --chown=node:node /home/node/app/dist ./dist


EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production
CMD [ "npm", "start" ]
