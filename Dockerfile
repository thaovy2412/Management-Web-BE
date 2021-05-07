FROM node
ARG DB_HOST=172.29.0.2
ARG DB_PORT=3306
WORKDIR /usr/src/app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD ["bash", "-c", "while !</dev/tcp/$DB_HOST/$DB_PORT; do sleep 1; done; npm start"]