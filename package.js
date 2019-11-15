/* eslint-env meteor */
Package.describe({
  name: 'leaonline:ddp-login-handler',
  version: '1.0.2',
  // Brief, one-line summary of the package.
  summary: 'Authenticate a remote DDP connect using an accessToken and an OAuth service',
  // URL to the Git repository containing the source code for this package.
  git: 'git@github.com:leaonline/ddp-login-handler.git',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
})

Package.onUse(function (api) {
  api.versionsFrom('1.8.1')
  api.use('ecmascript')
  api.use('http')
  api.mainModule('ddp-login-handler.js')
})

Package.onTest(function (api) {
  api.use('ecmascript')
  api.use('tinytest')
  api.use('leaonline:ddp-login-handler')
  api.mainModule('ddp-login-handler-tests.js')
})
