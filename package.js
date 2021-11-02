/* eslint-env meteor */
Package.describe({
  name: 'leaonline:ddp-login-handler',
  version: '2.0.0',
  // Brief, one-line summary of the package.
  summary: 'Authenticate a remote DDP connect using an accessToken and an OAuth service',
  // URL to the Git repository containing the source code for this package.
  git: 'git@github.com:leaonline/ddp-login-handler.git',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
})

Package.onUse(function (api) {
  api.versionsFrom(['1.6', '2.3'])
  api.use('ecmascript')
  api.mainModule('ddp-login-handler.js')
})

Package.onTest(function (api) {
  Npm.depends({
    chai: '4.2.0',
    sinon: '11.1.2'
  })
  api.use('ecmascript')
  api.use('accounts-base@2.0.0')
  api.use('http@2.0.0')
  api.use('meteortesting:mocha')
  api.use('leaonline:ddp-login-handler')
  api.mainModule('ddp-login-handler-tests.js')
})
