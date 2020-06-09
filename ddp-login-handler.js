import { Accounts } from 'meteor/accounts-base'
import { Meteor } from 'meteor/meteor'
import { HTTP } from 'meteor/http'

let userAgent = 'Meteor'
if (Meteor.release) {
  userAgent += `/${Meteor.release}`
}

/**
 * Registers a login handler, that allows to authenticate a user by her accessToken, that
 * she received from a previous OAuth request.
 * Requires a valid and OAuth endpoint that validates
 * the accessToken.
 *
 * @param name {String} Name of the service, defaults to 'loginWithLea'
 * @param identityUrl {String} The url which checks the accessToken and returns the user identity or throws an error.
 */
export const registerOAuthDDPLoginHandler = ({ name = 'loginWithLea', identityUrl }) => {
  Accounts.registerLoginHandler(name, function (options) {
    // if the service request does not contain an accessToken or
    // lea as truthy value, we just skip processing instead of throwing
    if (!options || !options.lea || !options.accessToken) return

    const { accessToken } = options

    const requestOptions = {
      headers: {
        Accept: 'application/json',
        'User-Agent': userAgent,
        Authorization: `Bearer ${accessToken}`
      }
    }

    const response = HTTP.get(identityUrl, requestOptions)

    // we make a simple structural response validation
    const { data } = response
    if (typeof data.id !== 'string') {
      console.info(`[Accounts.loginWithLea]: data=`, data)
      throw new Error(`Unacceptable data result. Expected id, got <${data.id}> value.`)
    }

    // XXX: depending on config this can be one of the following
    const username = data.login || data.username || data.email

    let userDoc = Meteor.users.findOne({ 'services.lea.id': data.id })
    if (!userDoc) {
      const userId = Meteor.users.insert({
        createdAt: new Date(),
        services: {
          lea: {
            id: data.id,
            accessToken: accessToken,
            username: username
          }
        }
      })

      userDoc = Meteor.users.findOne(userId)
    }

    // the loginHandler is expected to
    // return a { userId } structure
    return { userId: userDoc._id }
  })
}
