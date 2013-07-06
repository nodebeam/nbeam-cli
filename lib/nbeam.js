#!/usr/bin/env node

var nbeam = module.exports;

var qs = require('querystring'),
    colors = require('colors'),
    _ = require('underscore'),
    fs = require('fs'),
    request = require('request'),
    program = require('commander'),
    zlib = require('zlib'),
    path = require('path'),
    tar = require('tar'),
    fstream = require('fstream'),
    prompt = require('prompt'),
    util = require('util'),
    fstreamNpm = require("fstream-npm");


nbeam.nburi       = 'http://localhost:4730';

nbeam.config    = require('nconf');
nbeam.user      = require('./nbeam/user');
nbeam.package   = require('./nbeam/package');


nbeam.start = function (callback) {

    program
        .version('0.0.1');

    program
        .command('deploy')
        .description('initialize project configuration')
        .action(function() {

            console.log('info\t'.cyan + 'Deploying'.green + ' the projet');
            nbeam.package.create_tarball("./", function(error, tarball) {
                if(tarball)
                    nbeam.package.upload_tarball(tarball);
            });

    });

    program
        .command('*')
        .action(function(env){
            console.log('Enter a Valid command');
            terminate(true);
    });

    var config_file = './.nbeam.json';

    nbeam.config.file({ file: config_file });
    nbeam.welcome();

    fs.exists(config_file, function(exists) {
        if(exists) {
            program.parse(process.argv);
        } else {
            nbeam.setup();
        }
    });

};

nbeam.welcome = function() {
    user = nbeam.config.get('username');
    console.log('info:\t'.cyan + 'Welcome to ' + 'Nodebeam'.green + ' ' +(user || '').yellow);
    console.log('info:\t'.cyan + 'beam-cli v0.0.1, node ' + process.version);
};

nbeam.setup = function() {

    console.log('err:\t'.red + 'Missing configuration file, please log in');

    nbeam.user.setup_account(function(err, username, password_hash) {
        if(err) { console.log('err:\t'.red + err.message); return; }

        nbeam.user.setup_api_key(username, password_hash, function(err) {
            if(err) { console.log('err:\t'.red + err.message); return; }
                console.log('info:\t'.cyan + 'Setup sucessful. Please, restart nbeam.');
        });
    });
};