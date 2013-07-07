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
nbeam.config_file = './.nbeam.user';

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

            nbeam.is_configured(function(){

                console.log('info\t'.cyan + 'Deploying'.green + ' the projet');
                nbeam.package.create_tarball("./", function(error, tarball) {
                if(tarball)
                    nbeam.package.upload_tarball(tarball);
                });

            });
    });

    program
        .command('signup')
        .description('register an account to Nodebeam')
        .action(function() {

            console.log('info\t'.cyan + 'Creating'.green + ' an account');

            prompt.get(['username', 'email'], function (err, result) {
                if (err) return callback(err);
                nbeam.user.create(result.username, result.email, function(err, status) {
                    if(err) console.log(err);
                });
            });

    });

    program
        .command('login')
        .description('connect to your Nodebeam account')
        .action(function() {

            nbeam.setup();
    });

    program
        .command('*')
        .action(function(env){
            console.log('Enter a Valid command');
            terminate(true);
    });

    nbeam.config.file({ file: nbeam.config_file });
    nbeam.welcome();

    program.parse(process.argv);
};

nbeam.welcome = function() {
    user = nbeam.config.get('username');
    console.log('info:\t'.cyan + 'Welcome to ' + 'Nodebeam'.green + ' ' +(user || '').yellow);
    console.log('info:\t'.cyan + 'beam-cli v0.0.1, node ' + process.version);
};

nbeam.need_setup = function() {
    console.log('warn:\t'.yellow + 'You are not connected.');
    console.log('info:\t'.cyan + 'Use: ' + 'nbeam signup'.cyan+ ' to create an account,');
    console.log('info:\t'.cyan + 'or: ' + 'nbeam login'.cyan + ' to connect to Nodebeam.');
    process.exit(0);
};

nbeam.setup = function() {

    nbeam.user.setup_account(function(err, username, password_hash) {
        if(err) { console.log('err:\t'.red + err.message); return; }

        nbeam.user.setup_api_key(username, password_hash, function(err) {
            if(err) { console.log('err:\t'.red + err.message); return; }
                console.log('info:\t'.cyan + 'Connection sucessful.');
                console.log('info:\t'.cyan + 'Your account has been saved in ' + '.nbeam.user'.green);
        });
    });
};

nbeam.is_configured = function(callback) {
    fs.exists(nbeam.config_file, function(exists) {
        if (exists) callback();
        else nbeam.need_setup();
    });
};