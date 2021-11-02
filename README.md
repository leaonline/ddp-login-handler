# Meteor DDP Login Handler

[![Test suite](https://github.com/leaonline/ddp-login-handler/actions/workflows/tests.yml/badge.svg)](https://github.com/leaonline/ddp-login-handler/actions/workflows/tests.yml)
[![CodeQL](https://github.com/leaonline/ddp-login-handler/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/leaonline/ddp-login-handler/actions/workflows/codeql-analysis.yml)
[![built with Meteor](https://img.shields.io/badge/Meteor-package-green?logo=meteor&logoColor=white)](https://meteor.com)
![GitHub](https://img.shields.io/github/license/leaonline/ddp-login-handler)

Authenticate a remote DDP connect using an accessToken and a custom OAuth2 
service.

This allows to make calls via DDP connection in behalf of a user, that is
registered on a remote Accounts server.

## Usage

The handler needs to make a call to your OAuth2 server's identity URL (the one
that is used to retrieve user credentials **after** the workflow has completed
successfully).

If the OAuth2 server responds with data (ususally an `id` and `login` or 
`username` field) it will add the user to the users collection and also sets the
DDP session's user to it.

**Example setup:** 

```js
/* global ServiceConfiguration */
import { Meteor } from 'meteor/meteor'
import { Accounts } from 'meteor/accounts-base'
import { HTTP } from 'meteor/http'
import {
  defaultDDPLoginName,
  getOAuthDDPLoginHandler
} from 'meteor/leaonline:ddp-login-handler'

Meteor.startup(() => {
  setupOAuth()
})

function setupOAuth () {
  const { oauth } = Meteor.settings
  
  ServiceConfiguration.configurations.upsert(
    { service: 'lea' },
    {
      $set: {
        loginStyle: 'popup',
        clientId: oauth.clientId,
        secret: oauth.secret,
        dialogUrl: oauth.dialogUrl,
        accessTokenUrl: oauth.accessTokenUrl,
        identityUrl: oauth.identityUrl,
        redirectUrl: oauth.redirectUrl
      }
    }
  )

  const loginHandler = getOAuthDDPLoginHandler({
    identityUrl: oauth.identityUrl,
    httpGet: (url, requestOptions) => HTTP.get(url, requestOptions),
    debug: console.debug
  })

  Accounts.registerLoginHandler(defaultDDPLoginName, loginHandler)
}
```

## Development, running tests

To run the tests you can use the following line on your terminal:

```bash
$ TEST_WATCH=1 TEST_CLIENT=0 meteor test-packages ./ --driver-package meteortesting:mocha
```

## LICENSE

MIT, see [LICENSE](./LICENSE) file
