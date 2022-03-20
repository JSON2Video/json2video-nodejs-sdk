/*

    JSON2Video SDK v1.0

    Author: JSON2Video.com
    Description: SDK for creating videos programmatically using JSON2Video API

    GET YOUR FREE APIKey at https://json2video.com/get-api-key/

    CHECK DOCUMENTATION at: https://json2video.com/docs/

*/

class Base {

    constructor() {
        this.object = {};
        this.properties = [];
    }

    // set(): Sets a property for the Scene or Movie
    set(property, value) {
        property = property.toLowerCase();
        property = property.replace(/_/g, '-');

        if (this.properties.indexOf(property) > -1) {
            this.object[property] = value;
        }
        else throw `Property ${property} does not exist`;
    }

    // addElement(): Adds a new element in the Scene or Movie
    addElement(element = null) {
        if (element && typeof element == "object") {
            if (!("elements" in this.object)) {
                this.object.elements = [];
            }
            this.object.elements.push(element);
            return true;
        }
        return false;
    }

    // getJSON(): Returns the data object as a JSON string
    getJSON() {
        return JSON.stringify(this.object, null, 2);
    }

    // getObject(): Returns the data object
    getObject() {
        return this.object;
    }
}

class Scene extends Base {
    constructor(...a) {
        super(...a);
        this.properties = ['comment', 'background-color', 'duration', 'cache'];
    }

    // setTransition(): Sets the transition style for this scene
    setTransition(style = null, duration = null, type = null) {
        if (style || duration || type) {
            if (!("transition" in this.object)) this.object.transition = {};
            if (style !== null) this.object.transition.style = style;
            if (duration !== null) this.object.transition.duration = duration;
            if (type !== null) this.object.transition.type = type;
        }
    }
}

class Movie extends Base {
    constructor(...a) {
        super(...a);
        this.properties = ['comment', 'project', 'width', 'height', 'resolution', 'quality', 'fps', 'cache'];
        this.api_url = 'https://api.json2video.com/v1/movies';
        this.apikey = null;
    }

    // setAPIKey(): Sets your API Key
    setAPIKey = function (apikey) {
        this.apikey = apikey;
    }

    // addScene(): Adds a new scene in the Movie
    addScene = function (scene = null) {
        if (scene) {
            if (!("scenes" in this.object)) this.object.scenes = [];
            this.object.scenes.push(scene.getObject());
            return true;
        }
        else throw "Invalid scene";
    }

    // fetch(): Encapsulates API calls
    fetch = async function (method = "GET", url = "", body = null, headers = {}) {
        const https = require('https');
        const endpoint = new URL(url);
        let data = null;

        if (body) {
            data = JSON.stringify(body);
            headers['Content-Length'] = Buffer.byteLength(data);
        }

        const options = {
            hostname: endpoint.hostname,
            port: 443,
            path: endpoint.pathname + endpoint.search,
            method: method,
            headers: headers
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, res => {
                res.on('data', response => {
                    response.status = res.statusCode;
                    resolve(JSON.parse(response.toString()));
                });
            });
    
            req.on('error', error => {
                console.error(error);
                reject({
                    status: 500,
                    success:false,
                    message: "Unknown SDK error",
                    error: error
                });
            });
    
            if (data) req.write(data);
            req.end();
        });
    }

    // render(): Starts a new rendering job
    render = async function() {
        if (!this.apikey) throw "Invalid API Key";

        return this.fetch("POST", this.api_url, this.object, {
            "Content-Type": "application/json",
            "x-api-key": this.apikey
        });
    }

    // getStatus(): Gets the current project rendering status
    getStatus = async function() {
        if (!this.apikey) throw "Invalid API Key";
        if (!("project" in this.object)) throw "Project ID not set";

        let url = this.api_url + "?project=" + this.object.project;

        return this.fetch("GET", url, null, {
            "x-api-key": this.apikey
        });
    }

    // waitToFinish(): Waits the current project to finish rendering by checking status every 1 second
    waitToFinish = async function(callback=null) {
        return new Promise((resolve, reject) => {
            const interval_id = setInterval((async function() {
                let response = await this.getStatus();

                if (response && response.success && ("movies" in response) && response.movies.length==1) {
                    if (response.movies[0].status=="done") {
                        clearInterval(interval_id);
                        resolve(response);
                    }
                }
                else {
                    console.log("Error");
                    clearInterval(interval_id);
                    resolve(response);
                }

                if (typeof callback == "function") callback(response);
            }).bind(this), 1000);
        });
    }
}

// Export Scene and Movie objects
exports.Scene = Scene;
exports.Movie = Movie;
