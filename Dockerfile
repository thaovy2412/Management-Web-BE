FROM node
ARG DB_HOST=172.29.0.2
ARG DB_PORT=3306
WORKDIR /usr/src/app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3000
RUN mkdir /home/reports
ADD shell.sh /usr/local/bin/shell.sh
RUN chmod 777 /usr/local/bin/shell.sh
CMD ["/usr/local/bin/shell.sh"]