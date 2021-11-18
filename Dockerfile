FROM node:14-alpine

WORKDIR /app
COPY . .

RUN npm install -g @sap/cds-dk
RUN npm install
RUN cds deploy --to sqlite --with-mocks

EXPOSE 4004

CMD ["npm", "start"]