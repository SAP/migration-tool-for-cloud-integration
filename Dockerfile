# specifying plaform is needed when deploying from M1/2 chip devices
FROM --platform=linux/amd64 node:18

WORKDIR /app
COPY app /app/app
COPY db /app/db
COPY srv /app/srv
COPY db.sqlite /app
COPY package.json /app

RUN npm install
EXPOSE 4004

CMD ["node_modules/.bin/cds-serve"]