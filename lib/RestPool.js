import $ from 'jquery';
import _ from 'lodash';
import Q from 'q';
import { Events } from 'backbone';
import Resource from './Resource';
import Pool from './Pool';
import Operation from './Operation';
import RESTful from './RESTful';


class RestPool extends Pool {

  constructor (resources, options) {

    options = options || {};

    super(resources, options);
    this.syncronizer = RESTful;
    this.typeToUrl = options.typeToUrl || {};

  }

  setURL (type, url) {

    this.typeToUrl[type] = url;

  }

  create (attributes, options) {

    options = _.defaults(options || {}, {
      byOperation: false
    });

    return Q.fcall(() => {
      return this.syncronizer.post(this.getURL(attributes.type),
        {
          data: _.omit(attributes, 'id', 'links')
        }
      );
    })
    .then(response => {
      return new Resource(response.data, options);
    })
    .then(resource => {
      return this.add(resource, { create: true });
    })
    .then(resource => {
      if (!options.byOperation) {
        this._triggerTransform('add', resource);
      }
      return resource;
    });

  }

  patch (resource, attributes, options) {

    options = _.defaults(options || {}, {
      byOperation: false
    });

    var setArguments = _.toArray(arguments).slice(1);

    return Q.fcall(() => {
      resource.set.apply(resource, setArguments);
      return resource;
    })
    .then(resource => {
      return this.syncronizer.patch(
        resource.getLink('self'),
        this._toResponse(resource));
    })
    .then(response => {
      resource.set.apply(resource, response.data);
      return resource;
    })
    .then(() => {
      if (!options.byOperation) {
        this._triggerTransform('replace', resource);
      }
      return resource;
    });

  }

  remove (resource, options) {

    options = _.defaults(options || {}, {
      byOperation: false
    });

    return Q.fcall(() => {
      return this.syncronizer.delete(
        resource.getLink('self'));
    })
    .then(response => {
      this.stopListening(resource);
      delete this.pool[resource.getLink('self')];
      if (!options.byOperation) {
        this._triggerTransform('remove', resource);
      }
      return resource;
    });

  }

  get (url, options) {

    return Q.fcall(() => {
      return this.syncronizer.get(url, options);
    })
    .then(response => {
      if (_.isArray(response.data)) {
        return _.map(response.data, data =>
          this._refreshOrCreate(data));
      }

      return this._refreshOrCreate(response.data)
    });

  }

  getURL (type, id) {

    var url = this.typeToUrl[type];

    if (!url) {
      throw new Error(`type[${type}] is not supported!`);
    }

    if (id) {
      url = url + id;
    }

    return url;

  }

  _toResponse (resource) {

    return _.clone({
      data: resource.deserialize()
    }, true);

  }

  _refreshOrCreate (data) {

    var resource = this.pool[data.links.self];

    if (resource) {
      resource.set(data, { parse: true });
    }
    else {
      resource = new Resource(data);
    }
    return resource;

  }

}


export default RestPool;