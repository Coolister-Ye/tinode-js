/**
 * @file Helper methods for dealing with IndexedDB cache of messages, users, and topics.
 * See <a href="https://github.com/tinode/webapp">https://github.com/tinode/webapp</a> for real-life usage.
 *
 * @copyright 2015-2021 Tinode
 * @summary Javascript bindings for Tinode.
 * @license Apache 2.0
 * @version 0.17
 */
'use strict';

// NOTE TO DEVELOPERS:
// Localizable strings should be double quoted "строка на другом языке",
// non-localizable strings should be single quoted 'non-localized'.

const DB_VERSION = 1;
const DB_NAME = 'tinode-web';

let IDBProvider;

const DB = function(onError, logger) {
  onError = onError || function() {}
  logger = logger || function() {}

  // Instance of IndexDB.
  let db = null;
  // Indicator that the cache is disabled.
  let disabled = false;

  // Serializable topic fields.
  const topic_fields = ['created', 'updated', 'deleted', 'read', 'recv', 'seq', 'clear', 'defacs',
    'creds', 'public', 'private', 'touched'
  ];

  // Copy values from 'src' to 'dst'. Allocate dst if it's null or undefined.
  function serializeTopic(dst, src) {
    const res = dst || {
      name: src.name
    };
    topic_fields.forEach((f) => {
      if (src.hasOwnProperty(f)) {
        res[f] = src[f];
      }
    });
    if (Array.isArray(src._tags)) {
      res.tags = src._tags;
    }
    if (src.acs) {
      res.acs = src.getAccessMode().jsonHelper();
    }
    return res;
  }

  // Copy data from src to Topic object.
  function deserializeTopic(topic, src) {
    topic_fields.forEach((f) => {
      if (src.hasOwnProperty(f)) {
        topic[f] = src[f];
      }
    });
    if (Array.isArray(src.tags)) {
      topic._tags = src.tags;
    }
    if (src.acs) {
      topic.setAccessMode(src.acs);
    }
    topic.seq |= 0;
    topic.read |= 0;
    topic.unread = Math.max(0, topic.seq - topic.read);
  }

  function serializeSubscription(dst, topicName, uid, sub) {
    const fields = ['updated', 'mode', 'read', 'recv', 'clear', 'lastSeen', 'userAgent'];
    const res = dst || {
      topic: topicName,
      uid: uid
    };

    fields.forEach((f) => {
      if (sub.hasOwnProperty(f)) {
        res[f] = sub[f];
      }
    });

    return res;
  }

  function serializeMessage(dst, msg) {
    // Serializable fields.
    const fields = ['topic', 'seq', 'ts', '_status', 'from', 'head', 'content'];
    const res = dst || {};
    fields.forEach((f) => {
      if (msg.hasOwnProperty(f)) {
        res[f] = msg[f];
      }
    });
    return res;
  }

  function mapObjects(source, callback, context) {
    if (!db) {
      return disabled ?
        Promise.resolve([]) :
        Promise.reject(new Error("not initialized"));
    }

    try {
      const resKeys = wx.getStorageInfoSync();
    } catch (e) {
      console.log(e);
    }

    return new Promise((resolve, reject) => {
      for (let i in resKeys) {
        for (let j in source) {
          if (i.startsWith(j)) {
            wx.getStorage({
              key: i,
              success(res) {
                callback.call(context, res);
              },
              fail(err) {
                reject(err);
              },
            });
          }
        }
      }
      resolve(true);
    });
  }

  return {
    /**
     * Initialize persistent cache: open or create/upgrade if needed.
     * @returns {Promise} promise to be resolved/rejected when the DB is initialized.
     */
    initDatabase: function() {
      return new Promise((resolve, reject) => {
        // Open the database and initialize callbacks.
        db = 'wx-local';
        disabled = false;
      });
    },

    /**
     * Delete persistent cache.
     */
    deleteDatabase: function() {
      return new Promise((resolve, reject) => {
        wx.clearStorageSync();
        db = null;
        disabled = true;
      });
    },

    /**
     * Check if persistent cache is ready for use.
     * @memberOf DB
     * @returns {boolean} <code>true</code> if cache is ready, <code>false</code> otherwise.
     */
    isReady: function() {
      return !!db;
    },

    // Topics.
    /**
     * Save to cache or update topic in persistent cache.
     * @memberOf DB
     * @param {Topic} topic - topic to be added or updated.
     * @returns {Promise} promise resolved/rejected on operation completion.
     */
    updTopic: function(topic) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        let _key = 'topic' + '-' + 'topic.name';
        wx.getStorage({
          key: _key,
          success(res) {
            wx.setStorage({
              key: _key,
              value: serializeTopic(res, topic),
              success(res) {
                reslove(true);
              },
              fail(err) {
                reject(err);
              },
            });
          },
          fail(err) {
            console.log(err);
            wx.setStorage({
              key: _key,
              value: serializeTopic(null, topic),
              success(res) {
                reslove(true);
              },
              fail(err) {
                reject(err);
              },
            });
          },
        })
      });
    },

    /**
     * Remove topic from persistent cache.
     * @memberOf DB
     * @param {string} name - name of the topic to remove from database.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    remTopic: function(name) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        let successFlag = new Array();
        try {
          let allKeys = wx.getServerInfoSync();
          wx.removeStorageSync('topic' + '-' + name);
          for (let i in allKeys) {
            if (i.startsWith('subscription' + '-' + name) || i.startsWith('message' + '-' + name)) {
              wx.removeStorageSync(i);
            }
          }
          resolve(true);
        } catch (e) {
          reject(e);
        }
      });
    },

    /**
     * Execute a callback for each stored topic.
     * @memberOf DB
     * @param {function} callback - function to call for each topic.
     * @param {Object} context - the value or <code>this</code> inside the callback.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    mapTopics: function(callback, context) {
      return mapObjects('topic', callback, context);
    },

    /**
     * Copy data from serialized object to topic.
     * @memberOf DB
     * @param {Topic} topic - target to deserialize to.
     * @param {Object} src - serialized data to copy from.
     */
    deserializeTopic: function(topic, src) {
      deserializeTopic(topic, src);
    },

    // Users.
    /**
     * Add or update user object in the persistent cache.
     * @memberOf DB
     * @param {string} uid - ID of the user to save or update.
     * @param {Object} pub - user's <code>public</code> information.
     * @returns {Promise} promise resolved/rejected on operation completion.
     */
    updUser: function(uid, pub) {
      if (arguments.length < 2 || pub === undefined) {
        // No point inupdating user with invalid data.
        return;
      }
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        wx.setStorage({
          key: 'user' + '-' + uid,
          value: {
            uid: uid,
            public: pub
          },
          success(res) {
            resolve(true);
          },
          fail(err) {
            reject(err);
          }
        })
      });
    },

    /**
     * Remove user from persistent cache.
     * @memberOf DB
     * @param {string} uid - ID of the user to remove from the cache.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    remUser: function(uid) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        wx.removeStorage({
          key: 'user' + '-' + uid,
          success(res) {
            resolve(res);
          },
          fail(err) {
            reject(err);
          }
        });
      });
    },

    /**
     * Execute a callback for each stored user.
     * @memberOf DB
     * @param {function} callback - function to call for each topic.
     * @param {Object} context - the value or <code>this</code> inside the callback.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    mapUsers: function(callback, context) {
      return mapObjects('user', callback, context);
    },

    /**
     * Read a single user from persistent cache.
     * @memberOf DB
     * @param {string} uid - ID of the user to fetch from cache.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    getUser: function(uid) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        wx.getStorage({
          key: 'user' + '-' + uid,
          success(res) {
            resolve(res);
          },
          fail(err) {
            reject(err);
          }
        });
      });
    },

    // Subscriptions.

    /**
     * Add or update subscription in persistent cache.
     * @memberOf DB
     * @param {string} topicName - name of the topic which owns the message.
     * @param {string} uid - ID of the subscribed user.
     * @param {Object} sub - subscription to save.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    updSubscription: function(topicName, uid, sub) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        let _res = null;
        try {
          _res = wx.getStorageSync('subscription' + '-' + topicName + '-' + uid);
        } catch (e) {

        }
        wx.setStorage({
          key: 'subscription' + '-' + topicName + '-' + uid,
          value: serializeSubscription(_res, topicName, uid, sub),
          success(res) {
            resolve(res);
          },
          fail(err) {
            reject(err);
          }
        });
      });
    },

    /**
     * Execute a callback for each cached subscription in a given topic.
     * @memberOf DB
     * @param {string} topicName - name of the topic which owns the subscriptions.
     * @param {function} callback - function to call for each subscription.
     * @param {Object} context - the value or <code>this</code> inside the callback.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    mapSubscriptions: function(topicName, callback, context) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve([]) :
          Promise.reject(new Error("not initialized"));
      }

      const resKeys = null;
      try {
        resKeys = wx.getStorageInfoSync();
      } catch (e) {
        // Do something when catch error
      }

      return new Promise((resolve, reject) => {
        let _result = new Array();
        for (let i in resKeys) {
          if (i.startsWith('subscription' + '-' + topicName)) {
            if (callback) {
              wx.getStorage({
                key: i,
                success(res) {
                  callback.call(context, res);
                  _result.push(res);
                },
                fail(err) {
                  reject(err);
                }
              });
            }
          }
          resolve(_result);
        }
      });
    },

    // Messages.

    /**
     * Save message to persistent cache.
     * @memberOf DB
     * @param {string} topicName - name of the topic which owns the message.
     * @param {Object} msg - message to save.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    addMessage: function(msg) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        var _allMessage = new Array();
        try {
          _allMessage = wx.getStorageSync('message' + '-' + msg.topic);
        } catch (e) {

        }
        _allMessage.push(serializeMessage(null, msg));
        wx.setStorage({
          key: 'message' + '-' + msg.topic,
          value: _allMessage,
          success(res) {
            resolve(res);
          },
          fail(err) {
            reject(err);
          }
        });
      });
    },

    /**
     * Update delivery status of a message stored in persistent cache.
     * @memberOf DB
     * @param {string} topicName - name of the topic which owns the message.
     * @param {number} seq - ID of the message to update
     * @param {number} status - new delivery status of the message.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    updMessageStatus: function(topicName, seq, status) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        var _message = null;
        try {
          let _allMessage = wx.getStorageSync('message' + '-' + topicName);
          for (let i in _allMessage) {
            if (i.seq === seq) {
              _message = i;
              break;
            }
          }
        } catch (e) {

        }

        if (_message === null) {
          resolve(true);
        } else {
          wx.setStorage({
            key: 'messages' + '-' + topicName,
            values: serializeMessage(src, {
              topic: topicName,
              seq: seq,
              _status: status
            }),
            success(res) {
              resolve(res);
            },
            fail(err) {
              reject(err);
            }
          });
        }
      });
    },

    /**
     * Remove one or more messages from persistent cache.
     * @memberOf DB
     * @param {string} topicName - name of the topic which owns the message.
     * @param {number} from - id of the message to remove or lower boundary when removing range (inclusive).
     * @param {number=} to - upper boundary (exclusive) when removing a range of messages.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    remMessages: function(topicName, from, to) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve() :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        if (!from && !to) {
          from = 0;
          to = Number.MAX_SAFE_INTEGER;
        }

        if (to > 0) {
          wx.removeStorage({
            key: 'message' + '-' + topicName,
            success(res) {
              resolve(res);
            },
            fail(err) {
              reject(err);
            },
          });
        } else {
          var _allMessage = null;
          try {
            let _allMessage = wx.getStorageSync('message' + '-' + topicName);
          } catch (e) {
            reject(Error('Dont have message'));
          }
          wx.setStorage({
            key: 'message' + '-' + topicName,
            value: _allMessage.filter((x) => x.seq !== from),
            success(res) {
              resolve(res);
            },
            fail(err) {
              reject(err);
            }
          });
        }
      });
    },

    /**
     * Retrieve messages from persistent store.
     * @memberOf DB
     * @param {string} topicName - name of the topic to retrieve messages from.
     * @param {function} callback to call for each retrieved message.
     * @param {Object} query - parameters of the message range to retrieve.
     * @param {number=} query.from - the least message ID to retrieve (inclusive).
     * @param {number=} query.to - the greatest message ID to retrieve (exclusive).
     * @param {number=} query.limit - the maximum number of messages to retrieve.
     * @return {Promise} promise resolved/rejected on operation completion.
     */
    readMessages: function(topicName, query, callback, context) {
      if (!this.isReady()) {
        return disabled ?
          Promise.resolve([]) :
          Promise.reject(new Error("not initialized"));
      }
      return new Promise((resolve, reject) => {
        query = query || {};
        const from = query.from > 0 ? query.from : 0;
        const to = query.to > 0 ? query.to : Number.MAX_SAFE_INTEGER;
        const limit = query.limit | 0;

        const result = [];
        wx.getStorage({
          value: 'message' + '-' + topicName,
          success(res) {
            for (let i in res.reverse()) {
              if (callback) {
                callback.call(context, res);
              }
              result.push(i);
              if (limit <= 0 || result.length < limit) {

              } else {
                resolve(result);
              }
            }
            resolve(result)
          }
        });
      });
    }
  };
}

/**
 * To use DB in a non browser context, supply indexedDB provider.
 * @static
 * @memberof DB
 * @param idbProvider indexedDB provider, e.g. for node <code>require('fake-indexeddb')</code>.
 */
DB.setDatabaseProvider = function(idbProvider) {
  IDBProvider = idbProvider;
};

if (typeof module != 'undefined') {
  module.exports = DB;
}
