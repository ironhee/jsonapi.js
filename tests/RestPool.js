import $ from 'jquery';
import { expect } from 'chai';
import sinon from 'sinon';
import _ from 'lodash';
import Q from 'q';
import promiseValue from './libs/promiseValue';
import matchJSON from './libs/matchJSON';
import stubPromise from './libs/stubPromise';
import { RestPool, Resource, RESTful } from '../index';


describe('RestPool', function () {

  var restPool;
  var syncronizer;

  beforeEach(function () {

    restPool = new RestPool([], {
      typeToUrl: {
        foo: '/api/foo/'
      }
    });
    syncronizer = {
      post: stubPromise(),
      get: stubPromise(),
      delete: stubPromise(),
      patch: stubPromise()
    };
    restPool.syncronizer = syncronizer;

  });

  describe('#create', function () {

    it('should create resource and make POST request', function () {

      syncronizer.post.withArgs('/api/foo/').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 23,
            content: 'hello world',
            links: {
              self: '/api/foo/23'
            }
          }
        })
      );

      return Q.fcall(() => {

        return restPool.create({
          type: 'foo',
          content: 'hello world'
        });

      })
      .then(resource => {

        var args = syncronizer.post.getCall(0).args;
        expect(args[0]).to.deep.equal('/api/foo/');
        expect(args[1]).to.deep.equal({
          data: {
            type: 'foo',
            content: 'hello world'
          }
        });
        expect(resource.getLink('self')).to.deep.equal('/api/foo/23');
        expect(resource.id).to.deep.equal(23);

      });

    });

  });

  describe('#patch', function () {

    it('should patch resource and make PATCH request', function () {

      syncronizer.patch.withArgs('/api/foo/23').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 23,
            content: 'hello world',
            links: {
              self: '/api/foo/23'
            }
          }
        })
      );

      return Q.fcall(() => {
        return new Resource({
          type: 'foo',
          id: 23,
          content: 'hello world',
          links: {
            self: '/api/foo/23'
          }
        });
      })
      .then((foo) => {
        return restPool.patch(foo, 'content', 'wow');
      })
      .then(resource => {
        var args = syncronizer.patch.getCall(0).args;
        expect(args[0]).to.deep.equal('/api/foo/23');
        expect(args[1]).to.deep.equal({
          data: {
            type: 'foo',
            id: 23,
            content: 'wow',
            links: {
              self: '/api/foo/23'
            }
          }
        });
        expect(resource.get('content')).to.deep.equal('wow');
      });

    });

  });

  describe('#remove', function () {

    it('should remove resource and make DELETE request', function () {

      return Q.fcall(() => {
        return new Resource({
          type: 'foo',
          id: 23,
          content: 'hello world',
          links: {
            self: '/api/foo/23'
          }
        });
      })
      .then((foo) => {
        return restPool.remove(foo);
      })
      .then(resource => {
        var args = syncronizer.delete.getCall(0).args;
        expect(args[0]).to.deep.equal('/api/foo/23');
      });

    });

  });

  describe('#get', function () {

    it('should get resource and make GET request', function () {

      syncronizer.get.withArgs('/api/foo/23').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 23,
            content: 'hello world',
            links: {
              self: '/api/foo/23'
            }
          }
        })
      );

      return Q.fcall(() => {
        return restPool.get('/api/foo/23');
      })
      .then(resource => {
        var args = syncronizer.get.getCall(0).args;
        expect(args[0]).to.deep.equal('/api/foo/23');
        expect(resource.toJSON()).to.deep.equal({
          type: 'foo',
          id: 23,
          content: 'hello world'
        });
      });

    });

    it('should get multiple resource and make GET request', function () {

      syncronizer.get.withArgs('/api/foo/').returns(
        promiseValue({
          data: [{
            type: 'foo',
            id: 23,
            content: 'hello world',
            links: {
              self: '/api/foo/23'
            }
          }]
        })
      );

      return Q.fcall(() => {
        return restPool.get('/api/foo/');
      })
      .then(resources => {
        var args = syncronizer.get.getCall(0).args;
        expect(args[0]).to.deep.equal('/api/foo/');
        expect(resources).to.have.length(1);
        expect(resources[0].toJSON()).to.deep.equal({
          type: 'foo',
          id: 23,
          content: 'hello world'
        });
      });

    });

    it('should get resource with params and make GET request', function () {

      syncronizer.get.withArgs('/api/foo/', {
        'filter[state]': 'normal'
      })
      .returns(
        promiseValue({
          data: [{
            type: 'foo',
            state: 'normal',
            id: 23,
            content: 'hello world',
            links: {
              self: '/api/foo/23'
            }
          }]
        })
      );

      return Q.fcall(() => {
        return restPool.get('/api/foo/', {
          'filter[state]': 'normal'
        });
      })
      .then(resources => {
        var args = syncronizer.get.getCall(0).args;
        expect(args[0]).to.deep.equal('/api/foo/');
        expect(resources).to.have.length(1);
        expect(resources[0].toJSON()).to.deep.equal({
          type: 'foo',
          id: 23,
          state: 'normal',
          content: 'hello world'
        });
      });

    });

  });

  describe('#getURL', function () {

    it('should return url of resource', function () {

      return Q.fcall(function () {
        expect(restPool.getURL('foo')).to.equal('/api/foo/');
        expect(restPool.getURL('foo', 1)).to.equal('/api/foo/1');
      });

    });

  });

});
