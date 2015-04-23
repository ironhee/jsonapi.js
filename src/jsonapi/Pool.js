import _ from 'lodash';
import Q from 'q';
import { Events } from 'backbone';
import Resource from './Resource';
import Operation from './Operation';


class Pool {

  constructor(resources) {

    _.extend(this, Events);
    this.pool = {};
    _.each(resources, this.add, this);

  }

  create (attributes, options) {

    // implement this// implement this

  }

  remove (resource) {

    // implement this

  }

  get (id) {

    // implement this

  }

  getURL (type, id) {

    // implement this

  }

  add (resource, options) {

    options = _.defaults(options || {}, {
      byOperation: false
    });

    if (!options.byOperation) {
      if (!this.pool[resource.getLink('self')]) {
        this.pool[resource.getLink('self')] = resource;
        this._triggerAdd(resource);
      }
    }
    return Q.fcall(() => resource);

  }

  _triggerTransform (op, resource) {

    this.trigger('transform', new Operation({
      op: op,
      path: resource.getLink('self'),
      value: resource.toJSON()
    }));

  }

  _triggerAdd (resource) {

    this.trigger('add', resource);

  }

}


export default Pool;
