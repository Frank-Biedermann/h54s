/* global describe, it, assert, serverData, h54s, getRandomAsciiChars, proclaim */
describe('h54s', function() {
  describe('Character tests:', function() {

    it('Test json character escape', function(done) {
      this.timeout(10000);
      var sasAdapter = new h54s({
        hostUrl: serverData.url
      });

      var data0 = "\\\"/\/\?''";
      var data1 = "asd\nasd\tasd\r\nasdasd" + String.fromCharCode(10) + "asd";

      sasAdapter.addTable([
        {
          data0: data0,
          data1: data1
        }
      ], 'data');

      sasAdapter.call('/AJAX/h54s_test/BounceData', function(err, res) {
        assert.isUndefined(err, 'We got error on sas program ajax call');
        assert.isDefined(res, 'Response is undefined');
        assert.equal(res.outputdata[0].data0, data0, 'Bounce data is different - data0');
        assert.equal(res.outputdata[0].data1, data1, 'Bounce data is different - data1');
        done();
      });
    });

    it('Test ascii characters', function(done) {
      this.timeout(10000);
      var sasAdapter = new h54s({
        hostUrl: serverData.url,
        debug: true
      });

      var chars = {};
      for(var i = 32; i < 128; i++) {
        chars['data' + i] = String.fromCharCode(i);
      }

      sasAdapter.addTable([chars], 'data');

      sasAdapter.call('/AJAX/h54s_test/BounceData', function(err, res) {
        assert.isUndefined(err, 'We got error on sas program ajax call');
        assert.isDefined(res, 'Response is undefined');
        for(var i = 32; i < 128; i++) {
          assert.equal(res.outputdata[0]['data' + i], chars['data' + i], chars['data' + i] + ' character is not the same in response');
        }
        done();
      });
    });

    it('Test big ascii string', function(done) {
      var sasAdapter = new h54s({
        hostUrl: serverData.url
      });

      var data = getRandomAsciiChars(10000);

      proclaim.throws(function() {
        sasAdapter.addTable([
          {
            data1: data,
            data2: data,
            data3: data,
            data4: data
          }
        ], 'data');
      }, 'Row 0 exceeds size limit of 32kb');

      proclaim.throws(function() {
        sasAdapter.addTable([
          {}, {
            data1: data,
            data2: data,
            data3: data,
            data4: data
          }
        ], 'data');
      }, 'Row 1 exceeds size limit of 32kb');

      proclaim.doesNotThrow(function() {
        sasAdapter.addTable([
          {
            data: data
          }, {
            data: data
          }, {
            data: data
          }, {
            data: data
          }, {
            data: data
          }, {
            data: data
          }, {
            data: data
          }, {
            data: data
          }, {
            data: data
          }, {
            data: data
          }, {
            data: data
          }, {
            data: data
          }
        ], 'data');
      });
      done();
    });

  });
});