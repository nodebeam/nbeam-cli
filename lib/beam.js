#!/usr/bin/env node

var qs = require('querystring'),
    crypto = require('crypto'),
    fs = require('fs'),
    request = require('request'),
    program = require('commander'),
    zlib = require('zlib'),
    path = require('path'),
    tar = require('tar'),
    fstream = require('fstream'),
    fstreamNpm = require("fstream-npm");

var beam = module.exports;


beam.start = function (callback) {

    program
        .version('0.0.1');

    program
        .command('deploy [folder]')
        .description('initialize project configuration')
        .action(function(folder) {

            console.log('Deploying from ' + folder + '...');
            beam.create_tarball(folder, function(error, tarball) {
                if(tarball)
                    beam.upload_tarball(tarball);
            });

    });

    program
        .command('*')
        .action(function(env){
            console.log('Enter a Valid command');
            terminate(true);
    });

    program.parse(process.argv);

};

beam.create_tarball = function(dir, callback) {

    var name = ['sbach', 'sample-app', '0.1'].join('-') + '.tgz';
    var tarball = path.join('./', name);

    fstreamNpm({
      path: dir,
      ignoreFiles: ['.beamignore', '.npmignore', '.gitignore', 'package.json']
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
};

beam.upload_tarball = function(file) {

    var readStream = fs.createReadStream(file);

    var bytesRead = 0,
        bytesTotal = 0;

    fs.stat(file, function(err, stat) {
        if (err) { throw err; }
        bytesTotal = stat.size;
    });

    readStream
        .on('data', function(data) {
            bytesRead += data.length;
            console.log((100 * bytesRead / bytesTotal) + "%");
    });

    var api_key = 'GKJ2G34GH4FU4Y3FH',
        private_key = 'sdflhse734Y2IG3JIG4JFJ',
        challenge = crypto.randomBytes(20).toString('hex'),
        hash = crypto.createHmac('sha1', private_key).update(challenge).digest('hex');

    params = {
        file_name:      file,
        api_key:        api_key,
        auth_challenge: challenge,
        auth_hash:      hash
    };

    readStream.pipe(request.post(
        'http://sbach.fr/put.php?' + qs.stringify(params),
        function(err, res, body){
            console.log(body);
    }));
};