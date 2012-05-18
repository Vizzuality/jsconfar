/**
 * @name cartodb-leaflet
 * @version 0.42 [May 18, 2012]
 * @author: jmedina@vizzuality.com
 * @fileoverview <b>Author:</b> jmedina@vizzuality.com<br/> <b>Licence:</b>
 *               Licensed under <a
 *               href="http://opensource.org/licenses/mit-license.php">MIT</a>
 *               license.<br/> This library lets you to use CartoDB with Leaflet.
 *                 
 */
 
 
if (typeof(L.CartoDBLayer) === "undefined") {

  L.CartoDBLayer = L.Class.extend({
    
    includes: L.Mixin.Events,

    options: {
      query:          "SELECT * FROM {{table_name}}",
      opacity:        0.99,
      auto_bound:     false,
      debug:          false
    },

    /**
     * Initialize CartoDB Layer
     * @params {Object}
     *    map               -     Your Leaflet map
     *    user_name         -     CartoDB user name
     *    table_name        -     CartoDB table name
     *    query             -     If you want to apply any sql sentence to the table...
     *    opacity           -     If you want to change the opacity of the CartoDB layer
     *    tile_style        -     If you want to add other style to the layer
     *    interactivity     -     Get data from the feature clicked ( without any request :) )
     *    featureMouseOver  -     Callback when user hovers a feature (return feature id)
     *    featureMouseClick -     Callback when user clicks a feature (return feature id, latlng and feature data)
     *    debug             -     Get error messages from the library
     *    auto_bound        -     Let cartodb auto-bound-zoom in the map (opcional - default = false)
     */

    initialize: function (options) {
      // Set options
      L.Util.setOptions(this, options);
      
      // Bounds? CartoDB does it
      if (options.auto_bound)
        this._setBounds();

      // Add cartodb logo, yes sir!
      this._addWadus(); 
    },

    /**
     * When Leaflet adds the layer... go!
     * @params {map}
     */
    onAdd: function(map) {
      if (!this.options.interactivity) {
        this._addSimple();
      } else {
        this._addInteraction();
      }
    },


    /**
     * When removes the layer, destroy interactivity if exist
     */
    onRemove: function(map) {
      this._remove();
    },


    /**
     * Change opacity of the layer
     * @params {Integer} New opacity
     */
    setOpacity: function(opacity) {
      this.layer.setOpacity(opacity);
    },


    /**
     * Change query of the tiles
     * @params {str} New sql for the tiles
     */
    setQuery: function(sql) {
      // Set the new value to the layer options
      this.options.query = sql;
      this._update();
    },


    /**
     * Change style of the tiles
     * @params {style} New carto for the tiles
     */
    setStyle: function(style) {
      // Set the new value to the layer options
      this.options.tile_style = style;
      this._update();
    },


    /**
     * Change the query when clicks in a feature
     * @params {Boolean | String} New sql for the request
     */
    setInteractivity: function(value) {
      // Set the new value to the layer options
      this.options.interactivity = value;
      // Update tiles
      this._update();
    },


    /**
     * Change layer index
     * @params {Integer} New position for the layer
     */
    setLayerOrder: function(position) {
      /*
        Waiting fot this ticket:
          https://github.com/CloudMade/Leaflet/issues/505
      */
    },


    /**
     * Active or desactive interaction
     * @params {Boolean} Choose if wants interaction or not
     */
    setInteraction: function(bool) {
      if (this.interaction) {
        if (bool) {
          var self = this;
          this.interaction.on('on', function(o) {self._bindWaxEvents(self.options.map,o)});
        } else {
          this.interaction.off('on');
        }
      }
    },


    /**
     * Hide the CartoDB layer
     */
    hide: function() {
      this.setOpacity(0);
      this.setInteraction(false);
    },


    /**
     * Show the CartoDB layer
     */
    show: function() {
      this.setOpacity(this.options.opacity);
      this.setInteraction(true);
    },



    /*
     * PRIVATE METHODS
     */

    /**
     * Remove CartoDB layer
     */
    _remove: function() {
      // Remove interaction
      this.setInteraction(false);

      // Remove layer
      this.options.map.removeLayer(this.layer);
    },


    /**
     * Update CartoDB layer
     */
    _update: function() {
      // First remove old layer
      this._remove();

      // Create the new updated one
      if (!this.options.interactivity) {
        this._addSimple();
      } else {
        this._addInteraction();
      }
    },


    /**
     * Zoom to cartodb geometries
     */
    _setBounds: function() {
      var self = this;
      reqwest({
        url:'http://'+this.options.user_name+'.cartodb.com/api/v1/sql/?q='+escape('select ST_Extent(the_geom) from '+ this.options.table_name),
        type: 'jsonp',
        jsonpCallback: 'callback',
        success: function(result) {
          if (result.rows[0].st_extent!=null) {
            var coordinates = result.rows[0].st_extent.replace('BOX(','').replace(')','').split(',');
            var coor1 = coordinates[0].split(' ');
            var coor2 = coordinates[1].split(' ');

            var lon0 = coor1[0];
            var lat0 = coor1[1];
            var lon1 = coor2[0];
            var lat1 = coor2[1];

            var minlat = -85.0511;
            var maxlat =  85.0511;
            var minlon = -179;
            var maxlon =  179;

            /* Clamp X to be between min and max (inclusive) */
            var clampNum = function(x, min, max) {
              return x < min ? min : x > max ? max : x;
            }

            lon0 = clampNum(lon0, minlon, maxlon);
            lon1 = clampNum(lon1, minlon, maxlon);
            lat0 = clampNum(lat0, minlat, maxlat);
            lat1 = clampNum(lat1, minlat, maxlat);

            var sw = new L.LatLng(lat0, lon0);
            var ne = new L.LatLng(lat1, lon1);
            var bounds = new L.LatLngBounds(sw,ne);
            self.options.map.fitBounds(bounds);
          }
        },
        error: function(e,msg) {
          if (this.options.debug) throw('Error getting table bounds: ' + msg);
        }
      });
    },


    /**
     * Add Cartodb logo
     */
    _addWadus: function() {
      if (!document.getElementById('cartodb_logo')) {
        var cartodb_link = document.createElement("a");
        cartodb_link.setAttribute('id','cartodb_logo');
        cartodb_link.setAttribute('style',"position:absolute; bottom:8px; left:8px; display:block;");
        cartodb_link.setAttribute('href','http://www.cartodb.com');
        cartodb_link.setAttribute('target','_blank');
        cartodb_link.innerHTML = "<img src='http://cartodb.s3.amazonaws.com/static/new_logo.png' alt='CartoDB' title='CartoDB' />";
        this.options.map._container.appendChild(cartodb_link);
      }
    },


    /**
     * Add simple cartodb tiles to the map
     */
    _addSimple: function () {

      // Then add the cartodb tiles
      var tile_style = (this.options.tile_style)? encodeURIComponent(this.options.tile_style.replace(/\{\{table_name\}\}/g,this.options.table_name)) : ''
        , query = encodeURIComponent(this.options.query.replace(/\{\{table_name\}\}/g,this.options.table_name));

      // Add the cartodb tiles
      var cartodb_url = 'http://' + this.options.user_name + '.cartodb.com/tiles/' + this.options.table_name + '/{z}/{x}/{y}.png?sql=' + query +'&style=' + tile_style;
      this.layer = new L.TileLayer(cartodb_url,{attribution:'CartoDB', opacity: this.options.opacity});

      this.options.map.addLayer(this.layer,false);
    },


    /**
     * Add interaction cartodb tiles to the map
     */
    _addInteraction: function () {
      
      var self = this;

      // interaction placeholder
      this.tilejson = this._generateTileJson();
      this.layer = new wax.leaf.connector(this.tilejson);

      this.options.map.addLayer(this.layer,false);

      this.interaction = wax.leaf.interaction()
        .map(this.options.map)
        .tilejson(this.tilejson)
        .on('on',function(o) {self._bindWaxEvents(self.options.map,o)})
        .on('off', function(o){
          if (self.options.featureMouseOut) {
            return self.options.featureMouseOut && self.options.featureMouseOut();
          } else {
            if (self.options.debug) throw('featureMouseOut function not defined');
          }
        });
    },


    /**
     * Bind events for wax interaction
     * @param {Object} Layer map object
     * @param {Event} Wax event
     */
    _bindWaxEvents: function(map,o) {
      switch (o.e.type) {
        case 'mousemove': if (this.options.featureMouseOver) {
                            return this.options.featureMouseOver(o.data);
                          } else {
                            if (this.options.debug) throw('featureMouseOver function not defined');
                          }
                          break;
        case 'mouseup':   var container_point = map.mouseEventToLayerPoint(o.e)
                            , latlng = map.layerPointToLatLng(container_point);

                          if (this.options.featureMouseClick) {
                            this.options.featureMouseClick(latlng,o.data);
                          } else {
                            if (this.options.debug) throw('featureMouseClick function not defined');
                          }
                          break;
        default:          break;
      }
    },


    /**
     * Generate tilejson for wax
     * @return {Object} Options for L.TileLayer
     */
    _generateTileJson: function () {
      var core_url = 'http://' + this.options.user_name + '.cartodb.com';  
      var base_url = core_url + '/tiles/' + this.options.table_name + '/{z}/{x}/{y}';
      var tile_url = base_url + '.png';
      var grid_url = base_url + '.grid.json';
      
      // SQL?
      if (this.options.query) {
        var query = 'sql=' + encodeURIComponent(this.options.query.replace(/\{\{table_name\}\}/g,this.options.table_name));
        tile_url = this._addUrlData(tile_url, query);
        grid_url = this._addUrlData(grid_url, query);
      }

      // STYLE?
      if (this.options.tile_style) {
        var style = 'style=' + encodeURIComponent(this.options.tile_style.replace(/\{\{table_name\}\}/g,this.options.table_name));
        tile_url = this._addUrlData(tile_url, style);
        grid_url = this._addUrlData(grid_url, style);
      }

      // INTERACTIVITY?
      if (this.options.interactivity) {
        var interactivity = 'interactivity=' + encodeURIComponent(this.options.interactivity.replace(/ /g,''));
        tile_url = this._addUrlData(tile_url, interactivity);
        grid_url = this._addUrlData(grid_url, interactivity);
      }
      
      // Build up the tileJSON
      return {
        blankImage: '../img/blank_tile.png', 
        tilejson: '1.0.0',
        scheme: 'xyz',
        tiles: [tile_url],
        grids: [grid_url],
        tiles_base: tile_url,
        grids_base: grid_url,
        opacity: this.options.opacity,
        formatter: function(options, data) {
          return data
        }
      };
    },


    /*
     * HELPER FUNCTIONS
     */

    /**
     * Parse URI
     * @params {String} Tile url
     * @return {String} URI parsed
     */    
    _parseUri: function (str) {
      var o = {
        strictMode: false,
        key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
        q:   {
          name:   "queryKey",
          parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
          strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
          loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
      },
      m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
      uri = {},
      i   = 14;

      while (i--) uri[o.key[i]] = m[i] || "";

      uri[o.q.name] = {};
      uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = $2;
      });
      return uri;
    },


    /**
     * Appends callback onto urls regardless of existing query params
     * @params {String} Tile url
     * @params {String} Tile data
     * @return {String} Tile url parsed
     */
    _addUrlData: function (url, data) {
        url += (this._parseUri(url).query) ? '&' : '?';
        return url += data;
    }
  });
}



