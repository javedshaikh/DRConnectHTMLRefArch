/**
 * Requester of a resource by an URI
 */
define(['Class'], function(Class) {
    
    var AsyncRequester = Class.extend({
        init: function(session) {
          this.session = session;  
        },
        makeRequest: function(promise, callbacks) {
            var self = this;
            var p = promise
                    .fail(function(response) { return self.invalidTokenHandler(response); })
                    .fail(function(response) { return self.adaptError(response); } ); 
            if(callbacks) {
                var cb = this.getCallbacks(callbacks);
                p.then(cb.success, cb.error).end();
            } else {
                return p;
            }
        },
        /**
         * Filter the errors to handle 401 properly (it is currently returned with status = 0)
         */
        invalidTokenHandler: function(response) {
           if(response.status == 0) {
              response.status = 401;
              response.error = {};
              response.error.errors = {};
              response.error.errors.error = {code: "Unauthorized", description:"Invalid token"};
              
              // Remove all session data (token, auth flag)
              this.session.disconnect();
           }
           // Re throw the exception
           throw response;
        },
        failRequest: function(data, callbacks) {
            if(callbacks) {
                cb.error(data);
            } else {
                var defer = Q.defer();
                defer.reject(data);
                return defer.promise;
            }
        },
        load: function(resource, parameters, callbacks) {
            if(resource && resource.uri) {
                return this.makeRequest(this.session.retrieve(resource.uri, parameters), callbacks);
            } else {
                return this.failRequest("The resource does not provide a URI", callbacks);
            }
        },
        adaptError: function(response) {
            if(response.error && response.error.errors && response.error.errors.error) {
                response.error = response.error.errors.error;
            }
            throw {status: response.status, details: response};        
        },
        getCallbacks: function(callbacks){
            var that = this;
            var cb = {};
            if(!callbacks) callbacks = {};
            
            cb.error = function(response) {
                
                // If both success and error function are set
                if(callbacks.error && typeof callbacks.error === 'function'){
                    callbacks.error(response);
                    // If callDefaultError is set, call de default error handler
                    if(callbacks.callDefaultErrorHandler){
                        if(that.options.error && typeof that.options.error === 'function') {
                            that.options.error(response);
                        }
                    }
                
                // If no specific error handler was set, call the default error handler
                } else if(that.options.error && typeof that.options.error === 'function') {
                    that.options.error(response);
                }       
            };
            
            cb.success = function(data) {
                // If both success and error function are set
                if(callbacks.success && typeof callbacks.success === 'function'){
                    callbacks.success(data);
                
                // If only one success callback function is set 
                } else if(callbacks && typeof callbacks === 'function') {
                    callbacks(data);
                
                //  
                } else if(that.options.success && typeof that.options.success === 'function') {
                    that.options.success(data);
                }       
            };
            
            return cb; 
        }   
    });
    return AsyncRequester;
});