FROM node:5

# Replace shell with bash so we can source files
# ?? RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Set environment variables
ENV appDir /var/www/app/current

# Run updates and install deps
# ?? RUN apt-get update

# Set the work directory
RUN mkdir -p ${appDir}
WORKDIR ${appDir}


# Add our package.json and install *before* adding our application files
# So, we add in only our package.json file and run npm install --production.
# Once that's done, then we can add our files using ADD. Since we ordered
# the steps this way and chose to have Docker ignore our local node_modules
# directory, the costly npm install --production step will only be run when
# package.json has changed. This will save build time and hopefully result
# in a speedier deploy process.

ADD package.json ./
RUN npm i --production

# Install pm2 *globally* so we can run our application
RUN npm i -g pm2

# Add application files
ADD . ${appDir}

#Expose the port
EXPOSE 5672

CMD ["node", "app.js"]
