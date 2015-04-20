import _ from 'lodash';
import Q from 'q';
import ResourceProxy from './ResourceProxy';


class ResourcePool {

  constructor(resources) {

    this.pool = new Map();
    this.linkageToUUID = new Map();
    this.syncronizer = {};
    _.each(resources, this.add, this);

  }

  create (res) {

    var resource = new ResourceProxy(res)
    this.add(resource);
    return resource;

  }

  add (resource) {

    var uuid = resource.links.uuid;
    var linkage = resource.getLinkage();

    if (linkage.type && linkage.id) {
      this.linkageToUUID.set(`${linkage.type}:${linkage.id}`, uuid);
    }
    this.pool.set(uuid, resource);

  }

  get (link) {

    var { linkage, self, related, uuid } = link;

    if (!uuid && linkage) {
      uuid = this.linkageToUUID.get(`${linkage.type}:${linkage.id}`)
    }

    return Q.when(
      this._getFromMemory(uuid) ||
      this._getFromServer(related || self)
    );

  }

  _getFromMemory (uuid) {

    return this.pool.get(uuid);

  }

  _getFromServer (url) {

    return Q.when(this.syncronizer.get(url), function (res) {
      if (_.isArray(res.data)) {
        return _.map(res.data, function (res) {
          return this.create(res);
        }, this);
      }
      return this.create(res);
    }.bind(this));

  }

  _fetch (url) {

    return Q.when(this.syncronizer.get(url), function (res) {
      var resource = this.pool.get(url);
      if (!resource) {
        resource = this.create(res);
      }
      else {
        resource.setFromData(res);
      }
      return resource;
    }.bind(this));

  }

}


export default ResourcePool;
