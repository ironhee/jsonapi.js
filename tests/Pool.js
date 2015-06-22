import { expect } from 'chai';
import Q from 'q';
import stubPromise from './libs/stubPromise';
import promiseValue from './libs/promiseValue';
import { Pool } from '../';


describe('Pool', () => {
  let pool;
  let sync;
  let OriginSync;

  before(() => {
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

  after(() => {
    pool.sync = OriginSync;
  });

  beforeEach(() => {
    pool.resetAll();
    sync.get.reset();
    sync.post.reset();
    sync.patch.reset();
    sync.delete.reset();
  });

  describe('#reset', () => {
    it('should reset it\'s state', () => {
      // FIXME: Implement this parts
    });
  });

  describe('#fetch', () => {
    it('should fetch remote resource', () => {
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

      return Q.fcall(() => pool.fetch('foo', 1))
      .then(() => {
        let resource = pool.get('foo', 1);
        expect(resource.serialize()).to.deep.equal({
          type: 'foo',
          id: 1,
          content: 'hello world',
          links: {
            self: '/foo/1'
          }
        });
      });
    });

    it('should fetch multiple remote resource', () => {
      sync.get.withArgs('/foo/').returns(
        promiseValue({
          data: [{
            type: 'foo',
            id: 1,
            content: 'hello world',
            links: {
              self: '/foo/1'
            }
          }]
        })
      );

      pool.addRemote('foo', '/foo/');

      return Q.fcall(() => pool.fetch('foo'))
      .then(() => {
        let resource = pool.get('foo', 1);
        expect(resource.serialize()).to.deep.equal({
          type: 'foo',
          id: 1,
          content: 'hello world',
          links: {
            self: '/foo/1'
          }
        });
      });
    });

    it('should handle included resource', () => {
      sync.get.withArgs('/foo/').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 1,
            links: {
              self: '/foo/1',
              barlink: {
                linkage: {
                  type: 'bar',
                  id: 2
                },
                related: '/foo/1/bar'
              }
            }
          },
          included: [{
            type: 'bar',
            id: 2,
            links: {
              self: '/bar/2'
            }
          }]
        })
      );

      pool.addRemote('foo', '/foo/');

      return Q.fcall(() => pool.fetch('foo', undefined, {
        included: ['bar']
      }))
      .then(() => {
        let resource = pool.get('bar', 2);
        expect(resource.serialize()).to.deep.equal({
          type: 'bar',
          id: 2,
          links: {
            self: '/bar/2'
          }
        });
      });
    });
  });

  describe('#create', () => {
    it('should create resource', () => {
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

      pool.addRemote('foo', '/foo/');

      return Q.fcall(() => pool.create('foo', {
        content: 'bar'
      }))
      .then(resource => {
        expect(resource.serialize()).to.deep.equal({
          type: 'foo',
          id: 1,
          content: 'test',
          links: {
            self: '/foo/1'
          }
        });
        expect(pool.get(resource.type, resource.id)).to.equal(resource);
      });
    });
  });

  describe('#remove', () => {
    it('should remove resource', () => {
      sync.delete.withArgs('/foo/1').returns(
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

      pool.addRemote('foo', '/foo/');

      return Q.fcall(() => pool.create('foo', {
        type: 'foo',
        id: 1,
        content: 'bar'
      }, { sync: false }))
      .then(resource => pool.remove(resource.type, resource.id))
      .then(resource => {
        expect(pool.get(resource.type, resource.id)).to.not.ok;
        let deleteCall = sync.delete.getCall(0);
        expect(deleteCall).to.be.ok;
        expect(deleteCall.args[0]).to.equal('/foo/1');
      });
    });
  });

  describe('#update', () => {
    it('should update resource', () => {
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

      pool.addRemote('foo', '/foo/');

      return Q.fcall(() => pool.create('foo', {
        type: 'foo',
        id: 1,
        content: 'bar'
      }, { sync: false }))
      .then(resource => pool.update(resource.type, resource.id, {
        content: 'test'
      }))
      .then(() => {
        let resource = pool.get('foo', 1);
        expect(resource.serialize()).to.deep.equal({
          type: 'foo',
          id: 1,
          content: 'test',
          links: {
            self: '/foo/1'
          }
        });
        let patchCall = sync.patch.getCall(0);
        expect(patchCall).to.be.ok;
        expect(patchCall.args[0]).to.equal('/foo/1');
      });
    });
  });

  describe('#createLinkage', () => {
    it('should create not hasMany linkage', () => {
      sync.post.withArgs('/test/1/links/bar').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 1
          }
        })
      );

      pool.addRemote('test', '/test/');

      let linkage = {
        type: 'bar',
        id: 1
      };

      return Q.fcall(() => pool.createLinkage(
        'test', 1, 'bar', linkage, { hasMany: false }
      ))
      .then(() => {
        let postCall = sync.post.getCall(0);
        expect(postCall).to.be.ok;
        expect(postCall.args[0]).to.equal('/test/1/links/bar');
        expect(postCall.args[1]).to.deep.equal({
          data: {
            type: 'bar',
            id: 1
          }
        });
      });
    });

    it('should create hasMany linkage', () => {
      sync.post.withArgs('/test/1/links/bar').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 1
          }
        })
      );

      pool.addRemote('test', '/test/');

      let linkage = {
        type: 'bar',
        id: 1
      };

      return Q.fcall(() => pool.createLinkage(
        'test', 1, 'bar', linkage, { hasMany: true }
      ))
      .then(() => {
        let postCall = sync.post.getCall(0);
        expect(postCall).to.be.ok;
        expect(postCall.args[0]).to.equal('/test/1/links/bar');
        expect(postCall.args[1]).to.deep.equal({
          data: [{
            type: 'bar',
            id: 1
          }]
        });
      });
    });
  });

  describe('#rmLinkage', () => {
    it('should remove not hasMany linkage to pool', () => {
      sync.delete.withArgs('/test/1/links/bar').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 1
          }
        })
      );

      pool.addRemote('test', '/test/');

      let linkage = {
        type: 'bar',
        id: 1
      };

      return Q.fcall(() => pool.removeLinkage(
        'test', 1, 'bar', linkage, { hasMany: false }
      ))
      .then(() => {
        let deleteCall = sync.delete.getCall(0);
        expect(deleteCall).to.be.ok;
        expect(deleteCall.args[0]).to.equal('/test/1/links/bar');
        expect(deleteCall.args[1]).to.deep.equal({
          data: {
            type: 'bar',
            id: 1
          }
        });
      });
    });

    it('should remove hasMany linkage to pool', () => {
      sync.delete.withArgs('/test/1/links/bar').returns(
        promiseValue({
          data: {
            type: 'foo',
            id: 1
          }
        })
      );

      pool.addRemote('test', '/test/');

      let linkage = {
        type: 'bar',
        id: 1
      };

      return Q.fcall(() => pool.removeLinkage(
        'test', 1, 'bar', linkage, { hasMany: true }
      ))
      .then(() => {
        let deleteCall = sync.delete.getCall(0);
        expect(deleteCall).to.be.ok;
        expect(deleteCall.args[0]).to.equal('/test/1/links/bar');
        expect(deleteCall.args[1]).to.deep.equal({
          data: [{
            type: 'bar',
            id: 1
          }]
        });
      });
    });
  });

  describe('#addRemote', () => {
    it('should add remote url', () => {
      pool.addRemote('foo', '/foo/');
      expect(pool.getRemote('foo')).to.equal('/foo/');
    });
  });

  describe('#get', () => {
    it('should get resource in pool', () => {
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

      return Q.fcall(() => pool.fetch('foo', 1))
      .then(() => {
        let resource = pool.get('foo', 1);
        expect(resource.serialize()).to.deep.equal({
          type: 'foo',
          id: 1,
          content: 'hello world',
          links: {
            self: '/foo/1'
          }
        });
        let resources = pool.get('foo');
        expect(resources.length).to.equal(1);
        expect(resources[0].serialize()).to.deep.equal({
          type: 'foo',
          id: 1,
          content: 'hello world',
          links: {
            self: '/foo/1'
          }
        });
      });
    });
  });
});
