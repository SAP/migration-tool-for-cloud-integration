FROM node:18

WORKDIR /app
COPY . .

RUN npm install -g @sap/cds-dk
RUN npm install
RUN cds deploy --to sqlite

EXPOSE 4004

CMD ["npm", "start"]