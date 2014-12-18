/*jslint node: true */
'use strict';

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-bumpup');
    grunt.loadNpmTasks('grunt-tagrelease');
    grunt.loadNpmTasks('grunt-notify');

    // Default task.
    grunt.registerTask('default', ['jshint', 'build']);
    grunt.registerTask('build', ['clean', 'concat', 'less:development', 'copy:assets', 'createVersionFile', 'notify:build']);
    grunt.registerTask('dev', ['jshint', 'build', 'connect', 'watch']);

    // Print a timestamp (useful for when watching)
    grunt.registerTask('timestamp', function() {
        grunt.log.subhead(Date());
    });

    grunt.registerTask('release-submodule', function() {
        var shell = require('shelljs');

        var exec = function(command) {
            return shell.exec(command, { silent: true });
        };

        var git = {
            isClean: function() {
                return exec('cd dist; git diff-index --quiet HEAD --').code === 0;
            }
        };

        var pkg = grunt.file.readJSON(__dirname + '/package.json');

        var message = 'Release ' + pkg.version;

        if (!git.isClean()) {
            var res = exec('cd dist; git add --all .; git commit -m "' + message + '"; git push');
            if (res.code === 0) {
                grunt.log.writeln('Un-staged changes in `dist` committed as: ' + message.cyan);
            }
        }
    });

    grunt.registerTask('release', function (type) {
        type = type ? type : 'patch';
        grunt.task.run('jshint');
        //grunt.task.run('bumpup:' + type); // Bump up the package version
        grunt.task.run('build');
        grunt.task.run('release-submodule');     // Commit & tag the changes in the submodule
        grunt.task.run('tagrelease');     // Commit & tag the changes from above
    });


    grunt.registerTask('createVersionFile', function () {
        var pkg = grunt.file.readJSON(__dirname + '/package.json');

        grunt.file.write(__dirname + '/dist/version.json', JSON.stringify({
            version: pkg.version,
            date: new Date()
        }));
    });



    // Project configuration.
    grunt.initConfig({
        distdir: 'dist',
        pkg: grunt.file.readJSON('package.json'),
        banner:
            '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
            '<%= pkg.homepage ? " * " + pkg.homepage + "\\n" : "" %>' +
            ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %>;\n */\n',
        src: {
            js: ['src/code/**/*.js'],
            jsTpl: ['<%= distdir %>/templates/**/*.js'],
            html: ['src/index.html'],
            tpl: {
                app: ['src/app/**/*.tpl.html'],
                common: ['src/common/**/*.tpl.html']
            },
            less: ['src/less/main.less'], // less:build doesn't accept ** in its file patterns
            lessWatch: ['src/less/**/*.less']
        },

        clean: ['<%= distdir %>/*'],

        bumpup: 'package.json',
        tagrelease: 'package.json',

        copy: {
            assets: {
                files: [{
                    dest: '<%= distdir %>/assets/',
                    src : '**',
                    expand: true,
                    cwd: 'src/assets/'
                }, {
                    dest: '<%= distdir %>/assets/fonts/font-awesome/',
                    src: 'bower_components/font-awesome/fonts/*',
                    flatten: true,
                    expand: true
                }, {
                    dest: '<%= distdir %>/assets/',
                    src: 'src/favicon.ico',
                    flatten: true,
                    expand: true
                }]
            }
        },

        concat: {
            dist:{
                options: {
                    banner: "<%= banner %>\n'use strict';\n\n"
                },
                src:['<%= src.js %>', 'src/app/*.js'],
                dest:'<%= distdir %>/<%= pkg.name %>.js'
            },
            index: {
                src: ['src/index.html'],
                dest: '<%= distdir %>/index.html',
                options: {
                    process: true
                }
            },
            angular: {
                src:[
                    'bower_components/angular/angular.js'
                ],
                dest: '<%= distdir %>/angular.js'
            }
        },

        less: {
            development: {
                files: {
                    '<%= distdir %>/<%= pkg.name %>.css': ['<%= src.less %>']
                }
            }
        },

        watch:{
            all: {
                files: [
                    '<%= src.js %>', '<%= src.lessWatch %>',
                    '<%= src.tpl.app %>', '<%= src.tpl.common %>', '<%= src.html %>'
                ],
                tasks:['default','timestamp']
            },
            build: {
                files: [
                    '<%= src.js %>', '<%= src.lessWatch %>',
                    '<%= src.tpl.app %>', '<%= src.tpl.common %>', '<%= src.html %>'
                ],
                tasks:['build','timestamp']
            }
        },

        jshint: {
            files: [
                'gruntFile.js', '<%= src.js %>', '<%= src.jsTpl %>'
            ],
            options:{
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                boss: true,
                eqnull: true,
                browser: true,
                devel: true,
                undef: true,
                globals: {
                    angular: true
                }
            }
        },

        connect: {
            server: {
                options: {
                    port: 1111,
                    base: 'dist',
                    open: true
                }
            }
        },

        notify: {
            build: {
                options: {
                    message: 'Voila...'
                }
            }
        }
    });
};
