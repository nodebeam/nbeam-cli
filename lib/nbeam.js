#!/usr/bin/env node

var qs = require('querystring'),
    colors = require('colors'),
    crypto = require('crypto'),
    fs = require('fs'),
    request = require('request'),
    program = require('commander'),
    zlib = require('zlib'),
    path = require('path'),
    tar = require('tar'),
    fstream = require('fstream'),
    fstreamNpm = require("fstream-npm");

var nbeam = module.exports;


nbeam.start = function (callback) {

    program
        .version('0.0.1');

    program
        .command('deploy [folder]')
        .description('initialize project configuration')
        .action(function(folder) {

            console.log('Deploying from ' + folder + '...');
            nbeam.create_tarball(folder, function(error, tarball) {
                if(tarball)
                    nbeam.upload_tarball(tarball);
            });

    });

    program
        .command('*')
        .action(function(env){
            console.log('Enter a Valid command');
            terminate(true);
    });

    nbeam.welcome();

    program.parse(process.argv);

};

nbeam.welcome = function() {
    username = 'sbach';
    console.log('info:\t'.cyan + 'Welcome to ' + 'Nodebeam'.green + ' ' + username.yellow);
    console.log('info:\t'.cyan + 'beam-cli v0.0.1, node ' + process.version);
};

nbeam.create_tarball = function(dir, callback) {

    var name = ['sbach', 'sample-app', '0.1'].join('-') + '.tgz';
    var tarball = path.join('./', name);

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
};

nbeam.upload_tarball = function(file) {

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
        ts =  Math.round((new Date()).getTime() / 1000),
        hash = crypto.createHmac('sha1', private_key).update([challenge, ts].join(':')).digest('hex');

    params = {
        file_name:      file,
        api_key:        api_key,
        auth_challenge: challenge,
        auth_hash:      hash,
        auth_ts:        ts
    };

    readStream.pipe(request.post(
        'http://sbach.fr/put.php?' + qs.stringify(params),
        function(err, res, body){
            console.log(body);
    }));
};