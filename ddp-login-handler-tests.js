/* eslint-env mocha */
import { Meteor } from 'meteor/meteor'
import {
  defaultDDPLoginName,
  getOAuthDDPLoginHandler
} from './ddp-login-handler'
import { expect } from 'chai'
import sinon from 'sinon'
import { Random } from 'meteor/random'

let userAgent = 'Meteor'
if (Meteor.release) {
  userAgent += `/${Meteor.release}`
}

const id = (num = 6) => Random.id(num)
const expectThrow = async ({ fn, error, reason, details, message }) => {
  try {
    await fn()
    expect.fail('Expected function to throw an error')
  } catch (e) {
    if (error) expect(e.error).to.equal(error)
    if (reason) expect(e.reason).to.equal(reason)
    if (message) expect(e.message).to.equal(message)
    if (details) expect(e.message).to.deep.equal(details)
  }
}

describe('defaults', () => {
  it('has a default login name', () => {
    expect(defaultDDPLoginName).to.equal('loginWithLea')
  })
})

describe(getOAuthDDPLoginHandler.name, () => {
  afterEach(() => {
    sinon.restore()
  })

  it('requires an identityUrl', async () => {
    await expectThrow({
      fn: () => getOAuthDDPLoginHandler({}),
      message: 'Match error: Expected string, got undefined in field identityUrl'
    })
  })
  it('requires an httpGet handler', async () => {
    await expectThrow({
      fn: () => getOAuthDDPLoginHandler({ identityUrl: id() }),
      message: 'Match error: Expected function, got undefined in field httpGet'
    })
  })
  it('requires a serviceName', async () => {
    await expectThrow({
      fn: () => getOAuthDDPLoginHandler({
        identityUrl: id(),
        httpGet: () => {},
        serviceName: null
      }),
      message: 'Match error: Expected string, got null in field serviceName'
    })
  })
  it('requires a tokenName', async () => {
    await expectThrow({
      fn: () => getOAuthDDPLoginHandler({
        identityUrl: id(),
        httpGet: () => {},
        tokenName: null
      }),
      message: 'Match error: Expected string, got null in field tokenName'
    })
  })
  it('requires a dataField', async () => {
    await expectThrow({
      fn: () => getOAuthDDPLoginHandler({
        identityUrl: id(),
        httpGet: () => {},
        dataField: null
      }),
      message: 'Match error: Expected string, got null in field dataField'
    })
  })
  it('requires a debug function', async () => {
    await expectThrow({
      fn: () => getOAuthDDPLoginHandler({
        identityUrl: id(),
        httpGet: () => {},
        debug: null
      }),
      message: 'Match error: Expected function, got null in field debug'
    })
  })
  it('skips other login services', async () => {
    const login = getOAuthDDPLoginHandler({
      identityUrl: id(),
      httpGet: () => {}
    })

    expect(await login()).to.equal(undefined)
    expect(await login({})).to.equal(undefined)
    expect(await login({ lea: true })).to.equal(undefined)
    expect(await login({ accessToken: id() })).to.equal(undefined)
  })
  it('throws if there is no id in the identity URL response', async () => {
    const identityUrl = '/' + id()
    const accessToken = id()
    const login = getOAuthDDPLoginHandler({
      identityUrl,
      httpGet: () => {
        return {}
      }
    })

    await expectThrow({
      fn: () => login({ lea: true, accessToken }),
      message: 'Invalid data result. Expected id, got <undefined> value.'
    })
  })
  it('throws if there is no user in the identity URL response', async () => {
    const identityUrl = '/' + id()
    const accessToken = id()
    const login = getOAuthDDPLoginHandler({
      identityUrl,
      httpGet: () => {
        return {
          data: { id: id() }
        }
      }
    })

    await expectThrow({
      fn: () => login({
        lea: true,
        accessToken
      }),
      message: 'Invalid data result. Expected one of login, username or email, got <undefined> value.'
    })
  })
  it('adds a new user if it does not yet exist', async () => {
    let httpGetCalled = false
    const identityUrl = '/' + id()
    const accessToken = id()
    const userId = Random.id()
    const data = { id: id(), login: id() }
    const login = getOAuthDDPLoginHandler({
      identityUrl,
      httpGet: (url, options) => {
        expect(url).to.equal(identityUrl)
        expect(options).to.deep.equal({
          headers: {
            Accept: 'application/json',
            'User-Agent': userAgent,
            Authorization: `Bearer ${accessToken}`
          }
        })
        httpGetCalled = true
        return { data }
      }
    })

    const subbedInsert = sinon.stub(Meteor.users, 'insertAsync').callsFake(async insertDoc => {
      expect(insertDoc.services).to.deep.equal({
        lea: {
          id: data.id,
          accessToken,
          username: data.login
        }
      })
      return userId
    })

    const stubbedFind = sinon.stub(Meteor.users, 'findOneAsync').callsFake(async query => {
      if (typeof query === 'string' && query === userId) return { _id: userId }
    })

    const result = await login({ lea: true, accessToken })
    expect(result).to.deep.equal({ userId })
    expect(httpGetCalled).to.equal(true)
    expect(subbedInsert.callCount).to.equal(1)
    expect(stubbedFind.callCount).to.equal(2)
  })
  it('updates an existing user', async () => {
    let httpGetCalled = false
    const identityUrl = '/' + id()
    const accessToken = id()
    const userId = Random.id()
    const data = { id: id(), login: id() }
    const login = getOAuthDDPLoginHandler({
      identityUrl,
      httpGet: (url, options) => {
        expect(url).to.equal(identityUrl)
        expect(options).to.deep.equal({
          headers: {
            Accept: 'application/json',
            'User-Agent': userAgent,
            Authorization: `Bearer ${accessToken}`
          }
        })
        httpGetCalled = true
        return { data }
      }
    })

    const stubbedFind = sinon.stub(Meteor.users, 'findOneAsync').callsFake(async query => {
      if (query['services.lea.id'] === data.id) {
        return {
          _id: userId,
          services: {
            lea: {
              id: data.id,
              accessToken: id(),
              username: id()
            }
          }
        }
      }
    })

    const stubbedUpdate = sinon.stub(Meteor.users, 'updateAsync').callsFake(async (query, updateDoc) => {
      expect(query).to.equal(userId)
      // refreshes the access token
      expect(updateDoc.$set['services.lea.accessToken']).to.equal(accessToken)
      // refreshes username
      expect(updateDoc.$set['services.lea.username']).to.equal(data.login)
      return userId
    })

    const result = await login({ lea: true, accessToken })
    expect(result).to.deep.equal({ userId })
    expect(httpGetCalled).to.equal(true)
    expect(stubbedFind.calledOnce).to.equal(true)
    expect(stubbedUpdate.calledOnce).to.equal(true)
  })
})
