#!/usr/bin/env node

var nbeam = require('../nbeam'),
    user = exports;

var prompt = require('prompt'),
    request = require('request'),
    _ = require('underscore'),
    crypto = require('crypto');

user.authenticate = function(username, password, callback) {

    data = { username: username };
    auth = user.auth_token(crypto.createHash('sha1').update(password).digest('hex'));

    request.post(
        nbeam.nburi + '/login',
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
        callback(new Error('Not implemented.'));
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

user.setup_api_key = function(username, password_hash, callback) {

    data = { username: username };
    auth = user.auth_token(password_hash);
    request.post(nbeam.nburi + '/get_api_key', {form: _.extend(data, auth)}, function(err, res, body) {
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