var proxyObjProto = {
    objectify: function(){
        if (Array.isArray(this)){
            var raw = []
        }
        else {
            var raw = {}
        }
        var keys = Object.getOwnPropertyNames(this)
        for(var index in keys){ // we dont use foreach here cuz we want to perserve the "this" variable
            var key = keys[index]
            if (typeof this[key] === "object" && this[key].objectify){
                raw[key] = this[key].objectify()
            }
            else {
                raw[key] = this[key]
            }
        }
        return raw
    },
    stringify: function(){
        var args = arrayFrom(arguments)
        args.unshift(proxyObjProto.objectify.call(this))
        return JSON.stringify.apply(JSON, args)
    },
    toString: function(){
        if (Object.keys(this).length){
            return proxyObjProto.stringify.call(this)
        }
        return ""
    }
}

var proxyArrayProto = Object.create(Array.prototype)
proxyArrayProto.objectify = proxyObjProto.objectify
proxyArrayProto.stringify = proxyObjProto.stringify
proxyArrayProto.toString = proxyObjProto.toString

var secretSetNamespace = generateId(32)
var secretGetNamespace = generateId(32)

function proxyObj(obj, eventInstance, eventNamespace = ""){
    if (eventNamespace){
        eventNamespace += "."
    }

    var objProto = Object.getPrototypeOf(obj)
    var objToProxy
    if (typeof obj === "object" && (
            (objProto === Object.prototype && (objToProxy = Object.create(proxyObjProto))) || 
            (objProto === Array.prototype && (objToProxy = Object.setPrototypeOf([], proxyArrayProto)))
        )
    ){
        // Object.setPrototypeOf(obj, proxyProto)
        var secretProps = {}
        secretProps[secretSetNamespace] = function(val){
			console.log("setting namespace")
		} 
		secretProps[secretGetNamespace] = function(){
			return eventNamespace
		}
        var proxied = new Proxy(objToProxy, {
            get: function(target, property){
                // when we get a property there's 1 of 3 cases,
                // 1: it's a property that doesn't exist and isn't a secret property, in that case, we create it as an object
                // 2: it's a property that doesn't exist but is a secret property. in that case, we return the secret prop
                // 3: it's a property that does but doesn't have an in dom model then we just return whatever is in our storage
                // 4: it is a property that is in the dom model and we update our storage to keep things in sync and then return the value in the dom

				try { // try to do this but if we error whatever since this isn't required anyways because we can get weird requests we can't stringify
                	var payload = eventInstance.emit("get:" +  eventNamespace + property)
                }
                catch (o3o){ // we don care lol
                	var payload = {}
                }
                // console.log("get:" + eventNamespace + property, payload)
                if (payload.hasOwnProperty("value")){
                    // always trust the DOM first cuz that could potentially update without us knowing and our cached value is bad
                    target[property] = payload.value
                }
                else if (!(property in target) && !(property in secretProps)) {
                    // the case, the property isn't in the dom or the cache or the secret props so we have to create it
                    target[property] = proxyObj({}, eventInstance, eventNamespace + property)
                }
                else if (!(property in target) && (property in secretProps)){
                	return secretProps[property]
                }
                if (typeof target[property] === 'undefined' || target[property] === null){
                    // do not ever return null or undefined. the only fulsy val we return is an empty string cuz asking for the truthy property of an empty string will not result in undefined (same with ints, floats and bools)
                    return ""
                }
                return target[property]
            },
            set: function(target, property, val){
            	var valProto = Object.getPrototypeOf(val) 
                // we only overwrite and make a proxy of an object if it's a basic object. this is beause if they are storing instance of nonbasic objects (eg: date) it will have a prototype that's not the default object and as a result we dont want to proxyfy something that they probably will use in other menes and mess with it's internal functions
                if (val && typeof val === "object" && (valProto === Object.prototype || valProto === Array.prototype)){
                    //console.log("1", target[property])
                    target[property] = proxyObj(val, eventInstance, eventNamespace + property)
                }
                // this is our degenerate case where we just set the value on the data
                else {
                    target[property] = val
                }
                // before we return we want to update everything in the DOM model if it has something that's waiting on our data so we notify whoever cares about this that they should update
                var payload = eventInstance.emit("set:" +  eventNamespace + property, {
                    value: target[property]
                })
                // console.log(eventNamespace + property)
                // console.log(payload)
                eventInstance.emit("render:" +  eventNamespace + property)
                // console.log("2", target, property, target[property])
                if (typeof target[property] === 'undefined' || target[property] === null){
                    // we do the same thing as above here
                    return ""
                }
                return target[property]
            },
            deleteProperty: function(target, property){
                if (property in target) {
                    eventInstance.emit("del:" +  eventNamespace + property)
                    return delete target[property]
                }
                return false
            }
        })
        // because we are converting an object into a proxy, we want to make sure that the object
        var oldProps = Object.getOwnPropertyNames(proxied)
        var newProps = Object.getOwnPropertyNames(obj)
        newProps.forEach(function(prop){
            proxied[prop] = obj[prop]
        })
        oldProps.forEach(function(prop){
            if (newProps.indexOf(prop) === -1){
                delete proxied[prop]
            }
        })
        return proxied
    }
}