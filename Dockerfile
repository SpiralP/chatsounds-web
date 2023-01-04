FROM node:lts AS builder

RUN apt-get -y update && apt-get -y install curl build-essential

USER node
RUN mkdir /home/node/app
WORKDIR /home/node/app

RUN curl -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain nightly --target wasm32-unknown-unknown
ENV PATH="/home/node/.cargo/bin:$PATH"
RUN curl -sSf https://rustwasm.github.io/wasm-pack/installer/init.sh | sh

COPY --chown=node:node . .

RUN set -ex \
    && npm run build:wasm \
    && npm install \
    && npm run build


FROM node:lts

RUN apt-get -y update \
    && apt-get -y install libasound2-dev

USER node
RUN mkdir /home/node/app
WORKDIR /home/node/app

RUN wget -O chatsounds-cli https://github.com/SpiralP/chatsounds-cli/releases/latest/download/chatsounds-cli-linux-x86_64 \
    && chmod +x chatsounds-cli

COPY --chown=node:node . .

COPY --from=builder --chown=node:node /home/node/app/pkg ./pkg

RUN set -ex \
    && npm install --omit dev \
    && npm cache clean --force

COPY --from=builder --chown=node:node /home/node/app/dist ./dist


EXPOSE 8080
ENV PORT=8080
CMD [ "npm", "start" ]
