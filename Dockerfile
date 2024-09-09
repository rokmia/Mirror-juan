FROM node:latest
WORKDIR /usr/src/app
COPY package*.json config.yml tsconfig.json ./
RUN npm install -g pnpm
RUN pnpm install
COPY . .
RUN pnpm run build
CMD [ "pnpm", "start" ]