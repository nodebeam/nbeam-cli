var nbeam = require('../nbeam'),
    package = exports;

var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    zlib = require('zlib'),
    fstream = require('fstream'),
    fstreamNpm = require('fstream-npm'),
    request = require('request'),
    qs = require('querystring'),
    _ = require('underscore'),
    tar = require('tar');


package.get = function (dir, callback) {

    package.read(dir, function (err, pkg) {
        if (err)
            return callback('Error reading ' + (path.join(dir, '/package.json')).grey + ':' + err.toString());

        package.validate(pkg, function (err, updated) {
            return err ? callback(err) : callback(null, updated);
        });
    });
};

package.read = function (dir, callback) {
  var file = path.resolve(path.join(dir, 'package.json'));

  fs.readFile(file, function (err, data) {
    if (err) {
      return callback(err);
    }

    data = data.toString();

    if (!data.length) {
      return callback(new Error('package.json is empty'));
    }

    try {
      data = JSON.parse(data.toString());
    }
    catch (ex) {
      return callback(new Error('Invalid package.json file'));
    }

    callback(null, data);
  });
};

package.validate = function (pkg, callback) {
    callback(null, true);
};

package.create_tarball = function(dir, callback) {

    package.read(dir, function (err, pkg) {
        if (err) return callback(err);

        var name = [nbeam.config.get('username'), pkg.name, pkg.version].join('-') + '.tgz',
            tarball = path.join('./', name);

        fstreamNpm({
            path: dir,
            ignoreFiles: ['.nbeamignore', '.npmignore', '.gitignore', 'package.json']
        })
            .on('error', callback)
            .pipe(tar.Pack())
            .on('error', callback)
            .pipe(zlib.Gzip())
            .on('error', callback)
            .pipe(fstream.Writer({ type: "File", path: tarball }))
            .on('close', function () {
                callback(null, tarball);
            });
    });
};

package.upload_tarball = function(file) {

    var readStream = fs.createReadStream(file);

    var bytesRead = 0,
        bytesTotal = 0;

    fs.stat(file, function(err, stat) {
        if (err) { throw err; }
        bytesTotal = stat.size;
    });

    readStream.on('data', function(data) {
        bytesRead += data.length;

        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        percentage = (100 * bytesRead / bytesTotal);
        process.stdout.write('info:\t'.cyan + "Uploading at " + percentage.toFixed(1) + "%\n");
    });

    params = {
        file_name: file,
        username: nbeam.config.get('username')
    };

    readStream.pipe(request.post(
        nbeam.nburi + '/appUpload?' + qs.stringify(_.extend(params, nbeam.user.auth_token(nbeam.config.get('api_key')))),
        function(err, res, body){
            console.log(body);
    }));
};