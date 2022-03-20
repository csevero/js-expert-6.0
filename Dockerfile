FROM node:17-slim

# The node:17-slim is a image based on ubuntu, so we can use the apt-get to install external packages to our machine
RUN apt-get update \
  && apt-get install -y sox libsox-fmt-mp3
  # how we will be work just with mp3 file we will use the libsox, if will be necessary to handle with other type of data you can install the libsox-fmt-all

# work dir of our container
WORKDIR /spotify-radio/

# copying our package and package-lock to our work dir
COPY package.json package-lock.json /spotify-radio/

# install all dependencies, with ci argument we use the package-lock to install specific versions of our dependencies
RUN npm ci --silent

# copy all files from our local machine to container
COPY . .

# set a user to garant that container doesn't have any access to our local machine
USER node

# run the server on container
CMD npm run live-reload