/*!
  * Reqwest! A general purpose XHR connection manager
  * (c) Dustin Diaz 2011
  * https://github.com/ded/reqwest
  * license MIT
  */
!function(a,b){typeof module!="undefined"?module.exports=b():typeof define=="function"&&define.amd?define(a,b):this[a]=b()}("reqwest",function(){function handleReadyState(a,b,c){return function(){a&&a[readyState]==4&&(twoHundo.test(a.status)?b(a):c(a))}}function setHeaders(a,b){var c=b.headers||{},d;c.Accept=c.Accept||defaultHeaders.accept[b.type]||defaultHeaders.accept["*"],!b.crossOrigin&&!c[requestedWith]&&(c[requestedWith]=defaultHeaders.requestedWith),c[contentType]||(c[contentType]=b.contentType||defaultHeaders.contentType);for(d in c)c.hasOwnProperty(d)&&a.setRequestHeader(d,c[d])}function generalCallback(a){lastValue=a}function urlappend(a,b){return a+(/\?/.test(a)?"&":"?")+b}function handleJsonp(a,b,c,d){var e=uniqid++,f=a.jsonpCallback||"callback",g=a.jsonpCallbackName||"reqwest_"+e,h=new RegExp("((^|\\?|&)"+f+")=([^&]+)"),i=d.match(h),j=doc.createElement("script"),k=0;i?i[3]==="?"?d=d.replace(h,"$1="+g):g=i[3]:d=urlappend(d,f+"="+g),win[g]=generalCallback,j.type="text/javascript",j.src=d,j.async=!0,typeof j.onreadystatechange!="undefined"&&(j.event="onclick",j.htmlFor=j.id="_reqwest_"+e),j.onload=j.onreadystatechange=function(){if(j[readyState]&&j[readyState]!=="complete"&&j[readyState]!=="loaded"||k)return!1;j.onload=j.onreadystatechange=null,j.onclick&&j.onclick(),a.success&&a.success(lastValue),lastValue=undefined,head.removeChild(j),k=1},head.appendChild(j)}function getRequest(a,b,c){var d=(a.method||"GET").toUpperCase(),e=typeof a=="string"?a:a.url,f=a.processData!==!1&&a.data&&typeof a.data!="string"?reqwest.toQueryString(a.data):a.data||null,g;return(a.type=="jsonp"||d=="GET")&&f&&(e=urlappend(e,f),f=null),a.type=="jsonp"?handleJsonp(a,b,c,e):(g=xhr(),g.open(d,e,!0),setHeaders(g,a),g.onreadystatechange=handleReadyState(g,b,c),a.before&&a.before(g),g.send(f),g)}function Reqwest(a,b){this.o=a,this.fn=b,init.apply(this,arguments)}function setType(a){var b=a.match(/\.(json|jsonp|html|xml)(\?|$)/);return b?b[1]:"js"}function init(o,fn){function complete(a){o.timeout&&clearTimeout(self.timeout),self.timeout=null,o.complete&&o.complete(a)}function success(resp){var r=resp.responseText;if(r)switch(type){case"json":try{resp=win.JSON?win.JSON.parse(r):eval("("+r+")")}catch(err){return error(resp,"Could not parse JSON in response",err)}break;case"js":resp=eval(r);break;case"html":resp=r}fn(resp),o.success&&o.success(resp),complete(resp)}function error(a,b,c){o.error&&o.error(a,b,c),complete(a)}this.url=typeof o=="string"?o:o.url,this.timeout=null;var type=o.type||setType(this.url),self=this;fn=fn||function(){},o.timeout&&(this.timeout=setTimeout(function(){self.abort()},o.timeout)),this.request=getRequest(o,success,error)}function reqwest(a,b){return new Reqwest(a,b)}function normalize(a){return a?a.replace(/\r?\n/g,"\r\n"):""}function serial(a,b){var c=a.name,d=a.tagName.toLowerCase(),e=function(a){a&&!a.disabled&&b(c,normalize(a.attributes.value&&a.attributes.value.specified?a.value:a.text))};if(a.disabled||!c)return;switch(d){case"input":if(!/reset|button|image|file/i.test(a.type)){var f=/checkbox/i.test(a.type),g=/radio/i.test(a.type),h=a.value;(!f&&!g||a.checked)&&b(c,normalize(f&&h===""?"on":h))}break;case"textarea":b(c,normalize(a.value));break;case"select":if(a.type.toLowerCase()==="select-one")e(a.selectedIndex>=0?a.options[a.selectedIndex]:null);else for(var i=0;a.length&&i<a.length;i++)a.options[i].selected&&e(a.options[i])}}function eachFormElement(){var a=this,b,c,d,e=function(b,c){for(var e=0;e<c.length;e++){var f=b[byTag](c[e]);for(d=0;d<f.length;d++)serial(f[d],a)}};for(c=0;c<arguments.length;c++)b=arguments[c],/input|select|textarea/i.test(b.tagName)&&serial(b,a),e(b,["input","select","textarea"])}function serializeQueryString(){return reqwest.toQueryString(reqwest.serializeArray.apply(null,arguments))}function serializeHash(){var a={};return eachFormElement.apply(function(b,c){b in a?(a[b]&&!isArray(a[b])&&(a[b]=[a[b]]),a[b].push(c)):a[b]=c},arguments),a}var context=this,win=window,doc=document,old=context.reqwest,twoHundo=/^20\d$/,byTag="getElementsByTagName",readyState="readyState",contentType="Content-Type",requestedWith="X-Requested-With",head=doc[byTag]("head")[0],uniqid=0,lastValue,xmlHttpRequest="XMLHttpRequest",isArray=typeof Array.isArray=="function"?Array.isArray:function(a){return a instanceof Array},defaultHeaders={contentType:"application/x-www-form-urlencoded",accept:{"*":"text/javascript, text/html, application/xml, text/xml, */*",xml:"application/xml, text/xml",html:"text/html",text:"text/plain",json:"application/json, text/javascript",js:"application/javascript, text/javascript"},requestedWith:xmlHttpRequest},xhr=win[xmlHttpRequest]?function(){return new XMLHttpRequest}:function(){return new ActiveXObject("Microsoft.XMLHTTP")};return Reqwest.prototype={abort:function(){this.request.abort()},retry:function(){init.call(this,this.o,this.fn)}},reqwest.serializeArray=function(){var a=[];return eachFormElement.apply(function(b,c){a.push({name:b,value:c})},arguments),a},reqwest.serialize=function(){if(arguments.length===0)return"";var a,b,c=Array.prototype.slice.call(arguments,0);return a=c.pop(),a&&a.nodeType&&c.push(a)&&(a=null),a&&(a=a.type),a=="map"?b=serializeHash:a=="array"?b=reqwest.serializeArray:b=serializeQueryString,b.apply(null,c)},reqwest.toQueryString=function(a){var b="",c,d=encodeURIComponent,e=function(a,c){b+=d(a)+"="+d(c)+"&"};if(isArray(a))for(c=0;a&&c<a.length;c++)e(a[c].name,a[c].value);else for(var f in a){if(!Object.hasOwnProperty.call(a,f))continue;var g=a[f];if(isArray(g))for(c=0;c<g.length;c++)e(f,g[c]);else e(f,a[f])}return b.replace(/&$/,"").replace(/%20/g,"+")},reqwest.compat=function(a,b){return a&&(a.type&&(a.method=a.type)&&delete a.type,a.dataType&&(a.type=a.dataType),a.jsonpCallback&&(a.jsonpCallbackName=a.jsonpCallback)&&delete a.jsonpCallback,a.jsonp&&(a.jsonpCallback=a.jsonp)),new Reqwest(a,b)},reqwest})