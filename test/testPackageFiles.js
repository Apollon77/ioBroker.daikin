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

        if (!expect(ioPackage.common.version).to.exist) {
            console.log('ERROR: Version number in io-package.json missing');
            console.log();
        }
        if (!expect(npmPackage.version).to.exist) {
            console.log('ERROR: Version number in package.json missing');
            console.log();
        }

        if (!expect(ioPackage.common.version).to.be.equal(npmPackage.version)) {
            console.log('ERROR: Version numbers in package.json and io-package.json differ!!');
            console.log();
        }

        if (!ioPackage.common.news || !ioPackage.common.news[ioPackage.common.version]) {
            console.log('WARNING: No news entry for current version exists in io-package.json, no rollback in Admin possible!');
            console.log();
        }

        if (!expect(npmPackage.common.author).to.exist) {
            console.log('ERROR: Author in package.json missing');
            console.log();
        }
        if (!expect(ioPackage.common.authors).to.exist) {
            console.log('ERROR: Authors in io-package.json missing');
            console.log();
        }
        if (ioPackage.common.name.indexOf('template') !== 0) {
            if (Array.isArray(ioPackage.common.authors)) {
                expect(ioPackage.common.authors.length).to.not.be.equal(0);
                if (ioPackage.common.authors.length === 1) {
                    if (!expect(ioPackage.common.authors[0]).to.not.be.equal('my Name <my@email.com>')) {
                        console.log('ERROR: Author in io-package.json needs to be a real name');
                        console.log();
                    }
                }
            }
            else {
                if (expect(ioPackage.common.authors).to.not.be.equal('my Name <my@email.com>')) {
                    console.log('ERROR: Author in io-package.json needs to be a real name');
                    console.log();
                }
            }
        }
        else {
            console.log('Testing for set authors field in io-package skipped because template adapter');
            console.log();
        }
        if (!expect(fs.existsSync(__dirname + '/../README.md')).to.be.true) {
            console.log('No README.md exists! Please create one with description, detail information and changelog. English is mandatory.');
            console.log();
        }
        if (!expect(fs.existsSync(__dirname + '/../LICENSE')).to.be.true) {
            console.log('No LICENSE exists! Please create one.');
            console.log();
        }
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
