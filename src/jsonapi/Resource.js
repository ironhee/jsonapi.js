import _ from 'lodash';
import { Model } from 'backbone';
import SerializeMixin from './SerializeMixin';


export default Model.extend(_.extend({}, SerializeMixin, {

  sync: function () { return false; },

  initialize: function (options) {

    if (!options || !options.type) {
      throw new Error('type is required');
    }

    this.type = options.type;
    this.links = {};

  },

  addLink: function (key, otherResource) {

    if (!this.isSerializable(otherResource)) {
      throw 'error';
    }

    this.links[key] = otherResource;
    this.trigger('add:link', otherResource, key);

    return this;

  },

  removeLink: function (key) {

    this.trigger('remove:link', this.links[key], key);
    delete this.links[key];

    return this;

  },

  getLink: function (link) {

    return this.links[link];

  },

  getLinks: function () {

    return _.clone(this.links);

  },

  setLinks: function (links) {

    this.links = links;

  },

  toJSON: function (options) {

    options = _.defaults(options || {}, {
      recursive: false
    });

    var result = Model.prototype.toJSON.apply(this, arguments);
    _.extend(result, _.clone(this.toLinkage()));

    if (options.recursive) {
      _.extend(result,
        _.mapValues(this.getLinks(), function (resource, key) {
          return resource.toJSON();
        })
      );
    }

    return _.omit(result, _.isUndefined);

  },

  toLinkage: function () {

    return {
      type: this.type,
      id: this.id
    };

  },

  merge: function (resource) {

    if (resource.get("id") !== this.get("id") ||
      resource.get("type") !== this.get("type")) {
      throw new Error("type, id doesn't match ");
    }

    this.set(resource.toJSON());
    this.setLinks(resource.getLinks());

    return this;

  }

}));