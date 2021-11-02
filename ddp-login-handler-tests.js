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

describe('defaults', function () {
  it('has a default login name', function () {
    expect(defaultDDPLoginName).to.equal('loginWithLea')
  })
})

describe(getOAuthDDPLoginHandler.name, function () {
  it('requires an identityUrl', function () {
    expect(() => getOAuthDDPLoginHandler({}))
      .to.throw('Match error: Expected string, got undefined in field identityUrl')
  })
  it('requires an httpGet handler', function () {
    expect(() => getOAuthDDPLoginHandler({ identityUrl: id() }))
      .to.throw('Match error: Expected function, got undefined in field httpGet')
  })
  it('requires a serviceName', function () {
    expect(() => getOAuthDDPLoginHandler({
      identityUrl: id(),
      httpGet: () => {},
      serviceName: null
    }))
      .to.throw('Match error: Expected string, got null in field serviceName')
  })
  it('requires a tokenName', function () {
    expect(() => getOAuthDDPLoginHandler({
      identityUrl: id(),
      httpGet: () => {},
      tokenName: null
    }))
      .to.throw('Match error: Expected string, got null in field tokenName')
  })
  it('requires a dataField', function () {
    expect(() => getOAuthDDPLoginHandler({
      identityUrl: id(),
      httpGet: () => {},
      dataField: null
    }))
      .to.throw('Match error: Expected string, got null in field dataField')
  })
  it('requires a debug function', function () {
    expect(() => getOAuthDDPLoginHandler({
      identityUrl: id(),
      httpGet: () => {},
      debug: null
    }))
      .to.throw('Match error: Expected function, got null in field debug')
  })
  it('skips other login services', function () {
    const login = getOAuthDDPLoginHandler({
      identityUrl: id(),
      httpGet: () => {}
    })

    expect(login()).to.equal(undefined)
    expect(login({})).to.equal(undefined)
    expect(login({ lea: true })).to.equal(undefined)
    expect(login({ accessToken: id() })).to.equal(undefined)
  })
  it('throws if there is no id in the identity URL response', function () {
    const identityUrl = '/' + id()
    const accessToken = id()
    const login = getOAuthDDPLoginHandler({
      identityUrl: identityUrl,
      httpGet: () => {
        return {}
      }
    })

    expect(() => login({ lea: true, accessToken }))
      .to.throw('Invalid data result. Expected id, got <undefined> value.')
  })
  it('throws if there is no user in the identity URL response', function () {
    const identityUrl = '/' + id()
    const accessToken = id()
    const login = getOAuthDDPLoginHandler({
      identityUrl: identityUrl,
      httpGet: () => {
        return {
          data: { id: id() }
        }
      }
    })

    expect(() => login({
      lea: true,
      accessToken
    })).to.throw('Invalid data result. Expected one of login, username or email, got <undefined> value.')
  })
  it('adds a new user if it does not yet exist', function () {
    let httpGetCalled = false
    const identityUrl = '/' + id()
    const accessToken = id()
    const userId = Random.id()
    const data = { id: id(), login: id() }
    const login = getOAuthDDPLoginHandler({
      identityUrl: identityUrl,
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

    let insertCalled = false
    sinon.stub(Meteor.users, 'insert').callsFake(insertDoc => {
      expect(insertDoc.services).to.deep.equal({
        lea: {
          id: data.id,
          accessToken: accessToken,
          username: data.login
        }
      })
      insertCalled = true
      return userId
    })

    sinon.stub(Meteor.users, 'findOne').callsFake(_id => {
      if (_id === userId) return { _id: userId }
    })

    const result = login({ lea: true, accessToken })
    expect(result).to.deep.equal({ userId })
    expect(httpGetCalled).to.equal(true)
    expect(insertCalled).to.equal(true)
    sinon.restore()
  })
  it('updates an existing user', function () {
    let httpGetCalled = false
    const identityUrl = '/' + id()
    const accessToken = id()
    const userId = Random.id()
    const data = { id: id(), login: id() }
    const login = getOAuthDDPLoginHandler({
      identityUrl: identityUrl,
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

    sinon.stub(Meteor.users, 'findOne').callsFake(query => {
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

    let updateCalled = false
    sinon.stub(Meteor.users, 'update').callsFake((query, updateDoc) => {
      expect(query).to.equal(userId)
      // refreshes the access token
      expect(updateDoc.$set['services.lea.accessToken']).to.equal(accessToken)
      // refreshes username
      expect(updateDoc.$set['services.lea.username']).to.equal(data.login)

      updateCalled = true
      return userId
    })

    const result = login({ lea: true, accessToken })
    expect(result).to.deep.equal({ userId })
    expect(httpGetCalled).to.equal(true)
    expect(updateCalled).to.equal(true)
    sinon.restore()
  })
})
