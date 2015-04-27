import { expect } from 'chai';
import sinon from 'sinon';
import _ from 'lodash';
import Q from 'q';
import matchJSON from './libs/matchJSON';
import stubPromise from './libs/stubPromise';
import promiseValue from './libs/promiseValue';
import { Pool, Resource } from '../index';


describe('Pool', function () {

  let pool;
  let sync;
  let OriginSync;

  before(function () {

    pool = new Pool();
    sync = {
      get: stubPromise(),
      post: stubPromise(),
      patch: stubPromise(),
      delete: stubPromise()
    };
    OriginSync = pool.sync;
    pool.sync = sync;

  });

  after(function () {

    pool.sync = OriginSync;

  })

  beforeEach(function () {

    pool.resetAll();
    sync.get.reset();
    sync.post.reset();
    sync.patch.reset();
    sync.delete.reset();

  });

  describe('#reset', function () {

    it('should reset it\'s state', function () {

      // FIXME: Implement this parts

    });

  });

  describe('#add', function () {

    it('should add resource to pool', function () {

      let resource = new Resource({
        type: 'foo',
        content: 'bar'
      });

      let serialized = resource.serialize();

      pool.add(resource);

      let staged = pool.getStaged(resource);
      expect(staged).to.deep.equal(serialized);

    });

    it('should add multiple resource to pool', function () {

      let resource1 = new Resource({
        type: 'foo',
        content: 'foo'
      });

      let resource2 = new Resource({
        type: 'bar',
        content: 'bar'
      });

      let serialized1 = resource1.serialize();
      let serialized2 = resource2.serialize();

      pool.add([resource1, resource2])

      let staged1 = pool.getStaged(resource1);
      let staged2 = pool.getStaged(resource2);
      expect(staged1).to.deep.equal(serialized1);
      expect(staged2).to.deep.equal(serialized2);

    });

  });

  describe('#rm', function () {

    it('should remove resource from pool', function () {

      let resource = new Resource({
        type: 'foo',
        content: 'bar'
      });

      pool.rm(resource)
      let staged = pool.getStaged(resource);
      expect(staged).to.deep.equal(null);

    });

    it('should remove multiple resource from pool', function () {

      let resource1 = new Resource({
        type: 'foo',
        content: 'foo'
      });

      let resource2 = new Resource({
        type: 'bar',
        content: 'bar'
      });

      pool.rm([resource1, resource2]);
      let staged1 = pool.getStaged(resource1);
      let staged2 = pool.getStaged(resource2);
      expect(staged1).to.deep.equal(null);
      expect(staged2).to.deep.equal(null);

    });

  });

  describe('#commit', function () {

    it('should commit current staged files', function () {

      let resource1 = new Resource({
        type: 'foo',
        id: 1,
        content: 'foo',
        links: {
          self: '/foo/1'
        }
      });

      let resource2 = new Resource({
        type: 'bar',
        id: 2,
        content: 'bar',
        links: {
          self: '/bar/2'
        }
      });

      pool.add(resource1);
      pool.rm(resource2);

      let staged1 = pool.getStaged(resource1);
      let staged2 = pool.getStaged(resource2);

      pool.commit();
      expect(pool.commits).to.has.length(1);
      let commit = pool.commits[0];
      expect(_.values(commit)).to.has.length(1);
      expect(_.find(commit, staged1)).to.be.ok;
      expect(_.find(commit, staged2)).to.be.ok;

    })

  });

  describe('#getStaged', function () {

    it('should return staged state', function () {

      let resource1 = new Resource({
        type: 'foo',
        content: 'foo'
      });

      let resource2 = new Resource({
        type: 'bar',
        content: 'bar'
      });

      let serialized1 = resource1.serialize();

      pool.add(resource1);
      pool.rm(resource2);

      let staged1 = pool.getStaged(resource1);
      let staged2 = pool.getStaged(resource2);
      expect(staged1).to.deep.equal(serialized1);
      expect(staged2).to.deep.equal(null);

    });

  });

  describe('#addRemote', function () {

    it('should add remote url', function () {

      pool.addRemote('foo', '/foo/')

      expect(pool.getRemote('foo')).to.equal('/foo/');

    });

  });

  describe('#pull', function () {

    it('should fetch remote resource', function () {

      sync.get.withArgs('/foo/1').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 1,
            content: 'hello world',
            links: {
              self: '/foo/1'
            }
          }
        })
      );

      pool.addRemote('foo', '/foo/')

      return Q.fcall(() => pool.pull('foo', 1))
      .then(() => {
        let resource = pool.get('foo', 1);
        expect(resource.serialize()).to.deep.equal({
          type: 'foo',
          id: 1,
          content: 'hello world',
          links: {
            self: '/foo/1'
          }
        })
      })
      .then(() => {
        sync.get.withArgs('/foo/1').returns(
          promiseValue({
            data: {
              type: 'foo',
              id: 1,
              content: 'wow world',
              links: {
                self: '/foo/1'
              }
            }
          })
        );
      })
      .then(() => pool.pull('foo', 1))
      .then(() => {
        let resource = pool.get('foo', 1);
        expect(resource.serialize()).to.deep.equal({
          type: 'foo',
          id: 1,
          content: 'wow world',
          links: {
            self: '/foo/1'
          }
        })
      });

    });

  });

  describe('#get', function () {

    it('should get resource in pool', function () {

      sync.get.withArgs('/foo/1').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 1,
            content: 'hello world',
            links: {
              self: '/foo/1'
            }
          }
        })
      );

      pool.addRemote('foo', '/foo/');

      return Q.fcall(() => pool.pull('foo', 1))
      .then(() => {
        let resource = pool.get('foo', 1);
        expect(resource.serialize()).to.deep.equal({
          type: 'foo',
          id: 1,
          content: 'hello world',
          links: {
            self: '/foo/1'
          }
        })
      });

    });

  });

  describe('#push', function () {

    it('should handle POST', function () {

      sync.post.withArgs('/foo/').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 1,
            content: 'test',
            links: {
              self: '/foo/1'
            }
          }
        })
      );

      pool.addRemote('foo', '/foo/')
      pool.add(new Resource({
        type: 'foo',
        content: 'test'
      }));
      pool.commit();

      return Q.fcall(() => pool.push())
      .then(() => {
        expect(sync.post.getCall(0)).to.be.ok;
        expect(sync.post.getCall(0).args[0])
          .to.deep.equal('/foo/');
        expect(sync.post.getCall(0).args[1]).to.deep.equal({
          data: {
            type: 'foo',
            content: 'test'
          }
        });
      });

    });

    it('should handle DELETE', function () {

      sync.get.withArgs('/foo/1').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 1,
            content: 'will be deleted',
            links: {
              self: '/foo/1'
            }
          }
        })
      );

      pool.addRemote('foo', '/foo/')

      return Q.fcall(() => pool.pull('foo', 1))
      .then(resource => {
        pool.rm(resource);
        pool.commit();
      })
      .then(() => pool.push())
      .then(() => {
        expect(sync.delete.getCall(0)).to.be.ok;
        expect(sync.delete.getCall(0).args[0])
          .to.deep.equal('/foo/1');
      });

    });

    it('should handle PATCH', function () {

      sync.get.withArgs('/foo/1').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 1,
            content: 'test',
            links: {
              self: '/foo/1'
            }
          }
        })
      );

      sync.patch.withArgs('/foo/1').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 1,
            content: 'test',
            links: {
              self: '/foo/1'
            }
          }
        })
      );

      pool.addRemote('foo', '/foo/')
      return Q.fcall(() => pool.pull('foo', 1))
      .then(resource => {
        resource.set({
          'content': 'patch data'
        });
        pool.add(resource);
        pool.commit();
      })
      .then(() => pool.push())
      .then(() => {
        expect(sync.patch.getCall(0)).to.be.ok;
        expect(sync.patch.getCall(0).args[0])
          .to.deep.equal('/foo/1');
        expect(sync.patch.getCall(0).args[1]).to.deep.equal({
          data: {
            type: 'foo',
            id: 1,
            content: 'patch data',
            links: {
              self: '/foo/1'
            }
          }
        });
      });

    });

    it('should multiple commit', function () {

      sync.post.withArgs('/foo/').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 1,
            content: 'test',
            links: {
              self: '/foo/1'
            }
          }
        })
      );

      sync.patch.withArgs('/foo/1').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 1,
            content: '123',
            links: {
              self: '/foo/1'
            }
          }
        })
      );

      pool.addRemote('foo', '/foo/')

      let resource = new Resource({
        type: 'foo',
        content: 'test'
      });

      pool.add(resource);
      pool.commit();

      resource.set({
        content: '123'
      });
      pool.add(resource);
      pool.commit();

      pool.rm(resource);
      pool.commit();

      return Q.fcall(() => pool.push())
      .then(() => {
        expect(sync.post.getCall(0)).to.not.be.ok;
        expect(sync.patch.getCall(0)).to.not.be.ok;
        expect(sync.delete.getCall(0)).to.not.be.ok;
      });

    });

  });

});
