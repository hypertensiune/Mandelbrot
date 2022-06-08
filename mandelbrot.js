const canvas = document.getElementById('mycanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colors');

const width = window.innerWidth;
const height = window.innerHeight;

canvas.width = width;
canvas.height = height;

const ratio = width / height;
const imgData = ctx.createImageData(width, height);
const urlParams = new URLSearchParams(window.location.search);

const map = (value, inmin, inmax, outmin, outmax) => {
    return (value - inmin) * (outmax - outmin) / (inmax - inmin) + outmin;
}

var xrange = [];
var yrange = [];
var zoomlvl;
var maxiterations = 200;
var lookingAt;

document.getElementById('resetbtn').addEventListener('click', () => init(false));
canvas.addEventListener('contextmenu', (evt) => { evt.preventDefault(); zoomout(evt); });
canvas.addEventListener('click', zoomin);

document.getElementById('dlbtn').addEventListener('click', (e) => {
    const link = document.createElement('a');
    link.download = 'mandelbrot_set.png';
    link.href = canvas.toDataURL();
    link.click();
    link.remove();
});

colorPicker.onchange = function () {
    console.log(this.value);
    switch (this.value) {
        case 'HSV': currentColor = colors.hsv; break;
        case 'grayscale1': currentColor = colors.grayscale1; break;
        case 'grayscale2': currentColor = colors.grayscale2; break;
    }
}

function init(params) {
    if (!params || (params && !readUrlParams())) {
        setDefaultVariables();
    }
    lookingAt = { x: -0.34375, y: -0.4218590398365679 };
    draw(xrange, yrange);
    updateData(xrange, yrange, zoomlvl, lookingAt);
}

function setDefaultVariables() {
    xrange = [-2, 2];
    yrange = [-1, 1];
    zoomlvl = 4;
    maxiterations = 150;
    lookingAt = { x: -0.34375, y: -0.4218590398365679 };
}

function hsv_to_rgb(h, s, v) {
    if (v > 1.0) v = 1.0;
    var hp = h / 60.0;
    var c = v * s;
    var x = c * (1 - Math.abs((hp % 2) - 1));
    var rgb = [0, 0, 0];

    if (0 <= hp && hp < 1) rgb = [c, x, 0];
    if (1 <= hp && hp < 2) rgb = [x, c, 0];
    if (2 <= hp && hp < 3) rgb = [0, c, x];
    if (3 <= hp && hp < 4) rgb = [0, x, c];
    if (4 <= hp && hp < 5) rgb = [x, 0, c];
    if (5 <= hp && hp < 6) rgb = [c, 0, x];

    var m = v - c;
    rgb[0] += m;
    rgb[1] += m;
    rgb[2] += m;

    rgb[0] *= 255;
    rgb[1] *= 255;
    rgb[2] *= 255;

    return rgb;
}

function smoothColor(n, re, img) {
    let logBase = 1.0 / Math.log(2.0);
    let logHalfBase = Math.log(0.5) * logBase;

    //var v = 1 + n - Math.log(Math.log(Math.sqrt(Zr*Zr+Zi*Zi)))/Math.log(2.0);
    return 5 + n - logHalfBase - Math.log(Math.log(re + img)) * logBase;
}

const colors = {
    grayscale1: function (maxiterations, n, re, img) {
        if (n == maxiterations)
            return [0, 0, 0];

        var v = smoothColor(n, re, img);
        v = Math.floor(512.0 * v / maxiterations);
        if (v > 255) v = 255;
        return [v, v, v];
    },

    grayscale2: function (maxiterations, n) {
        let v = map(n, 0, maxiterations, 0, 255);
        return [v, v, v];
    },

    hsv: function (maxiterations, n, re, img) {
        if (n == maxiterations)
            return [0, 0, 0];

        var v = smoothColor(n, re, img);
        var c = hsv_to_rgb(360.0 * v / maxiterations, 1.0, 10.0 * v / maxiterations);

        var t = c[0];
        c[0] = c[2];
        c[2] = t;

        return c;
    }
}

var currentColor = colors.grayscale1;

