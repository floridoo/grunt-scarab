module.exports = function(grunt) {
	'use strict';

	var path = require('path');

	var defaults = {
		server: 'server',
		host: 'localhost',
		port: 3000,
		livereload: true
	};

	grunt.registerMultiTask('scarab', function() {
		var done = this.async();
		var options = this.options(defaults);
		var server = require('http').createServer();
		setupServer(server, options);
		server.listen(options.port, options.host, done);
	});

	grunt.registerTask('scarab:restart', function() {
		var done = this.async();
		var options = grunt.config.get('scarab').options;
		require('http').get('http://localhost:' + options.port + '/$reload', done);
	});

	function setupServer(server, options) {
		var app = require(path.resolve(options.server));
		if (options.livereload) {
			if (options.livereload === true)
				options.livereload = 35729;
			var prevmw = app.config.middleware;
			app.config.middleware = function(app) {
				app.use(require('connect-livereload')({
					port: options.livereload
				}));
				prevmw(app);
			};
			app.use('/$reload', function(req, res) {
				grunt.log.writeln('Restarting scarab...');
				app.teardown(function() {
					app.scarab.uncache(app);
					server.removeAllListeners('request');
					setupServer(server, options);
				});
				res.send(200);
			});
		}

		if (options.middleware) {
			options.middleware(app);
		}

		if (options.mount) {
			for (var route in options.mount) {
				if(typeof options.mount[route] === 'string')
					options.mount[route] = [options.mount[route]];
				var paths = options.mount[route].map(function(target) {return path.resolve(target)});
				app.config.routes['static '+route] = paths;
			}
		}

		app.set('port', options.port);
		app.init();
		server.on('request', app);
	}
};
