import { Accounts } from 'meteor/accounts-base'
import { Meteor } from 'meteor/meteor'
import { HTTP } from 'meteor/http'

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

    let response
    const requestOptions = {
      headers: { Accept: 'application/json', 'User-Agent': userAgent, Authorization: `Bearer ${accessToken}` },
    }

    try {
      response = HTTP.get(identityUrl, requestOptions)
    } catch (err) {
      throw new Error(`Failed to fetch identity from lea. ${err.message}`), { response: err.response }
    }

    // we make a simple structural response validation
    const { data } = response
    if ('string' !== typeof data.id) {
      throw new Error(`Unacceptable data result. Expected id, got <${data.id}> value.`)
    }
    if ('string' !== typeof data.login) {
      throw new Error(`Unacceptable data result. Expected login, got <${data.login}> value.`)
    }
    if ('string' !== typeof data.accessToken) {
      throw new Error(`Unacceptable data result. Expected accessToken, got <${data.accessToken}> value.`)
    }

    let userDoc = Meteor.users.findOne({ 'services.lea.id': data.id })
    if (!userDoc) {
      const userId = Meteor.users.insert({
        createdAt: new Date(),
        services: {
          lea: {
            id: data.id,
            accessToken: accessToken,
            username: data.login
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