function zoomin(e) {
    if (zoomlvl >= (1 / 549755813888)) {
        let x = e.clientX;
        let y = e.clientY;

        let f = Math.sqrt(0.001 + 2.0 * Math.min(Math.abs(xrange[0] - xrange[1]), Math.abs(yrange[0] - yrange[1])));
        maxiterations = Math.floor(223.0 / f);

        let xr = map(x, 0, width, xrange[0], xrange[1]);
        let yr = map(y, 0, height, yrange[0], yrange[1]);

        lookingAt.x = xr; lookingAt.y = yr;

        zoomlvl *= 0.5;

        xrange[0] = (xr - zoomlvl / 2);
        xrange[1] = (xr + zoomlvl / 2);

        let d = Math.abs(xrange[0] - xrange[1]);
        yrange[0] = yr - ((d / ratio) / 2);
        yrange[1] = yr + ((d / ratio) / 2);

        draw(xrange, yrange);

        isDrawing = false;
        updateData(xrange, yrange, zoomlvl, lookingAt);
    }
}

function zoomout(e) {
    if (zoomlvl < 1 / 0.125) {
        let x = e.clientX;
        let y = e.clientY;

        zoomlvl /= 0.5;

        let f = Math.sqrt(0.001 + 2.0 * Math.min(Math.abs(xrange[0] - xrange[1]), Math.abs(yrange[0] - yrange[1])));
        maxiterations = Math.floor(223.0 / f);

        let xr = map(x, 0, width, xrange[0], xrange[1]);
        let yr = map(y, 0, height, yrange[0], yrange[1]);

        lookingAt.x = xr; lookingAt.y = yr;

        xrange[0] = (xr - zoomlvl / 2);
        xrange[1] = (xr + zoomlvl / 2);

        let d = Math.abs(xrange[0] - xrange[1]);
        yrange[0] = yr - ((d / ratio) / 2);
        yrange[1] = yr + ((d / ratio) / 2);

        draw(xrange, yrange);
        updateData(xrange, yrange, zoomlvl, lookingAt);
    }
}

function mandelbrot(real, imag) {
    let zreal = real;
    let zimag = imag;

    for (let i = 0; i < maxiterations; ++i) {
        let r2 = zreal * zreal;
        let i2 = zimag * zimag;

        if (r2 + i2 > 4) return [i, r2, i2];

        zimag = 2 * zreal * zimag + imag;
        zreal = r2 - i2 + real;
    }
    return [maxiterations, zreal, zimag];
}

function draw(xrange, yrange) {
    let pix = 0;
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            let x = map(j, 0, width, xrange[0], xrange[1]);
            let y = map(i, 0, height, yrange[0], yrange[1]);

            let n = mandelbrot(x, y);

            let color = currentColor(maxiterations, n[0], n[1], n[2]);

            imgData.data[pix++] = color[0];
            imgData.data[pix++] = color[1];
            imgData.data[pix++] = color[2];
            imgData.data[pix++] = 255;
        }
    }

    ctx.putImageData(imgData, 0, 0);
}

function updateData(xrange, yrange, zoom, lookingAt) {
    document.getElementById('xinterval').innerHTML = `X Interval: [${xrange[0]}, ${xrange[1]}]`;
    document.getElementById('yinterval').innerHTML = `Y Interval: [${yrange[0]}, ${yrange[1]}]`;
    document.getElementById('zoom').innerHTML = `Zoom: ${1 / zoom}`;
    document.getElementById('iterations').innerHTML = `Iterations: ${maxiterations}`;
    document.getElementById('lookingat').innerHTML = `Looking at: (${lookingAt.x}, ${lookingAt.y})`;

    updateUrlParams(xrange, yrange, zoom);
}

function updateUrlParams(xrange, yrange, zoom) {
    urlParams.set('zoom', 1 / zoom);
    urlParams.set('xrange', xrange);
    urlParams.set('yrange', yrange);
    window.history.pushState('', '', '?' + urlParams);
}

function readUrlParams() {
    if (!window.location.search.includes('?')) {
        return false;
    }
    else {
        xrange[0] = parseFloat(urlParams.get('xrange').split(',')[0]);
        xrange[1] = parseFloat(urlParams.get('xrange').split(',')[1]);
        yrange[0] = parseFloat(urlParams.get('yrange').split(',')[0]);
        yrange[1] = parseFloat(urlParams.get('yrange').split(',')[1]);
        zoomlvl = 1 / parseFloat(urlParams.get('zoom'));
        return true;
    }
}

init(true);