#!/usr/bin/env node

var nbeam = require('../nbeam'),
    user = exports;

var prompt = require('prompt'),
    request = require('request'),
    _ = require('underscore'),
    crypto = require('crypto');

user.create = function(username, email, callback) {
    request.post(nbeam.nburi + '/userCreate', {form: {
        'username': username,
        'email': email
    }}, function(err, res, body) {
        if(body == '11000')     err = new Error('User exists');
        else if(body != '1')    err = new Error('API server error');

        return err ? callback(err) : callback();
    });
};

user.authenticate = function(username, password, callback) {

    data = { username: username };
    auth = user.auth_token(crypto.createHash('sha1').update(password).digest('hex'));

    request.post(
        nbeam.nburi + '/userAuth',
        {form: _.extend(data, auth)},

        function(err, res, body) {
        switch (body) {
            case "101":
                err = new Error("Invalid username.");
                break;
            case "102":
                err = new Error("Invalid password.");
                break;
            default:
                break;
        }
        return err ? callback(err) : callback();
    });
};

user.setup_account = function(callback) {

    var tries = 0;

    function offerReset (username) {
        prompt.get(['reset'], function (err, res) {
            if (!err && /^y(?:es)?$/i.test(res.reset))
                user.reset(function(err){

                });
            else process.exit(0);
        });
    }

    (function setupAuth () {
        prompt.get(['username', 'password'], function (err, result) {
            if (err) return callback(err);
            tries += 1;

            user.authenticate(result.username, result.password, function(err, status) {
                if (err) {
                    console.log('err:\t'.red + err.message);
                    if (tries >= 3) {
                        console.log('warn:\t'.yellow + 'Three failed login attempts');
                        console.log('info:\t'.cyan + 'Reset the password?');
                        return offerReset(result.username);
                    }
                    return setupAuth();
                }
                nbeam.config.set('username', result.username);
                nbeam.config.save();
                return callback(null,
                    result.username,
                    crypto.createHash('sha1').update(result.password).digest('hex')
                );
            });
      });
    })();
};

user.reset = function(callback) {
    console.log('info:\t'.cyan + 'Not implemented.');
    // console.log('info:\t'.cyan + 'An email has been sent to your account.');
    return callback();
};

user.setup_api_key = function(username, password_hash, callback) {

    data = { username: username };
    auth = user.auth_token(password_hash);
    request.post(nbeam.nburi + '/userApiKey', {form: _.extend(data, auth)}, function(err, res, body) {
        if(!err) {nbeam.config.set('api_key', body); nbeam.config.save(); }
        return err ? callback(err) : callback();
    });
};

user.auth_token = function(passphrase) {

    challenge = crypto.randomBytes(20).toString('hex'),
    timestamp =  Math.round((new Date()).getTime() / 1000),

    hash = crypto
            .createHmac('sha1', passphrase)
            .update([challenge, timestamp].join(':'))
            .digest('hex');

    return {
        auth_challenge: challenge,
        auth_ts:        timestamp,
        auth_hash:      hash
    };
};