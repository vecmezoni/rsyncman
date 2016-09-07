
var path = require('path');
var process = require('process');
var Rsync = require('rsync');
var watchman = require('fb-watchman');

var client = new watchman.Client();

var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

var configPath = path.join(home, '.rsyncman');

try {
    var config = require(configPath);
} catch (e) {
    console.error(e);
    console.error(`Failed to find config file in ${configPath}`);
    process.exit(1);
}

var sync = function(project, paths) {
    var projectConfig = config.folders[project];
    var rsync = new Rsync();
    rsync
        .set('archive')
        .set('delete')
        .set('perms')
        .set('verbose')
        .source(projectConfig.source)
        .destination(projectConfig.destination);

    if (paths) {
        rsync.include(paths);
    }

    var start = process.hrtime();

    rsync.execute(function(error, code, cmd) {
        if (error) {
            console.error(error);
            return;
        }
        var elapsed = (process.hrtime(start)[1] / 1000000).toFixed(2);
        console.log(`Successfully synced ${project} to ${projectConfig.destination} in ${elapsed}ms`);
        console.log(cmd);
    });
};

var watch = function(project, callback) {
    var projectConfig = config.folders[project];

    client.command(['watch-project', projectConfig.source], function (error, resp) {
        if (error) {
            console.error(`Error initiating watch: ${error}`);
            return;
        }

        if ('warning' in resp) {
            console.log(`warning: ${resp.warning}`);
        }

        console.log(`watch established on ${resp.watch}`);

        callback(resp.watch);
    });
};

Object.keys(config.folders).forEach(function(project) {
    sync(project);
    watch(project, function(watch) {
        makeSubscription(project, watch);
    })
});

function makeSubscription(project, watch) {
    client.command(['clock', watch], function (error, resp) {
        if (error) {
            console.error(`Failed to query clock: ${error}`);
            return;
        }

        var sub = {
            fields: ['name'],
            since: resp.clock
        };

        client.command(['subscribe', watch, project, sub],  function(error, resp) {
            if (error) {
                console.error(`failed to subscribe: ${error}`);
                return;
            }
            console.log(`subscription ${resp.subscribe} established`);
        });

        client.on('subscription', function(resp) {
            if (resp.subscription !== project) {
                return;
            }

            resp.files.forEach(function(file) {
                console.log(`Updated ${file}`);
            });

            sync(project, resp.files);
        });
    });
}
