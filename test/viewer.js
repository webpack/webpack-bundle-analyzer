const chai = require('chai');
chai.use(require('chai-subset'));
const {expect} = chai;
const crypto = require('crypto');
const net = require('net');

const Logger = require('../lib/Logger');
const {getEntrypoints, startServer} = require('../lib/viewer.js');

describe('WebSocket server', function () {
  it('should not crash when an error is emitted on the websocket', function (done) {
    const bundleStats = {
      assets: [{name: 'bundle.js', chunks: [0]}]
    };

    const options = {
      openBrowser: false,
      logger: new Logger('silent'),
      port: 0,
      analyzerUrl: () => ''
    };

    startServer(bundleStats, options)
      .then(function ({http: server}) {
        // The GUID constant defined in WebSocket protocol
        // https://tools.ietf.org/html/rfc6455#section-1.3
        const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

        // The client-generated "Sec-WebSocket-Key" header field value.
        const key = crypto.randomBytes(16).toString('base64');

        // The server-generated "Sec-WebSocket-Accept" header field value.
        const accept = crypto.createHash('sha1')
          .update(key + GUID)
          .digest('base64');

        const socket = net.createConnection(server.address().port, function () {
          socket.write([
            'GET / HTTP/1.1',
            'Host: localhost',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Key: ${key}`,
            'Sec-WebSocket-Version: 13',
            '',
            ''
          ].join('\r\n'));
        });

        let count = 0;
        socket.on('data', function (chunk) {
          ++count;
          const expected = Buffer.from([
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Accept: ${accept}`,
            '',
            ''
          ].join('\r\n'));

          if (count === 1) {
            expect(chunk.equals(expected)).to.be.true;
          }

          // Send a WebSocket frame with a reserved opcode (5) to trigger an error
          // to be emitted on the server.
          socket.write(Buffer.from([0x85, 0x00]));
          socket.on('close', function () {
            server.close(done);
          });
        });
      })
      .catch(done);
  });
});

describe('getEntrypoints', () => {
  it('should get all entrypoints', () => {
    const bundleStats = {
      entrypoints: {
        'A': {
          name: 'A',
          assets: [
            {
              name: 'chunkA.js'
            }
          ]
        },
        'B': {
          name: 'B',
          assets: [
            {
              name: 'chunkA.js'
            },
            {
              name: 'chunkB.js'
            }
          ]
        }
      }
    };
    expect(JSON.stringify(getEntrypoints(bundleStats))).to.equal(JSON.stringify(['A', 'B']));
  });

  it('should handle when bundlestats is null or undefined ', function () {
    expect(JSON.stringify(getEntrypoints(null))).to.equal(JSON.stringify([]));
    expect(JSON.stringify(getEntrypoints(undefined))).to.equal(JSON.stringify([]));
  });

  it('should handle when bundlestats is empty', function () {
    const bundleStatsWithoutEntryPoints = {};
    expect(JSON.stringify(getEntrypoints(bundleStatsWithoutEntryPoints))).to.equal(JSON.stringify([]));
  });

  it('should handle when entrypoints is empty', function () {
    const bundleStatsEmptyEntryPoint = {entrypoints: {}};
    expect(JSON.stringify(getEntrypoints(bundleStatsEmptyEntryPoint))).to.equal(JSON.stringify([]));
  });
});
