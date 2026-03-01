FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# install dependencies and ensure binaries are executable (fix react-scripts permission)
RUN npm install

COPY . .

# run via shell to avoid exec-permission issues
CMD ["npm" , "start"]
