import { Meteor } from 'meteor/meteor'
import { check, Match } from 'meteor/check'

let userAgent = 'Meteor'
if (Meteor.release) {
  userAgent += `/${Meteor.release}`
}

const hasProp = (obj, propName) => Object.hasOwnProperty.call(obj, propName)

export const defaultDDPLoginName = 'loginWithLea'

/**
 * Returns a login handler, that allows to authenticate a user by her
 * accessToken, that she received from a previous OAuth request.
 * Requires a valid and OAuth endpoint that validates
 * the accessToken.
 *
 * Pass it to Accounts.registerLoginhandler
 *
 * @param identityUrl {String} The url which checks the accessToken and returns the user identity or throws an error.
 * @param httpGet {Function} a HTTP GET request handler, which receives the identityUrl {String} and requestoptions {Object}
 * @param serviceName {String} name of the service property on login options, defaults to {'lea'}
 * @param tokenName {String} name of the access token property on login options, defaults to {'accessToken'}
 * @param dataField {String} name of the username property on the response, defaults to {'login'}
 * @param debug {Function} a function that receives additional debug output
 */
export const getOAuthDDPLoginHandler = ({ identityUrl, httpGet, serviceName = 'lea', tokenName = 'accessToken', dataField = 'login', debug = () => {} }) => {
  check({
    identityUrl,
    httpGet,
    serviceName,
    tokenName,
    dataField,
    debug
  }, Match.ObjectIncluding({
    identityUrl: String,
    httpGet: Function,
    serviceName: String,
    tokenName: String,
    dataField: String,
    debug: Function
  }))

  const debugName = '[Accounts.loginWithLea]:'
  const callDebug = (...args) => debug(debugName, ...args)

  return async function (options = {}) {
    // if the service request does not contain an accessToken or
    // lea (defaults) as own property, we just skip processing
    // instead of throwing, because this may be another login service
    if (!hasProp(options, serviceName) || !hasProp(options, tokenName)) {
      return
    }

    const accessToken = options[tokenName]
    const requestOptions = {
      headers: {
        Accept: 'application/json',
        'User-Agent': userAgent,
        Authorization: `Bearer ${accessToken}`
      }
    }

    callDebug('start request', { identityUrl, requestOptions })

    // we make a simple structural response validation
    const response = await httpGet(identityUrl, requestOptions)
    const { data = {} } = (response ?? {})
    callDebug('response received', { data })

    // accounts services provide an id fields
    if (typeof data.id !== 'string') {
      throw new Error(`Invalid data result. Expected id, got <${data.id}> value.`)
    }

    // XXX: depending on config this can be one of the following
    const username = data[dataField] || data.username || data.email

    if (typeof username !== 'string') {
      throw new Error(`Invalid data result. Expected one of ${dataField}, username or email, got <${username}> value.`)
    }

    let userDoc = await Meteor.users.findOneAsync({ 'services.lea.id': data.id })

    // if the given user does not exist yet, we create it as a local user
    if (!userDoc) {
      callDebug('no user found; insert new user')
      const userId = await Meteor.users.insertAsync({
        createdAt: new Date(),
        services: {
          lea: {
            id: data.id,
            accessToken: accessToken,
            username: username
          }
        }
      })

      userDoc = await Meteor.users.findOneAsync(userId)

      // else update user, in case it has been changed on the accounts server
    } else {
      callDebug('update existing user', userDoc._id)
      const updateDoc = { updatedAt: new Date() }

      if (accessToken !== userDoc.services.lea.accessToken) {
        updateDoc['services.lea.accessToken'] = accessToken
      }

      if (username !== userDoc.services.lea.username) {
        updateDoc['services.lea.username'] = username
      }

      await Meteor.users.updateAsync(userDoc._id, {
        $set: updateDoc
      })
    }

    // the loginHandler is expected to
    // return a { userId } structure
    return { userId: userDoc?._id }
  }
}
