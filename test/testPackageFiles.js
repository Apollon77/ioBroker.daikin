/* jshint -W097 */
/* jshint strict:false */
/* jslint node: true */
/* jshint expr: true */
var expect = require('chai').expect;
var fs        = require('fs');

describe('Test package.json and io-package.json', function() {
    it('Test package files', function (done) {
        var fileContentIOPackage = fs.readFileSync(__dirname + '/../io-package.json', 'utf8');
        var ioPackage = JSON.parse(fileContentIOPackage);

        var fileContentNPMPackage = fs.readFileSync(__dirname + '/../package.json', 'utf8');
        var npmPackage = JSON.parse(fileContentNPMPackage);

        expect(ioPackage).to.be.an('object');
        expect(npmPackage).to.be.an('object');

        expect(ioPackage.common.version, 'Version number in io-package.json needs to exist').to.exist;
        expect(npmPackage.version, 'Version number in package.json needs to exist').to.exist;

        expect(ioPackage.common.version, 'Version numbers in package.json and io-package.json needs to match').to.be.equal(npmPackage.version);

        if (!ioPackage.common.news || !ioPackage.common.news[ioPackage.common.version]) {
            console.log('WARNING: No news entry for current version exists in io-package.json, no rollback in Admin possible!');
            console.log();
        }

        expect(npmPackage.author, 'Author in package.json needs to exist').to.exist;
        expect(ioPackage.common.authors, 'Authors in io-package.json needs to exist').to.exist;

        if (ioPackage.common.name.indexOf('template') !== 0) {
            if (Array.isArray(ioPackage.common.authors)) {
                expect(ioPackage.common.authors.length, 'Author in io-package.json needs to be set').to.not.be.equal(0);
                if (ioPackage.common.authors.length === 1) {
                    expect(ioPackage.common.authors[0], 'Author in io-package.json needs to be a real name').to.not.be.equal('my Name <my@email.com>');
                }
            }
            else {
                expect(ioPackage.common.authors, 'Author in io-package.json needs to be a real name').to.not.be.equal('my Name <my@email.com>');
            }
        }
        else {
            console.log('Testing for set authors field in io-package skipped because template adapter');
            console.log();
        }
        expect(fs.existsSync(__dirname + '/../README.md'), 'README.md needs to exist! Please create one with description, detail information and changelog. English is mandatory.').to.be.true;
        expect(fs.existsSync(__dirname + '/../LICENSE'), 'LICENSE needs to exist! Please create one.').to.be.true;
        if (!ioPackage.common.titleLang || typeof ioPackage.common.titleLang !== 'object') {
            console.log('titleLang is not existing in io-package.json');
            console.log();
        }
        if (
            ioPackage.common.title.indexOf('iobroker') !== -1 ||
            ioPackage.common.title.indexOf('ioBroker') !== -1 ||
            ioPackage.common.title.indexOf('adapter') !== -1 ||
            ioPackage.common.title.indexOf('Adapter') !== -1
        ) {
            console.log('title contains Adapter or ioBroker. It is clear anyway, that it is adapter for ioBroker.');
            console.log();
        }
        done();
    });
});
