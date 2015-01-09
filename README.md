# iAnn Solr schema migration

Simple to use UI for solr documents migration. It uses Ajax calls to read and update indexes.
To use a script, there are two important things to do:
* install php and place scripts from a `server-scripts` folder to your http server dir
* simply place compiled code from a `dist` folder to your http server dir

There are old and new schema examples provided in a folder `schema-examples`.

## Installation

### Required
* node (>= 0.10.x recommended) - http://nodejs.org/download/
* grunt-cli (>= 0.1.9 recommended) - `npm install -g grunt-cli`
* bower (>= 1.2.7 recommended) - `npm install -g bower`

### Setup

Install the node.js modules into the root directory of the project via `npm install`.
Fetch the vendor js libraries via `bower install`.


## Development

Start the development helpers via `grunt dev`. This grunt tasks first compiles all js code in
the project, then starts a local development server (http://localhost:1111) and finally attaches
a file watcher. Everytime you change a file, this grunt tasks gets notified and compiles the code.

### Suggested Workflow
1. run `grunt dev`; this command also launches your default browser
2. change any code in `iann-solr-schema-migration/app`
3. reload the browser
4. go to 2.


### Versioning
The build version is stored in `package.json`. Use the grunt task `grunt bumpup:(major|minor|path)` to bump the version followed by `grunt release` automatically create a new git commit + tag with the version.
* major: x.0.0
* minor: 0.x.0
* patch: 0.0.x


## Deployment

For now, the best practice is to ssh to the server, clone the repository, install bower requrirements, install npm requirements and run the grunt build:

1. `ssh server.com`
2. `git clone git@github.com:iannpro/iann-solr-schema-migration.git`
3. `cd masis`
4. `bower install`
5. `npm install`
6. `grunt build`

*Note:* 1-5 is only necessary for the first deployment.
