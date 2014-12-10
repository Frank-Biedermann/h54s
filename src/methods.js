/*
* Call Sas program
*
* @param {string} sasProgram - Path of the sas program
* @param {function} callback - Callback function called when ajax call is finished
*
*/
h54s.prototype.call = function(sasProgram, callback) {
  var self = this;
  var callArgs = arguments;
  var retryCount = 0;
  if (!callback || typeof callback !== 'function'){
    throw new h54s.Error('argumentError', 'You must provide callback');
  }
  if(!sasProgram) {
    throw new h54s.Error('argumentError', 'You must provide Sas program file path');
  }
  if(typeof sasProgram !== 'string') {
    throw new h54s.Error('argumentError', 'First parameter should be string');
  }

  // initialize dynamically generated xhr options first
  var myprogram;
  if (this.systemtype == 'WPS') {
    myprogram = this.metaProgram + '.sas';
  } else if (this.systemtype == 'SAS') {
    myprogram = this.metaProgram;
  }

  var params = {
    _program: sasProgram,
    _debug: this.debug ? 131 : 0,
    _service: this.sasService,
  };

  for(var key in this.sasParams) {
    params[key] = this.sasParams[key];
  }

  this.utils.ajax.post(this.url, params).success(function(res) {
    if(/<form.+action="Logon.do".+/.test(res.responseText) && self.autoLogin) {
      self.login(function(status) {
        if(status === 200) {
          self.call.apply(self, callArgs);
        } else {
          callback(new h54s.Error('loginError', 'Unable to login'));
        }
      });
    } else if(/<form.+action="Logon.do".+/.test(res.responseText) && !self.autoLogin) {
      callback(new h54s.Error('notLoggedinError', 'You are not logged in'));
    } else {
      var resObj, escapedResObj;
      if(!self.debug) {
        try {
          //clar sas params
          this.sasParams = [];
          resObj = JSON.parse(res.responseText);
          escapedResObj = self.utils.unescapeValues(resObj);
          callback(undefined, escapedResObj);
        } catch(e) {
          //check if JSON.parse is throwing an error
          //if it's not SyntaxError, it's error from the callback
          if(e.name !== 'SyntaxError') {
            throw e;
          }
          if(retryCount < self.counters.maxXhrRetries) {
            self.utils.ajax.post(self.url, params).success(this.success).error(this.error);
            retryCount++;
            console.log("Retrying #" + retryCount);
          } else {
            callback(new h54s.Error('parseError', 'Unable to parse response json'));
          }
        }
      } else {
        try {
          //clar sas params
          this.sasParams = [];
          resObj = self.utils.parseDebugRes(res.responseText);
          escapedResObj = self.utils.unescapeValues(resObj);
          callback(undefined, escapedResObj);
        } catch(e) {
          //check if JSON.parse is throwing an error
          //if it's not SyntaxError, it's error from the callback
          if(e.name !== 'SyntaxError') {
            throw e;
          }
          callback(new h54s.Error('parseError', 'Unable to parse response json'));
        }
      }
    }
  }).error(function(res) {
    callback(new h54s.Error(res.statusText));
  });
};


/*
* Set credentials
*
* @param {string} user - Login username
* @param {string} pass - Login password
*
*/
h54s.prototype.setCredentials = function(user, pass) {
  if(!user || !pass) {
    throw new h54s.Error('credentialsError', 'Missing credentials');
  }
  this.user = user;
  this.pass = pass;
};

/*
* Login method
*
* @param {string} user - Login username
* @param {string} pass - Login password
* @param {function} callback - Callback function called when ajax call is finished
*
* OR
*
* @param {function} callback - Callback function called when ajax call is finished
*
*/
h54s.prototype.login = function(/* (user, pass, callback) | callback */) {
  var callback;
  var self = this;
  if((!this.user && !arguments[0]) || (!this.pass && !arguments[1])) {
    throw new h54s.Error('credentialsError', 'Credentials not set');
  }
  if(typeof arguments[0] === 'string' && typeof arguments[1] === 'string') {
    this.setCredentials(arguments[0], arguments[1]);
    callback = arguments[2];
  } else {
    callback = arguments[0];
  }

  var callCallback = function(status) {
    if(typeof callback === 'function') {
      callback(status);
    }
  };

  this.utils.ajax.post(this.loginUrl, {
    _sasapp: "Stored Process Web App 9.3",
    _service: this.sasService,
    ux: this.user,
    px: this.pass,
  }).success(function(res) {
    if(/<form.+action="Logon.do".+/.test(res.responseText)) {
      callCallback(-1);
    } else {
      //sas can ask for login again in 10 minutes if inactive
      //with autoLogin = true it should login in call method
      self.autoLogin = true;
      callCallback(res.status);
    }
  }).error(function(res) {
    callCallback(res.status);
  });
};

/*
* Add table
*
* @param {object} inTable - Table object
* @param {string} macroName - Sas macro name
*
*/

h54s.prototype.addTable = function (inTable, macroName) {
  var inTableJson = JSON.stringify(inTable);
  inTableJson     = inTableJson.replace(/\"\"/gm, '\" \"');
  inTable         = JSON.parse(inTableJson);

  if (typeof (macroName) !== 'string') {
    throw new h54s.Error('argumentError', 'Second parameter must be a valid string');
  }

  var result;
  try {
    result = this.utils.convertTableObject(inTable);
  } catch(e) {
    throw e;
  }
  var tableArray = [];
  tableArray.push(JSON.stringify(result.spec));
  for (var numberOfTables = 0; numberOfTables < result.data.length; numberOfTables++) {
    var outString = JSON.stringify(result.data[numberOfTables]);
    tableArray.push(outString);
  }
  this.sasParams[macroName] = tableArray;
};
