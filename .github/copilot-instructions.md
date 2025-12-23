# ioBroker.daikin
This is an ioBroker adapter for Daikin air conditioners written in JavaScript/Node.js. It connects to Daikin WiFi controllers via local network API to monitor and control air conditioning units. The adapter is designed for the ioBroker home automation platform and follows standard ioBroker adapter development patterns.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Initial Setup
- Node.js 18+ is required (package.json specifies >=18, tested with v20.19.5)
- `npm install` -- NEVER CANCEL. Takes 5-8 seconds for fresh install, ~1 second for incremental updates
- Set timeout to 30+ seconds for npm install operations

### Build and Test Process
- `npm run lint` -- Takes ~5 seconds. Uses ESLint with @iobroker/eslint-config. NEVER CANCEL.
- `npm test` -- NEVER CANCEL. Takes 90-120 seconds. Uses Mocha with nyc coverage and ioBroker test framework. Set timeout to 180+ seconds.
- `npm run translate` -- Updates translation files for admin interface
- `npm run release` -- Uses @alcalzone/release-script for automated releases

### Development Server (Admin UI Testing)
- `npx dev-server setup` -- NEVER CANCEL. Takes 45-60 seconds. Sets up local ioBroker instance in .dev-server/ directory
- `npx dev-server run` -- Start dev server for Admin UI testing with hot-reload (adapter doesn't run)
- `npx dev-server watch` -- Start dev server with adapter in watch mode (auto-restart on changes)
- `npx dev-server debug` -- Start dev server with adapter in debug mode (for debugger attachment)
- Admin UI available at http://localhost:8081 when dev-server is running

## Validation Requirements

### Pre-commit Validation
- ALWAYS run `npm run lint` before committing changes or CI will fail
- ALWAYS run `npm test` to ensure adapter functionality works correctly
- Test coverage is generated automatically via nyc in .nyc_output/ and coverage/ directories

### Manual Testing Scenarios
- Configure a test instance with an actual Daikin device IP or mock server
- Verify adapter starts successfully and connects to device
- Test state changes for temperature, mode, fan settings
- Verify error handling when device is unreachable
- Check admin UI renders correctly and saves configuration

### CI Validation
- GitHub workflow (.github/workflows/test-and-release.yml) runs on push/PR
- Tests run on Node.js 18.x, 20.x, 22.x, 24.x across Ubuntu, Windows, macOS
- Linting must pass before tests run
- Deployment only occurs on tagged releases

## Key Code Locations

### Core Adapter Files
- `daikin.js` -- Main adapter implementation (33KB, ~800 lines)
- `io-package.json` -- Adapter metadata, configuration schema, and ioBroker integration
- `package.json` -- Node.js dependencies and npm scripts

### Admin Interface
- `admin/index.html` -- Legacy admin interface (still supported)
- `admin/jsonConfig.json5` -- Modern JSON-based admin configuration
- `admin/i18n/` -- Translation files for multiple languages
- `admin/words.js` -- Word translations for legacy admin

### Test Infrastructure
- `test/testAdapter.js` -- Main adapter functionality tests with mock HTTP server
- `test/testPackageFiles.js` -- Package validation tests
- `test/lib/setup.js` -- ioBroker test framework setup (installs temporary js-controller)
- `test/mocha.setup.js` -- Mocha configuration
- `.mocharc.json` -- Mocha options file

### Configuration Files
- `eslint.config.mjs` -- ESLint configuration using @iobroker/eslint-config
- `prettier.config.mjs` -- Code formatting configuration
- `.gitignore` -- Excludes tmp/, .dev-server/, node_modules/, coverage/

## Common Development Tasks

### Adding New Device Features
- Modify field definitions in `daikin.js` around line 47+ (fieldDef object)
- Update state handling in the storeDaikinData() function
- Add corresponding admin UI fields in `admin/jsonConfig.json5`
- Update translations in `admin/i18n/` directories

### Debugging Adapter Issues
- Use `npx dev-server debug` to run adapter with debugger support
- Check adapter logs in ioBroker admin or console output
- Verify network connectivity to Daikin device
- Review daikin-controller library documentation for API changes

### Modifying Admin Interface
- Edit `admin/jsonConfig.json5` for modern JSON-based configuration
- Update `admin/index.html` and `admin/words.js` for legacy interface
- Run `npm run translate` to update translation files
- Test changes with `npx dev-server run` for hot-reload

### Release Process
- Update version in both `package.json` and `io-package.json` (must match)
- Add changelog entry to `io-package.json` news section
- Run `npm run release` to create automated release
- CI will automatically publish to npm and create GitHub release on tag push

## Dependencies and Architecture

### Core Dependencies
- `@iobroker/adapter-core` -- ioBroker adapter framework
- `daikin-controller` -- Library for communicating with Daikin devices via HTTP API

### Development Dependencies
- `@iobroker/testing` -- ioBroker-specific test framework
- `@iobroker/dev-server` -- Local development environment
- `@iobroker/eslint-config` -- Standardized linting rules
- `nyc` and `mocha` -- Test runner and coverage tools

### ioBroker Integration
- Adapter runs as daemon process managed by ioBroker js-controller
- Uses Redis-based state and object databases for data persistence
- Supports both legacy Admin3 and modern JSON-based configuration
- Implements Sentry error reporting for production monitoring

## Known Issues and Workarounds
- Admin3 support warning in tests is expected (legacy admin still works)
- Test suite uses mock HTTP server on localhost:8080 for device simulation
- Some npm audit warnings are from legacy dependencies (not blocking)
- Temporary files created in tmp/ directory during testing (automatically cleaned)

## Performance Characteristics
- npm install: 5-8 seconds (fresh), 1-2 seconds (incremental)
- Linting: ~5 seconds 
- Test suite: 90-120 seconds (includes full ioBroker setup and teardown)
- Dev-server setup: 45-60 seconds (one-time per profile)
- Memory usage: ~30-35MB per adapter instance
- Polling interval: Default 300 seconds (configurable 10-3600s)