# specifying plaform is needed when deploying from devices with Apple chips (non-Intel)
FROM --platform=linux/amd64 node:22.16.0-bookworm-slim

WORKDIR /app

COPY app/appconfig ./app/appconfig
COPY app/contentviewer/dist ./app/contentviewer/dist
COPY app/migrationjobs/dist ./app/migrationjobs/dist
COPY app/migrationtasks/dist ./app/migrationtasks/dist
COPY app/registration/dist ./app/registration/dist
COPY app/custom.css app/home.html ./app/

COPY gen/srv/@cds-models ./@cds-models
COPY gen/srv/srv ./srv

COPY db.sqlite package.json ./

RUN npm install --omit=dev
EXPOSE 4004

CMD ["node_modules/.bin/cds-serve"]