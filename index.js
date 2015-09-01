#! /usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = require('minimist')(process.argv.slice(2), {
    boolean: ['help', 'save-config', 'grayscale', 'blur', 'version'],
    alias: {
        w: 'width',
        h: 'height',
        d: 'dir',
        s: 'save-config',
        i: 'image',
        x: 'gravity',
        g: 'grayscale',
        b: 'blur',
        v: 'version'
    }
});
var assign = require('object-assign');

var defaults = {
    width: 2880,
    height: 1800,
    dir: '.'
};

var shouldDownload = (argv._.indexOf('latest') > -1 || argv._.indexOf('random') > -1 || argv.hasOwnProperty('image'));
var printedVersion = false;

// --help
if (argv.help) {
    console.log([
        '',
        '    latest',
        '',
        '        Get the latest image.',
        '        example:',
        '        $ unsplash-wallpaper latest',
        '',
        '    random',
        '',
        '        Get a random image.',
        '        example:',
        '        $ unsplash-wallpaper random',
        '',
        '    -w, --width {Number}',
        '',
        '        Set the width of desired download.',
        '',
        '    -h, --height {Number}',
        '',
        '        Set the height of desired download.',
        '',
        '    -d, --dir {String} or "."',
        '',
        '        Download the image to a specific directory.',
        '        "." uses the current working directory.',
        '        "./" stores the current working directory even when it changes.',
        '        example:',
        '        $ unsplash-wallpaper --dir "/Users/Shared"',
        '        $ unsplash-wallpaper --dir "C:\Users\Public"',
        '        $ unsplash-wallpaper -d .',
        '',
        '    -s, --save-config',
        '',
        '        Saves any width, height or dir value in a config file.',
        '        example:',
        '        $ unsplash-wallpaper random -s --width 1600 --height 1200',
        '',
        '    -i, --image {Number}',
        '',
        '        Get a specific unsplash image if you know the number.',
        '        (https://unsplash.it/images)',
        '        example:',
        '        $ unsplash-wallpaper -i 580',
        '',
        '    -x, --gravity "north|east|south|west|center"',
        '',
        '        Choose the direction to crop.',
        '        example:',
        '        $ unsplash-wallpaper --image 327 --gravity south',
        '',
        '    -g, --grayscale',
        '',
        '    -b, --blur',
        '',
        '    -v, --version',
        '',
    ].join('\n'));
    return;
}

// --version
if (argv.version) {
    console.log('version', require('./package.json').version);
    printedVersion = true;
}

var options = {};

// --width
if (typeof argv.width === 'number') {
    options.width = argv.width;
}

// --height
if (typeof argv.height === 'number') {
    options.height = argv.height;
}

// --dir
if (typeof argv.dir === 'string') {
    if (argv.dir.length > 1 && argv.dir.indexOf('.') === 0) {
        options.dir = path.join(process.cwd(), argv.dir);
    } else {
        options.dir = argv.dir;
    }
}

if (argv['save-config'] || shouldDownload) {

    fs.readFile(path.join(__dirname, 'config.json'), 'utf-8', function (err, config) {
        if (err) {
            config = {};
        } else {
            try {
                config = JSON.parse(config);
            } catch (e) {
                config = {};
            }
        }

        var opts = assign({}, defaults, config, options);

        if (shouldDownload) {
            downloadImage(opts);
        }

        if (argv['save-config']) {
            saveConfig(opts);
        }
    });
} else if (!printedVersion) {
    console.log('For help:\n$ unsplash-wallpaper --help');
}

function downloadImage(opts) {

    var request = require('request');
    var progress = require('request-progress');
    var wallpaper = require('wallpaper');

    var url = 'https://unsplash.it/';
    var hasQuestionMark = false;
    var dir = (opts.dir === '.') ? process.cwd() : opts.dir;
    var uniqueName = path.join(dir, 'wallpaper-' + Math.random().toString(36).slice(2, 10) + '.jpg');

    // --grayscale
    if (argv.grayscale) {
        url += 'g/';
    }

    url += opts.width + '/' + opts.height + '/';

    // --image #
    if (typeof argv.image === 'number' || typeof argv.image === 'string') {
        url += '?image=' + argv.image;
        hasQuestionMark = true;
    }

    // --gravity north, east, south, west, center
    if (typeof argv.gravity === 'string') {
        url += (hasQuestionMark) ? '&' : '?';
        url += 'gravity=' + argv.gravity;
        hasQuestionMark = true;
    }

    var params = [];

    // random
    if (argv._.indexOf('random') > -1) {
        params.push('random');
    }

    // --blur
    if (argv.blur) {
        params.push('blur');
    }

    // random blur
    if (params.length > 0) {
        url += (hasQuestionMark) ? '&' : '?';
        url += params.join('&');
    }

    console.log('request ', url);

    progress(request(url), {
        throttle: 30
    })
    .on('progress', function (state) {
        process.stdout.write('Downloading [' + progressBar(state.percent, 40) + ']\033[0G');
    })
    .on('error', function (err) {
        console.log('An error has occured while downloading.', err);
    })
    .pipe(fs.createWriteStream(uniqueName))
    .on('error', function (err) {
        console.log('\nAn error has occured while streaming.', err);
    })
    .on('close', function () {

        console.log('Downloading [' + progressBar(100, 40) + ']');
        console.log('Image saved to ', uniqueName);

        wallpaper.set(uniqueName, function (err) {
            if (err) {
                console.log('An error has occured while setting wallpaper.', err);
                return;
            }

            console.log('Check it out!');
        });
    });
}

function saveConfig(opts) {
    fs.writeFileSync(path.join(__dirname, 'config.json'), new Buffer(JSON.stringify(opts, null, 4)), 'utf-8');
}

function progressBar(percent, length) {
    var barCount = (percent / 100) * length;
    var bar = '';
    for (var x = 0; x < length; x += 1) {
        bar += (x <= barCount) ? '=' : ' ';
    }
    return bar;
}
