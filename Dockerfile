FROM node:lts-slim

USER node
WORKDIR /home/node/app

COPY --chown=node:node . ./

RUN yarn install && yarn run build

CMD ["yarn", "run", "start:prod"]
